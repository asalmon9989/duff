import type { Player, Entry, Pick } from '../types'

export interface DraftState {
  players: Player[]
  entries: Entry[]
  picks: Pick[]
  currentPickNumber: number
  totalPicks: number
}

export function calculateTotalPicks(entriesCount: number, playersCount: number): number {
  // Calculate how many complete rounds we can have
  // Each round has playersCount picks
  // We stop when there are fewer entries left than players
  const rounds = Math.floor(entriesCount / playersCount)
  return rounds * playersCount
}

export function getCurrentPlayer(state: DraftState): Player | null {
  if (state.currentPickNumber > state.totalPicks) {
    return null
  }

  const players = state.players
  const playersCount = players.length

  // Calculate which round we're in (0-indexed)
  const round = Math.floor((state.currentPickNumber - 1) / playersCount)

  // Determine if we're going forward or backward
  const isForward = round % 2 === 0

  if (isForward) {
    // Forward: 0, 1, 2, ..., n-1
    const positionInRound = (state.currentPickNumber - 1) % playersCount
    return players[positionInRound] || null
  } else {
    // Backward: n-1, n-2, ..., 1, 0
    const positionInRound = (state.currentPickNumber - 1) % playersCount
    return players[playersCount - 1 - positionInRound] || null
  }
}

export function getNextPickNumber(state: DraftState): number {
  return state.currentPickNumber + 1
}

export function getTakenEntryIds(state: DraftState): Set<string> {
  return new Set(state.picks.map(pick => pick.entry_id))
}

export function getAvailableEntries(state: DraftState): Entry[] {
  const takenIds = getTakenEntryIds(state)
  return state.entries.filter(entry => !takenIds.has(entry.id))
}

export function isDraftComplete(state: DraftState): boolean {
  // Draft is complete when we've made all the picks (picks.length >= totalPicks)
  // or when currentPickNumber would exceed totalPicks
  return state.picks.length >= state.totalPicks || state.currentPickNumber > state.totalPicks
}

export function canMakePick(state: DraftState, entryId: string): boolean {
  if (isDraftComplete(state)) {
    return false
  }

  const takenIds = getTakenEntryIds(state)
  return !takenIds.has(entryId)
}

export function initializeTurnOrder(players: Player[]): Player[] {
  // Create a copy and shuffle
  const shuffled: Player[] = [...players]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]!
    shuffled[i] = shuffled[j]!
    shuffled[j] = temp
  }
  return shuffled
}

export function getPlayerPicks(state: DraftState, playerId: string): Pick[] {
  return state.picks
    .filter(pick => pick.player_id === playerId)
    .sort((a, b) => a.pick_number - b.pick_number)
}
