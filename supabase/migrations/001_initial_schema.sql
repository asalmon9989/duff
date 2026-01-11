-- Create enum for draft game status
CREATE TYPE draft_game_status AS ENUM ('drafting', 'hear_me_out', 'voting', 'complete');

-- Drafts table (templates)
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Draft games table (instances)
CREATE TABLE draft_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  status draft_game_status NOT NULL DEFAULT 'drafting',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entries table (belong to draft template)
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table (belong to draft game instance)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_game_id UUID NOT NULL REFERENCES draft_games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  turn_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Picks table (belong to draft game instance)
CREATE TABLE picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_game_id UUID NOT NULL REFERENCES draft_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  pick_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draft_game_id, entry_id),
  UNIQUE(draft_game_id, pick_number)
);

-- Votes table (belong to draft game instance)
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_game_id UUID NOT NULL REFERENCES draft_games(id) ON DELETE CASCADE,
  voter_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 4),
  voted_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draft_game_id, voter_player_id, rank),
  CHECK (voter_player_id != voted_player_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_draft_games_draft_id ON draft_games(draft_id);
CREATE INDEX idx_entries_draft_id ON entries(draft_id);
CREATE INDEX idx_players_draft_game_id ON players(draft_game_id);
CREATE INDEX idx_picks_draft_game_id ON picks(draft_game_id);
CREATE INDEX idx_picks_player_id ON picks(player_id);
CREATE INDEX idx_votes_draft_game_id ON votes(draft_game_id);
CREATE INDEX idx_votes_voter_player_id ON votes(voter_player_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_draft_games_updated_at BEFORE UPDATE ON draft_games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read drafts (password will be checked in application)
CREATE POLICY "Anyone can read drafts" ON drafts FOR SELECT USING (true);

-- Policy: Anyone can create drafts
CREATE POLICY "Anyone can create drafts" ON drafts FOR INSERT WITH CHECK (true);

-- Policy: Anyone can update drafts (password will be checked in application)
CREATE POLICY "Anyone can update drafts" ON drafts FOR UPDATE USING (true);

-- Policy: Anyone can read draft games
CREATE POLICY "Anyone can read draft games" ON draft_games FOR SELECT USING (true);

-- Policy: Anyone can create draft games
CREATE POLICY "Anyone can create draft games" ON draft_games FOR INSERT WITH CHECK (true);

-- Policy: Anyone can update draft games
CREATE POLICY "Anyone can update draft games" ON draft_games FOR UPDATE USING (true);

-- Policy: Anyone can delete draft games
CREATE POLICY "Anyone can delete draft games" ON draft_games FOR DELETE USING (true);

-- Policy: Anyone can read entries
CREATE POLICY "Anyone can read entries" ON entries FOR SELECT USING (true);

-- Policy: Anyone can create entries
CREATE POLICY "Anyone can create entries" ON entries FOR INSERT WITH CHECK (true);

-- Policy: Anyone can update entries
CREATE POLICY "Anyone can update entries" ON entries FOR UPDATE USING (true);

-- Policy: Anyone can delete entries
CREATE POLICY "Anyone can delete entries" ON entries FOR DELETE USING (true);

-- Policy: Anyone can read players
CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);

-- Policy: Anyone can create players
CREATE POLICY "Anyone can create players" ON players FOR INSERT WITH CHECK (true);

-- Policy: Anyone can read picks
CREATE POLICY "Anyone can read picks" ON picks FOR SELECT USING (true);

-- Policy: Anyone can create picks
CREATE POLICY "Anyone can create picks" ON picks FOR INSERT WITH CHECK (true);

-- Policy: Anyone can read votes
CREATE POLICY "Anyone can read votes" ON votes FOR SELECT USING (true);

-- Policy: Anyone can create votes
CREATE POLICY "Anyone can create votes" ON votes FOR INSERT WITH CHECK (true);
