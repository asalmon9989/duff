import type { Vote, Player, Entry, Pick, VoteResult } from '../types'

/**
 * Calculate the number of votes each player should make
 * Each player votes for all other players, up to a maximum of 4
 * @param totalPlayers Total number of players in the game
 * @returns Number of votes each player should make
 */
export function getVotesPerPlayer(totalPlayers: number): number {
  // Each player votes for all other players, max 4
  return Math.min(4, Math.max(1, totalPlayers - 1))
}

/**
 * Calculate points for a given rank
 * @param rank The rank (1st, 2nd, 3rd, etc.)
 * @param maxVotes Maximum number of votes (determines scoring scale)
 * @returns Points awarded for this rank
 */
export function getPointsForRank(rank: number, maxVotes: number): number {
  // 1st place gets maxVotes points, 2nd gets maxVotes-1, etc.
  return maxVotes - rank + 1
}

export function calculateScores(
  votes: Vote[],
  players: Player[],
  picks: Pick[],
  entries: Entry[]
): VoteResult[] {
  // Calculate the number of votes per player to determine scoring scale
  const votesPerPlayer = getVotesPerPlayer(players.length)
  
  // Create a map of player_id -> score
  const scores = new Map<string, number>()

  // Initialize all players with 0 score
  players.forEach(player => {
    scores.set(player.id, 0)
  })

  // Calculate scores dynamically based on votesPerPlayer
  // 1st = votesPerPlayer points, 2nd = votesPerPlayer-1, etc.
  votes.forEach(vote => {
    const currentScore = scores.get(vote.voted_player_id) || 0
    const points = getPointsForRank(vote.rank, votesPerPlayer)
    scores.set(vote.voted_player_id, currentScore + points)
  })

  // Create a map of player_id -> entries
  const playerEntries = new Map<string, Entry[]>()
  players.forEach(player => {
    const playerPicks = picks.filter(p => p.player_id === player.id)
    const playerEntryIds = playerPicks.map(p => p.entry_id)
    const playerEntryObjects = entries.filter(e => playerEntryIds.includes(e.id))
    playerEntries.set(player.id, playerEntryObjects)
  })

  // Build results array
  const results: VoteResult[] = players.map(player => ({
    player_id: player.id,
    player_name: player.name,
    score: scores.get(player.id) || 0,
    entries: playerEntries.get(player.id) || [],
  }))

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score)

  return results
}

export function getWinner(results: VoteResult[]): VoteResult | null {
  if (results.length === 0) {
    return null
  }

  // Return the player with the highest score
  return results[0] || null
}
