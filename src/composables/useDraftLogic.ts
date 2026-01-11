import { ref, computed } from 'vue'
import { useDraft } from './useDraft'
import { useDraftGame } from './useDraftGame'
import type { Draft, DraftGame, Player, Entry, Pick } from '../types'
import { calculateTotalPicks, getCurrentPlayer, getAvailableEntries, isDraftComplete, canMakePick } from '../utils/snakeDraft'

export function useDraftLogic(gameId: string | null = null) {
  const draftGame = useDraftGame()
  const draft = useDraft()

  const currentGame = ref<DraftGame | null>(null)
  const currentDraft = ref<Draft | null>(null)
  const players = ref<Player[]>([])
  const entries = ref<Entry[]>([])
  const picks = ref<Pick[]>([])
  const loading = ref(false)

  const loadGame = async (id: string) => {
    loading.value = true
    try {
      console.log('[useDraftLogic] Loading game:', id)
      const game = await draftGame.getDraftGame(id)
      if (!game) {
        console.error('[useDraftLogic] Game not found:', id)
        return
      }

      console.log('[useDraftLogic] Game loaded:', game)
      currentGame.value = game

      // Load draft
      console.log('[useDraftLogic] Loading draft:', game.draft_id)
      const draftData = await draft.getDraft(game.draft_id)
      currentDraft.value = draftData
      console.log('[useDraftLogic] Draft loaded:', draftData)

      // Load players
      console.log('[useDraftLogic] Loading players')
      const playersData = await draftGame.getPlayers(id)
      // Sort players by turn_order to ensure correct order
      players.value = playersData.sort((a, b) => a.turn_order - b.turn_order)
      console.log('[useDraftLogic] Players loaded (sorted by turn_order):', players.value)

      // Load entries
      console.log('[useDraftLogic] Loading entries')
      const entriesData = await draft.getEntries(game.draft_id)
      entries.value = entriesData
      console.log('[useDraftLogic] Entries loaded:', entriesData)

      // Load picks
      console.log('[useDraftLogic] Loading picks')
      const picksData = await draftGame.getPicks(id)
      picks.value = picksData
      console.log('[useDraftLogic] Picks loaded:', picksData)
    } catch (error) {
      console.error('[useDraftLogic] Error loading game:', error)
      throw error
    } finally {
      loading.value = false
      console.log('[useDraftLogic] Loading complete')
    }
  }

  const totalPicks = computed(() => {
    const total = entries.value.length === 0 || players.value.length === 0 
      ? 0 
      : calculateTotalPicks(entries.value.length, players.value.length)
    console.log('[useDraftLogic] totalPicks computed:', total, 'from', entries.value.length, 'entries and', players.value.length, 'players')
    return total
  })

  const currentPickNumber = computed(() => {
    const num = picks.value.length + 1
    const total = totalPicks.value
    console.log('[useDraftLogic] currentPickNumber computed:', num, 'from', picks.value.length, 'picks, totalPicks:', total)
    // If draft is complete, return totalPicks instead of exceeding it
    if (picks.value.length >= total) {
      return total
    }
    return num
  })

  const currentPlayer = computed(() => {
    try {
      console.log('[useDraftLogic] currentPlayer computed running')
      console.log('[useDraftLogic] currentGame.value:', currentGame.value)
      console.log('[useDraftLogic] players.value:', players.value)
      console.log('[useDraftLogic] entries.value:', entries.value)
      console.log('[useDraftLogic] picks.value:', picks.value)
      
      if (!currentGame.value) {
        console.log('[useDraftLogic] No current game')
        return null
      }
      
      if (currentGame.value.status !== 'drafting') {
        console.log('[useDraftLogic] Game status is not drafting:', currentGame.value.status)
        return null
      }
      
      const state = {
        players: players.value,
        entries: entries.value,
        picks: picks.value,
        currentPickNumber: currentPickNumber.value,
        totalPicks: totalPicks.value,
      }
      
      console.log('[useDraftLogic] Computing current player with state:', {
        playersCount: players.value.length,
        players: players.value.map(p => ({ id: p.id, name: p.name, turn_order: p.turn_order })),
        entriesCount: entries.value.length,
        picksCount: picks.value.length,
        currentPickNumber: currentPickNumber.value,
        totalPicks: totalPicks.value,
      })
      
      if (isDraftComplete(state)) {
        console.log('[useDraftLogic] Draft is complete')
        return null
      }

      const player = getCurrentPlayer(state)
      console.log('[useDraftLogic] getCurrentPlayer returned:', player)
      return player
    } catch (error) {
      console.error('[useDraftLogic] Error in currentPlayer computed:', error)
      return null
    }
  })

  const availableEntries = computed(() => {
    const state = {
      players: players.value,
      entries: entries.value,
      picks: picks.value,
      currentPickNumber: currentPickNumber.value,
      totalPicks: totalPicks.value,
    }
    const available = getAvailableEntries(state)
    console.log('[useDraftLogic] Available entries computed:', available.length, 'of', entries.value.length)
    return available
  })

  const draftComplete = computed(() => {
    const state = {
      players: players.value,
      entries: entries.value,
      picks: picks.value,
      currentPickNumber: currentPickNumber.value,
      totalPicks: totalPicks.value,
    }
    const complete = isDraftComplete(state)
    console.log('[useDraftLogic] draftComplete computed:', complete, 'picks:', picks.value.length, 'totalPicks:', totalPicks.value)
    return complete
  })

  const makePick = async (entryId: string) => {
    if (!currentGame.value || !currentPlayer.value) return false

    if (!canMakePick({
      players: players.value,
      entries: entries.value,
      picks: picks.value,
      currentPickNumber: currentPickNumber.value,
      totalPicks: totalPicks.value,
    }, entryId)) {
      return false
    }

    const pick = await draftGame.makePick(
      currentGame.value.id,
      currentPlayer.value.id,
      entryId,
      currentPickNumber.value
    )

    if (pick) {
      picks.value.push(pick)

      // Check if draft is complete
      if (draftComplete.value) {
        await draftGame.updateDraftGameStatus(currentGame.value.id, 'hear_me_out')
        if (currentGame.value) {
          currentGame.value.status = 'hear_me_out'
        }
      }

      return true
    }

    return false
  }

  const startDraft = async (gameId: string, playerNames: string[]) => {
    if (!gameId) {
      throw new Error('Game ID is required')
    }
    // Shuffle players and assign turn order
    const shuffledNames = [...playerNames]
    for (let i = shuffledNames.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledNames[i], shuffledNames[j]] = [shuffledNames[j], shuffledNames[i]]
    }

    // Create players with turn order
    for (let i = 0; i < shuffledNames.length; i++) {
      await draftGame.addPlayer(gameId, shuffledNames[i], i)
    }

    // Reload game data
    await loadGame(gameId)
  }

  if (gameId) {
    loadGame(gameId)
  }

  return {
    currentGame,
    currentDraft,
    players,
    entries,
    picks,
    loading,
    totalPicks,
    currentPickNumber,
    currentPlayer,
    availableEntries,
    draftComplete,
    loadGame,
    makePick,
    startDraft,
  }
}
