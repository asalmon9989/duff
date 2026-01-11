<template>
  <div class="voting">
    <div v-if="loading" class="loading">Loading...</div>

    <!-- Game Selection Step (if no gameId in URL) -->
    <div v-else-if="!gameId && !selectedGameId">
      <h1>Select Draft to Vote</h1>
      <p class="instructions">Choose the draft you want to vote on</p>
      
      <div class="game-selection">
        <div
          v-for="game in gamesInVoting"
          :key="game.id"
          class="game-option"
          @click="handleSelectGame(game.id)"
        >
          <h3>{{ game.draft?.subject || 'Untitled Draft' }}</h3>
          <p class="game-date">{{ new Date(game.created_at).toLocaleDateString() }}</p>
        </div>
      </div>
      <div v-if="gamesInVoting.length === 0" class="no-games">
        <p>No drafts are currently in voting stage.</p>
      </div>
    </div>

    <!-- Player Selection Step -->
    <div v-else-if="draftLogic && !selectedPlayerId && !player && (gameId || selectedGameId)">
      <h1>Select Your Name</h1>
      <p class="instructions">Choose your name to begin voting</p>
      
      <div class="player-selection">
        <div
          v-for="p in playersList"
          :key="p.id"
          class="player-option"
          :class="{ 'has-voted': hasPlayerVoted(p.id) }"
          @click="handleSelectPlayer(p.id)"
        >
          <h3>{{ p.name }}</h3>
          <span v-if="hasPlayerVoted(p.id)" class="voted-indicator">✓ Already Voted</span>
        </div>
      </div>
    </div>

    <!-- Voting Interface -->
    <div v-else-if="draftLogic && player">
      <h1>{{ currentDraft?.subject }} - Voting</h1>

      <div v-if="hasVoted" class="voted-message">
        <h2>Thank you for voting!</h2>
        <p>Your vote has been recorded. Waiting for other players to vote...</p>
        <router-link :to="`/game/${activeGameId}/results?password=${password}`" class="results-link">
          View Results
        </router-link>
      </div>

      <div v-else class="voting-interface">
        <h2>Rank your top {{ votesNeeded }} {{ votesNeeded === 1 ? 'team' : 'teams' }}</h2>
        <p class="instructions">
          Select your favorite teams in order. 1st place gets {{ votesNeeded }} points, 2nd gets {{ votesNeeded - 1 }} points, etc.
          <br>
          <strong>Your own team ({{ player.name }}) is automatically excluded.</strong>
        </p>

        <div class="teams-to-vote">
          <div
            v-for="team in teamsToVote"
            :key="team.player.id"
            class="team-card"
            :class="{ selected: isSelected(team.player.id) }"
            @click="handleSelectTeam(team.player.id)"
          >
            <div class="team-header">
              <h3>{{ team.player.name }}</h3>
              <div v-if="isSelected(team.player.id)" class="rank-badge">
                Rank {{ getRank(team.player.id) }}
              </div>
            </div>
            <div class="team-entries">
              <div
                v-for="entry in team.entries"
                :key="entry.id"
                class="team-entry"
              >
                <img
                  v-if="entry.image_url"
                  :src="entry.image_url"
                  :alt="entry.name"
                />
                <div v-else class="entry-placeholder">No Image</div>
                <span>{{ entry.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedTeams.length > 0" class="selected-teams">
          <h3>Your Rankings:</h3>
          <div class="rankings-list">
            <div
              v-for="(teamId, index) in selectedTeams"
              :key="teamId"
              class="ranking-item"
            >
              <span class="rank-number">{{ index + 1 }}</span>
              <span class="team-name">{{ getPlayerName(teamId) }}</span>
              <button @click="handleRemoveRanking(index)" class="remove-btn">Remove</button>
            </div>
          </div>
        </div>

        <div class="actions">
          <button
            @click="handleSubmitVote"
            :disabled="selectedTeams.length !== votesNeeded"
            class="submit-btn"
          >
            Submit Vote
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="!draftLogic" class="error">
      <h2>Error loading draft</h2>
      <p>Unable to load the draft. Please check the URL and try again.</p>
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
import type { PlayerTeam } from '../types'

const route = useRoute()
const router = useRouter()
const draftGameComposable = useDraftGame()
const draftComposable = useDraft()

const gameId = computed(() => route.params.gameId as string | undefined)
const playerId = computed(() => route.query.playerId as string)
const password = computed(() => (route.query.password as string) || '')
const draftLogic = useDraftLogic(null)

const selectedGameId = ref<string | null>(null)
const selectedPlayerId = ref<string | null>(playerId.value || null)
const player = ref<{ id: string; name: string } | null>(null)
const selectedTeams = ref<string[]>([])
const hasVoted = ref(false)
const loading = ref(true)
const votes = ref<any[]>([])
const gamesInVoting = ref<any[]>([])

// Get the actual game ID to use (from URL or selection)
const activeGameId = computed(() => gameId.value || selectedGameId.value)

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

const picksList = computed(() => {
  if (!draftLogic) return []
  const picksRef = draftLogic.picks
  const picks = picksRef?.value ?? picksRef
  return Array.isArray(picks) ? picks : []
})

const entriesList = computed(() => {
  if (!draftLogic) return []
  const entriesRef = draftLogic.entries
  const entries = entriesRef?.value ?? entriesRef
  return Array.isArray(entries) ? entries : []
})

const playerTeams = computed((): PlayerTeam[] => {
  if (!draftLogic) return []

  return playersList.value.map(p => {
    const playerPicks = picksList.value
      .filter(pick => pick.player_id === p.id)
      .sort((a, b) => a.pick_number - b.pick_number)

    const entries = playerPicks
      .map(pick => entriesList.value.find(e => e.id === pick.entry_id))
      .filter((e): e is NonNullable<typeof e> => e !== undefined)

    return {
      player: p,
      entries,
    }
  })
})

const teamsToVote = computed(() => {
  if (!player.value) return []
  const filtered = playerTeams.value.filter(team => team.player.id !== player.value!.id)
  console.log('[Voting] teamsToVote:', {
    allTeams: playerTeams.value.length,
    filtered: filtered.length,
    playerId: player.value.id,
    playerName: player.value.name
  })
  return filtered
})

// Calculate number of votes needed based on player count
const votesNeeded = computed(() => {
  const totalPlayers = playersList.value.length
  return getVotesPerPlayer(totalPlayers)
})

const isSelected = (teamId: string): boolean => {
  return selectedTeams.value.includes(teamId)
}

const getRank = (teamId: string): number => {
  return selectedTeams.value.indexOf(teamId) + 1
}

const handleSelectTeam = (teamId: string) => {
  if (selectedTeams.value.includes(teamId)) {
    // Remove if already selected
    selectedTeams.value = selectedTeams.value.filter(id => id !== teamId)
  } else {
    // Add if not already selected and we have room
    if (selectedTeams.value.length < votesNeeded.value) {
      selectedTeams.value.push(teamId)
    }
  }
}

const handleRemoveRanking = (index: number) => {
  selectedTeams.value.splice(index, 1)
}

const getPlayerName = (playerId: string): string => {
  const team = playerTeams.value.find(t => t.player.id === playerId)
  return team?.player.name || 'Unknown'
}

const hasPlayerVoted = (playerId: string): boolean => {
  const playerVotes = votes.value.filter(vote => vote.voter_player_id === playerId)
  const totalPlayers = playersList.value.length
  const expectedVotes = getVotesPerPlayer(totalPlayers)
  return playerVotes.length >= expectedVotes
}

const handleSelectGame = async (gameId: string) => {
  // For the simplified voting route, we don't require password
  // Users can vote without password, but they can't access game management pages
  selectedGameId.value = gameId
  // Load the game data
  if (draftLogic) {
    loading.value = true
    try {
      await draftLogic.loadGame(gameId)
      const votesData = await draftGameComposable.getVotes(gameId)
      votes.value = votesData
      
      // Update game status if needed
      const currentGame = draftLogic.currentGame
      const gameValue = currentGame?.value ?? currentGame
      if (gameValue && gameValue.status === 'hear_me_out') {
        await draftGameComposable.updateDraftGameStatus(gameId, 'voting')
        await draftLogic.loadGame(gameId)
      }
    } catch (error) {
      console.error('[Voting] Error loading game:', error)
      alert('Error loading game. Please try again.')
    } finally {
      loading.value = false
    }
  }
}

const handleSelectPlayer = (playerId: string) => {
  // Don't allow selecting a player who has already voted
  if (hasPlayerVoted(playerId)) {
    alert('This player has already voted.')
    return
  }
  selectedPlayerId.value = playerId
  const foundPlayer = playersList.value.find(p => p.id === playerId)
  if (foundPlayer) {
    player.value = foundPlayer
  }
}

const handleSubmitVote = async () => {
  if (!player.value || selectedTeams.value.length !== votesNeeded.value || !activeGameId.value) return

  loading.value = true
  try {
    for (let i = 0; i < selectedTeams.value.length; i++) {
      const rank = i + 1
      const votedPlayerId = selectedTeams.value[i]
      await draftGameComposable.submitVote(
        activeGameId.value,
        player.value.id,
        rank,
        votedPlayerId
      )
    }

    hasVoted.value = true
    // Reload votes
    const votesData = await draftGameComposable.getVotes(activeGameId.value)
    votes.value = votesData
  } catch (error) {
    console.error('Error submitting vote:', error)
    alert('Failed to submit vote. Please try again.')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    // If no gameId in URL, load games in voting
    if (!gameId.value) {
      const games = await draftGameComposable.getGamesInVoting()
      gamesInVoting.value = games
      loading.value = false
      return
    }

    // If gameId is in URL, load that game
    if (draftLogic && gameId.value) {
      // Verify password first
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

      await draftLogic.loadGame(gameId.value)
      
      // Load votes to check who has voted
      const votesData = await draftGameComposable.getVotes(gameId.value)
      votes.value = votesData

      // If playerId is in URL (legacy support), use it
      if (playerId.value) {
        const foundPlayer = playersList.value.find(p => p.id === playerId.value)
        if (foundPlayer) {
          selectedPlayerId.value = playerId.value
          player.value = foundPlayer
          
          // Check if player has already voted
          const totalPlayers = playersList.value.length
          const expectedVotes = getVotesPerPlayer(totalPlayers)
          const playerVotes = votes.value.filter(v => v.voter_player_id === playerId.value)
          if (playerVotes.length >= expectedVotes) {
            hasVoted.value = true
          }
        }
      }

      // Update game status if needed
      const currentGame = draftLogic.currentGame
      const gameValue = currentGame?.value ?? currentGame
      if (gameValue && gameValue.status === 'hear_me_out') {
        await draftGameComposable.updateDraftGameStatus(gameId.value, 'voting')
      }
    }
  } catch (error) {
    console.error('[Voting] Error loading:', error)
    alert('Error loading draft. Please check the URL and try again.')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.voting {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #213547;
}

.voting h1,
.voting h2,
.voting h3 {
  color: #213547;
}

.loading {
  text-align: center;
  padding: 40px;
}

.voted-message {
  text-align: center;
  padding: 40px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  margin: 20px 0;
}

.results-link {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 20px;
  background: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
}

.results-link:hover {
  background: #35a372;
}

.instructions {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
}

.teams-to-vote {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.team-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.team-card:hover {
  border-color: #42b983;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.team-card.selected {
  border-color: #42b983;
  background: #f0fdf4;
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.team-header h3 {
  margin: 0;
}

.rank-badge {
  background: #42b983;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: bold;
}

.team-entries {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
}

.team-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.team-entry img,
.entry-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  object-fit: cover;
}

.entry-placeholder {
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
}

.team-entry span {
  font-size: 12px;
  text-align: center;
}

.selected-teams {
  margin: 30px 0;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.rankings-list {
  margin-top: 15px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
}

.rank-number {
  width: 30px;
  height: 30px;
  background: #42b983;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.team-name {
  flex: 1;
  font-weight: bold;
}

.remove-btn {
  padding: 5px 10px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.remove-btn:hover {
  background: #c82333;
}

.actions {
  text-align: center;
  margin-top: 30px;
}

.submit-btn {
  padding: 15px 30px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.submit-btn:hover:not(:disabled) {
  background: #35a372;
}

.error {
  text-align: center;
  padding: 40px;
  color: #dc3545;
}

.player-selection {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.player-option {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.player-option:hover:not(.has-voted) {
  border-color: #42b983;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.player-option.has-voted {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f0f0f0;
}

.player-option h3 {
  margin: 0 0 10px 0;
  color: #213547;
}

.voted-indicator {
  display: block;
  color: #28a745;
  font-weight: bold;
  font-size: 14px;
}

.game-selection {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.game-option {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.game-option:hover {
  border-color: #42b983;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.game-option h3 {
  margin: 0 0 10px 0;
  color: #213547;
}

.game-date {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.no-games {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>
