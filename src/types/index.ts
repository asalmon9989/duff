export interface Draft {
  id: string
  subject: string
  password: string
  created_at: string
  updated_at: string
}

export interface DraftGame {
  id: string
  draft_id: string
  status: 'drafting' | 'hear_me_out' | 'voting' | 'complete'
  created_at: string
  updated_at: string
}

export interface Entry {
  id: string
  draft_id: string
  name: string
  image_url: string | null
  created_at: string
}

export interface Player {
  id: string
  draft_game_id: string
  name: string
  turn_order: number
  created_at: string
}

export interface Pick {
  id: string
  draft_game_id: string
  player_id: string
  entry_id: string
  pick_number: number
  created_at: string
}

export interface Vote {
  id: string
  draft_game_id: string
  voter_player_id: string
  rank: number
  voted_player_id: string
  created_at: string
}

export interface PlayerTeam {
  player: Player
  entries: Entry[]
}

export interface VoteResult {
  player_id: string
  player_name: string
  score: number
  entries: Entry[]
}
