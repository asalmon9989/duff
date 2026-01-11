<template>
  <div class="hear-me-out">
    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="draftLogic && currentDraft">
      <h1>{{ currentDraft.subject }} - Hear Me Out</h1>

      <div class="player-navigation">
        <button
          @click="currentPlayerIndex = Math.max(0, currentPlayerIndex - 1)"
          :disabled="currentPlayerIndex === 0"
        >
          Previous
        </button>
        <span class="player-counter">
          Player {{ currentPlayerIndex + 1 }} of {{ playerTeams.length }}
        </span>
        <button
          @click="currentPlayerIndex = Math.min(playerTeams.length - 1, currentPlayerIndex + 1)"
          :disabled="currentPlayerIndex === playerTeams.length - 1"
        >
          Next
        </button>
      </div>

      <div v-if="currentTeam" class="current-team">
        <h2>{{ currentTeam.player.name }}'s Team</h2>
        <div class="team-entries">
          <div
            v-for="entry in currentTeam.entries"
            :key="entry.id"
            class="team-entry-card"
          >
            <div v-if="entry.image_url" class="entry-image">
              <img :src="entry.image_url" :alt="entry.name" />
            </div>
            <div v-else class="entry-placeholder">No Image</div>
            <div class="entry-name">{{ entry.name }}</div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button
          v-if="currentPlayerIndex === playerTeams.length - 1"
          @click="handleContinue"
          class="continue-btn"
        >
          Continue to Voting
        </button>
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
import type { PlayerTeam } from '../types'

const route = useRoute()
const router = useRouter()
const draftComposable = useDraft()
const draftGameComposable = useDraftGame()

const gameId = computed(() => route.params.gameId as string)
const password = computed(() => (route.query.password as string) || '')
const draftLogic = useDraftLogic(null)
const currentPlayerIndex = ref(0)
const loading = ref(true)

// Unwrap refs for template use
const playersList = computed(() => {
  if (!draftLogic) return []
  const playersRef = draftLogic.players
  const players = playersRef?.value ?? playersRef
  return Array.isArray(players) ? players : []
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

const currentDraft = computed(() => {
  if (!draftLogic) return null
  const draftRef = draftLogic.currentDraft
  return draftRef?.value ?? draftRef
})

const playerTeams = computed((): PlayerTeam[] => {
  if (!draftLogic) return []

  return playersList.value.map(player => {
    const playerPicks = picksList.value
      .filter(pick => pick.player_id === player.id)
      .sort((a, b) => a.pick_number - b.pick_number)

    const entries = playerPicks
      .map(pick => entriesList.value.find(e => e.id === pick.entry_id))
      .filter((e): e is NonNullable<typeof e> => e !== undefined)

    return {
      player,
      entries,
    }
  })
})

const currentTeam = computed(() => {
  return playerTeams.value[currentPlayerIndex.value] || null
})

const handleContinue = () => {
  router.push(`/game/${gameId.value}/voting-links?password=${password.value}`)
}

onMounted(async () => {
  if (!draftLogic) return
  
  try {
    loading.value = true
    
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
    
    // Update game status if needed
    const currentGame = draftLogic.currentGame
    const gameValue = currentGame?.value ?? currentGame
    if (gameValue && gameValue.status === 'drafting') {
      await draftGameComposable.updateDraftGameStatus(gameId.value, 'hear_me_out')
      await draftLogic.loadGame(gameId.value) // Reload to get updated status
    }
  } catch (error) {
    console.error('[HearMeOut] Error loading game:', error)
    alert('Error loading game data')
    router.push('/')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.hear-me-out {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  color: #213547;
}

.hear-me-out h1,
.hear-me-out h2,
.hear-me-out h3 {
  color: #213547;
}

.loading {
  text-align: center;
  padding: 40px;
}

.player-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 30px 0;
  padding: 15px;
  background: #f0f0f0;
  border-radius: 8px;
}

.player-navigation button {
  padding: 10px 20px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.player-navigation button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.player-counter {
  font-weight: bold;
  font-size: 18px;
}

.current-team {
  margin: 30px 0;
}

.current-team h2 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
}

.team-entries {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.team-entry-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.entry-image,
.entry-placeholder {
  width: 100%;
  height: 200px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.entry-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.entry-name {
  padding: 15px;
  text-align: center;
  font-weight: bold;
  font-size: 16px;
}

.actions {
  margin-top: 40px;
  text-align: center;
}

.continue-btn {
  padding: 15px 30px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
}

.continue-btn:hover {
  background: #35a372;
}
</style>
