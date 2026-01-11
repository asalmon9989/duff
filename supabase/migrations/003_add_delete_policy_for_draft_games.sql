-- Add DELETE policy for draft_games table
-- This allows deletion of draft games (cascade will handle related records)

CREATE POLICY "Anyone can delete draft games" ON draft_games FOR DELETE USING (true);
