<template>
  <div class="voting-links">
    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="draftLogic && currentDraft">
      <h1>{{ currentDraft.subject }} - Voting</h1>
      <p class="instructions">
        Share this link with all players. Each player will select their name and then vote.
      </p>

      <div class="voting-url-section">
        <div class="url-container">
          <input
            :value="votingUrl"
            readonly
            class="link-input"
            @click="copyVotingUrl"
          />
          <button @click="copyVotingUrl" class="copy-btn">Copy Link</button>
        </div>
        <p class="url-hint">Click the input or button to copy the voting link</p>
      </div>

      <div class="voting-status">
        <h2>Voting Status</h2>
        <div class="players-status">
          <div
            v-for="player in playersList"
            :key="player.id"
            class="player-status-item"
          >
            <span class="player-name">{{ player.name }}</span>
            <span v-if="hasPlayerVoted(player.id)" class="voted-badge">✓ Voted</span>
            <span v-else class="not-voted-badge">Not voted yet</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <button 
          @click="handleCheckResults" 
          :disabled="!allVotingComplete"
          class="results-btn"
          :class="{ disabled: !allVotingComplete }"
        >
          Check Results
        </button>
        <p v-if="!allVotingComplete" class="waiting-message">
          Waiting for all players to vote...
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDraftLogic } from '../composables/useDraftLogic'
import { useDraftGame } from '../composables/useDraftGame'
import { useDraft } from '../composables/useDraft'
import { getVotesPerPlayer } from '../utils/scoring'

const route = useRoute()
const router = useRouter()
const draftGameComposable = useDraftGame()
const draftComposable = useDraft()

const gameId = computed(() => route.params.gameId as string)
const password = computed(() => (route.query.password as string) || '')
const draftLogic = useDraftLogic(null)

const votes = ref<any[]>([])
const loading = ref(true)
const copiedPlayerId = ref<string | null>(null)

// Unwrap refs for template use
const playersList = computed(() => {
  if (!draftLogic) return []
  const playersRef = draftLogic.players
  const players = playersRef?.value ?? playersRef
  return Array.isArray(players) ? players : []
})

const currentDraft = computed(() => {
  if (!draftLogic) return null
  const draftRef = draftLogic.currentDraft
  return draftRef?.value ?? draftRef
})

const votingUrl = computed(() => {
  // Simple URL without game ID - users will select the game
  return `${window.location.origin}${window.location.pathname}#/voting`
})

const copyVotingUrl = async () => {
  const link = votingUrl.value
  try {
    await navigator.clipboard.writeText(link)
    copiedPlayerId.value = 'url'
    setTimeout(() => {
      copiedPlayerId.value = null
    }, 2000)
  } catch (err) {
    // Fallback for older browsers
    const input = document.createElement('input')
    input.value = link
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copiedPlayerId.value = 'url'
    setTimeout(() => {
      copiedPlayerId.value = null
    }, 2000)
  }
}

const hasPlayerVoted = (playerId: string): boolean => {
  const playerVotes = votes.value.filter(vote => vote.voter_player_id === playerId)
  const totalPlayers = playersList.value.length
  const expectedVotes = getVotesPerPlayer(totalPlayers)
  return playerVotes.length >= expectedVotes
}

const allVotingComplete = computed(() => {
  if (playersList.value.length === 0) return false
  const votesPerPlayer = getVotesPerPlayer(playersList.value.length)
  const expectedVotes = playersList.value.length * votesPerPlayer
  return votes.value.length >= expectedVotes
})

const handleCheckResults = async () => {
  if (!allVotingComplete.value) return
  
  // Update game status to complete if not already
  const currentGame = draftLogic.currentGame
  const gameValue = currentGame?.value ?? currentGame
  if (gameValue && gameValue.status === 'voting') {
    await draftGameComposable.updateDraftGameStatus(gameId.value, 'complete')
  }
  
  router.push(`/game/${gameId.value}/results?password=${password.value}`)
}

const loadVotes = async () => {
  if (!draftLogic) return
  try {
    // Verify password first (only on initial load)
    if (loading.value) {
      const game = await draftGameComposable.getDraftGame(gameId.value)
      if (!game) {
        alert('Game not found')
        router.push('/')
        return
      }

      const draft = await draftComposable.getDraft(game.draft_id)
      if (!draft) {
        alert('Draft not found')
        router.push('/')
        return
      }

      if (draft.password !== password.value) {
        alert('Invalid password')
        router.push('/')
        return
      }
    }

    await draftLogic.loadGame(gameId.value)
    const votesData = await draftGameComposable.getVotes(gameId.value)
    votes.value = votesData

    // Update game status if needed (only from hear_me_out to voting, never to complete automatically)
    const currentGame = draftLogic.currentGame
    const gameValue = currentGame?.value ?? currentGame
    if (gameValue && gameValue.status === 'hear_me_out') {
      await draftGameComposable.updateDraftGameStatus(gameId.value, 'voting')
      await draftLogic.loadGame(gameId.value)
    }
    
    // Check if all players have voted (for display purposes only - no automatic redirect)
    // Each player votes for (min(4, players-1)) teams (excluding their own)
    const votesPerPlayer = getVotesPerPlayer(playersList.value.length)
    const expectedVotes = playersList.value.length * votesPerPlayer
    const allVoted = playersList.value.length > 0 && votes.value.length >= expectedVotes
    console.log('[VotingLinks] Vote check:', {
      players: playersList.value.length,
      votesPerPlayer,
      votes: votes.value.length,
      expected: expectedVotes,
      allVoted,
      gameStatus: gameValue?.status
    })
    
    // CRITICAL: Never automatically redirect to results, regardless of game status or vote count
    // Even if game status is 'complete' or all votes are in, stay on this page
    // User must explicitly click "Check Results" button to navigate
  } catch (error) {
    console.error('[VotingLinks] Error loading votes:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadVotes()
  
  // Poll for vote updates
  const interval = setInterval(() => {
    loadVotes()
  }, 3000)

  return () => {
    clearInterval(interval)
  }
})
</script>

<style scoped>
.voting-links {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  color: #213547;
}

.voting-links h1,
.voting-links h2,
.voting-links h3 {
  color: #213547;
}

.loading {
  text-align: center;
  padding: 40px;
}

.instructions {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  font-size: 16px;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.link-item {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: white;
}

.player-info h3 {
  margin: 0 0 15px 0;
  font-size: 20px;
}

.link-container {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.link-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.link-input:focus {
  outline: none;
  border-color: #42b983;
}

.copy-btn {
  padding: 10px 20px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.copy-btn:hover {
  background: #35a372;
}

.voting-url-section {
  margin: 30px 0;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.url-container {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.url-hint {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin: 0;
}

.voting-status {
  margin: 30px 0;
  padding: 20px;
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
}

.voting-status h2 {
  margin-top: 0;
  margin-bottom: 20px;
}

.players-status {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
}

.player-name {
  font-weight: bold;
}

.not-voted-badge {
  display: inline-block;
  padding: 5px 10px;
  background: #ffc107;
  color: #000;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
}

.voted-badge {
  display: inline-block;
  padding: 5px 10px;
  background: #28a745;
  color: white;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  margin-top: 5px;
}

.actions {
  text-align: center;
}

.results-btn {
  padding: 15px 30px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition: all 0.2s;
}

.results-btn:hover:not(:disabled) {
  background: #35a372;
}

.results-btn:disabled,
.results-btn.disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.waiting-message {
  margin-top: 15px;
  color: #666;
  font-style: italic;
  text-align: center;
}
</style>
