import { supabase } from './useSupabase'
import type { DraftGame, Player, Pick, Vote } from '../types'

export function useDraftGame() {
  const createDraftGame = async (draftId: string): Promise<DraftGame | null> => {
    const { data, error } = await supabase
      .from('draft_games')
      .insert({ draft_id: draftId, status: 'drafting' })
      .select()
      .single()

    if (error) {
      console.error('Error creating draft game:', error)
      return null
    }

    return data
  }

  const getDraftGame = async (gameId: string): Promise<DraftGame | null> => {
    const { data, error } = await supabase
      .from('draft_games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (error) {
      console.error('Error fetching draft game:', error)
      return null
    }

    return data
  }

  const updateDraftGameStatus = async (gameId: string, status: DraftGame['status']): Promise<DraftGame | null> => {
    const { data, error } = await supabase
      .from('draft_games')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', gameId)
      .select()
      .single()

    if (error) {
      console.error('Error updating draft game status:', error)
      return null
    }

    return data
  }

  const getPlayers = async (gameId: string): Promise<Player[]> => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('draft_game_id', gameId)
      .order('turn_order', { ascending: true })

    if (error) {
      console.error('Error fetching players:', error)
      return []
    }

    return data || []
  }

  const addPlayer = async (gameId: string, name: string, turnOrder: number): Promise<Player | null> => {
    const { data, error } = await supabase
      .from('players')
      .insert({ draft_game_id: gameId, name, turn_order: turnOrder })
      .select()
      .single()

    if (error) {
      console.error('Error adding player:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw new Error(`Failed to add player "${name}": ${error.message}`)
    }

    return data
  }

  const deletePlayer = async (playerId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (error) {
      console.error('Error deleting player:', error)
      return false
    }

    return true
  }

  const getPicks = async (gameId: string): Promise<Pick[]> => {
    const { data, error } = await supabase
      .from('picks')
      .select('*')
      .eq('draft_game_id', gameId)
      .order('pick_number', { ascending: true })

    if (error) {
      console.error('Error fetching picks:', error)
      return []
    }

    return data || []
  }

  const makePick = async (gameId: string, playerId: string, entryId: string, pickNumber: number): Promise<Pick | null> => {
    const { data, error } = await supabase
      .from('picks')
      .insert({ draft_game_id: gameId, player_id: playerId, entry_id: entryId, pick_number: pickNumber })
      .select()
      .single()

    if (error) {
      console.error('Error making pick:', error)
      return null
    }

    return data
  }

  const getVotes = async (gameId: string): Promise<Vote[]> => {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('draft_game_id', gameId)
      .order('rank', { ascending: true })

    if (error) {
      console.error('Error fetching votes:', error)
      return []
    }

    return data || []
  }

  const submitVote = async (gameId: string, voterPlayerId: string, rank: number, votedPlayerId: string): Promise<Vote | null> => {
    const { data, error } = await supabase
      .from('votes')
      .insert({ draft_game_id: gameId, voter_player_id: voterPlayerId, rank, voted_player_id: votedPlayerId })
      .select()
      .single()

    if (error) {
      console.error('Error submitting vote:', error)
      return null
    }

    return data
  }

  const getGamesForDraft = async (draftId: string): Promise<DraftGame[]> => {
    const { data, error } = await supabase
      .from('draft_games')
      .select('*')
      .eq('draft_id', draftId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching games for draft:', error)
      return []
    }

    return data || []
  }

  const getAllGames = async (): Promise<DraftGame[]> => {
    const { data, error } = await supabase
      .from('draft_games')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching all games:', error)
      return []
    }

    return data || []
  }

  const getGamesInVoting = async (): Promise<(DraftGame & { draft?: { subject: string } })[]> => {
    // First get games in voting
    const { data: games, error: gamesError } = await supabase
      .from('draft_games')
      .select('*')
      .in('status', ['voting', 'hear_me_out'])
      .order('updated_at', { ascending: false })

    if (gamesError) {
      console.error('Error fetching games in voting:', gamesError)
      return []
    }

    if (!games || games.length === 0) {
      return []
    }

    // Get unique draft IDs
    const draftIds = [...new Set(games.map(g => g.draft_id))]
    
    // Fetch drafts
    const { data: drafts, error: draftsError } = await supabase
      .from('drafts')
      .select('id, subject')
      .in('id', draftIds)

    if (draftsError) {
      console.error('Error fetching drafts:', draftsError)
      // Return games without draft info
      return games as (DraftGame & { draft?: { subject: string } })[]
    }

    // Create a map of draft_id -> draft
    const draftMap = new Map((drafts || []).map(d => [d.id, d]))

    // Combine games with their drafts
    return games.map(game => ({
      ...game,
      draft: draftMap.get(game.draft_id),
    })) as (DraftGame & { draft?: { subject: string } })[]
  }

  const deleteDraftGame = async (gameId: string): Promise<boolean> => {
    // First verify the game exists
    const game = await getDraftGame(gameId)
    if (!game) {
      console.error('Game not found:', gameId)
      return false
    }

    console.log('Attempting to delete game:', gameId, game)

    // Delete the game - use select() to get confirmation of what was deleted
    const { data, error, count } = await supabase
      .from('draft_games')
      .delete()
      .eq('id', gameId)
      .select()

    if (error) {
      console.error('Error deleting draft game:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return false
    }

    // Check if anything was actually deleted
    if (!data || data.length === 0) {
      console.error('No rows were deleted. This might be an RLS policy issue.')
      console.error('Game ID:', gameId)
      return false
    }

    console.log('Game deleted successfully:', gameId, 'Deleted rows:', data.length, 'Data:', data)
    
    // Verify deletion by checking if game still exists
    const verifyGame = await getDraftGame(gameId)
    if (verifyGame) {
      console.error('Game still exists after deletion attempt. This indicates an RLS policy issue.')
      console.error('Game ID:', gameId)
      return false
    }

    return true
  }

  return {
    createDraftGame,
    getDraftGame,
    updateDraftGameStatus,
    getPlayers,
    addPlayer,
    deletePlayer,
    getPicks,
    makePick,
    getVotes,
    submitVote,
    getGamesForDraft,
    getAllGames,
    getGamesInVoting,
    deleteDraftGame,
  }
}
