<template>
  <div class="results">
    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="draftLogic && currentDraft && results.length > 0">
      <h1>{{ currentDraft.subject }} - Results</h1>

      <div class="winner-section">
        <div class="winner-card">
          <h2>🏆 Winner 🏆</h2>
          <h3>{{ results[0].player_name }}</h3>
          <p class="winner-score">{{ results[0].score }} points</p>
          <div class="winner-team">
            <div
              v-for="entry in results[0].entries"
              :key="entry.id"
              class="winner-entry"
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

      <div class="rankings-section">
        <h2>Final Rankings</h2>
        <div class="rankings-list">
          <div
            v-for="(result, index) in results"
            :key="result.player_id"
            :class="['ranking-item', { winner: index === 0 }]"
          >
            <div class="rank-number">
              <span v-if="index === 0">🥇</span>
              <span v-else-if="index === 1">🥈</span>
              <span v-else-if="index === 2">🥉</span>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="rank-info">
              <h3>{{ result.player_name }}</h3>
              <p class="score">{{ result.score }} points</p>
              <div class="team-entries">
                <div
                  v-for="entry in result.entries"
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
        </div>
      </div>
    </div>

    <div v-else-if="draftLogic && results.length === 0" class="no-results">
      <h2>No votes yet</h2>
      <p>Waiting for players to vote...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDraftLogic } from '../composables/useDraftLogic'
import { useDraftGame } from '../composables/useDraftGame'
import { useDraft } from '../composables/useDraft'
import { calculateScores, getVotesPerPlayer } from '../utils/scoring'
import type { VoteResult } from '../types'

const route = useRoute()
const router = useRouter()

const gameId = computed(() => route.params.gameId as string)
const password = computed(() => (route.query.password as string) || '')
const draftLogic = useDraftLogic(null)
const draftGameComposable = useDraftGame()
const draftComposable = useDraft()

const results = ref<VoteResult[]>([])
const loading = ref(true)

// Unwrap refs for template use
const currentDraft = computed(() => {
  if (!draftLogic) return null
  const draftRef = draftLogic.currentDraft
  return draftRef?.value ?? draftRef
})

const loadResults = async () => {
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

    // Unwrap refs
    const currentGame = draftLogic.currentGame
    const gameValue = currentGame?.value ?? currentGame
    
    const playersRef = draftLogic.players
    const players = playersRef?.value ?? playersRef
    
    const picksRef = draftLogic.picks
    const picks = picksRef?.value ?? picksRef
    
    const entriesRef = draftLogic.entries
    const entries = entriesRef?.value ?? entriesRef

    if (!gameValue || !players || !picks || !entries) {
      console.log('[Results] Missing data:', { gameValue, players, picks, entries })
      return
    }

    const votes = await draftGameComposable.getVotes(gameId.value)

    if (votes.length === 0) {
      results.value = []
      loading.value = false
      return
    }

    const calculatedResults = calculateScores(
      votes,
      Array.isArray(players) ? players : [],
      Array.isArray(picks) ? picks : [],
      Array.isArray(entries) ? entries : []
    )

    results.value = calculatedResults

    // Update game status to complete if all players have voted
    // Each player votes for (min(4, players-1)) teams (excluding their own)
    const playersArray = Array.isArray(players) ? players : []
    const votesPerPlayer = getVotesPerPlayer(playersArray.length)
    const expectedVotes = playersArray.length * votesPerPlayer
    const allPlayersVoted = votes.length >= expectedVotes

    if (allPlayersVoted && gameValue.status !== 'complete') {
      await draftGameComposable.updateDraftGameStatus(gameId.value, 'complete')
    }
  } catch (error) {
    console.error('[Results] Error loading results:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadResults()
  
  // Poll for updates every 5 seconds
  const interval = setInterval(() => {
    loadResults()
  }, 5000)

  // Cleanup on unmount
  return () => {
    clearInterval(interval)
  }
})
</script>

<style scoped>
.results {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #213547;
}

.results h1,
.results h2,
.results h3 {
  color: #213547;
}

.rankings-section h2 {
  color: #213547;
}

.rank-info h3 {
  color: #213547;
}

.team-entry span {
  color: #213547;
}

.loading {
  text-align: center;
  padding: 40px;
}

.winner-section {
  margin-bottom: 40px;
}

.winner-card {
  text-align: center;
  padding: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.winner-card h2 {
  margin: 0 0 10px 0;
  font-size: 32px;
}

.winner-card h3 {
  margin: 0 0 10px 0;
  font-size: 28px;
}

.winner-score {
  font-size: 24px;
  margin-bottom: 30px;
  opacity: 0.9;
}

.winner-team {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 30px;
}

.winner-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.2);
  padding: 15px;
  border-radius: 8px;
  min-width: 120px;
}

.winner-entry img,
.entry-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  object-fit: cover;
}

.entry-placeholder {
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.winner-entry span {
  font-weight: bold;
  text-align: center;
}

.rankings-section {
  margin-top: 40px;
}

.rankings-section h2 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
}

.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ranking-item {
  display: flex;
  gap: 20px;
  padding: 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  transition: all 0.2s;
}

.ranking-item.winner {
  border-color: #42b983;
  background: #f0fdf4;
  box-shadow: 0 4px 8px rgba(66, 185, 131, 0.2);
}

.ranking-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.rank-number {
  font-size: 32px;
  min-width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-info {
  flex: 1;
}

.rank-info h3 {
  margin: 0 0 5px 0;
  font-size: 24px;
}

.score {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #666;
  font-weight: bold;
}

.team-entries {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.team-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
  min-width: 100px;
}

.team-entry img {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  object-fit: cover;
}

.team-entry .entry-placeholder {
  width: 80px;
  height: 80px;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #666;
}

.team-entry span {
  font-size: 12px;
  text-align: center;
}

.no-results {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>
