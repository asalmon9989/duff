# Draft App

A Vue 3 + TypeScript application for running snake drafts with voting. Hosted on GitHub Pages with Supabase backend.

## Features

- Create draft templates with entries (name + image)
- Run multiple games from the same template
- Snake draft mechanics with random turn order
- "Hear Me Out" round for players to present their teams
- Anonymous voting system with unique links per player
- Score calculation and winner determination

## Setup

### Prerequisites

- Node.js 20+
- npm
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project
   - Run the migration in `supabase/migrations/001_initial_schema.sql`
   - Create a storage bucket (REQUIRED):
     - Go to Storage in Supabase dashboard
     - Click "New bucket"
     - Name it: `entry-images`
     - Check "Public bucket" to make it public
     - Click "Create bucket"
   - Run the storage policies migration in `supabase/migrations/002_storage_setup.sql`
   - Get your Supabase URL and anon key from Settings > API

4. Create `.env.local` file:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment to GitHub Pages

The app is configured to deploy to GitHub Pages automatically via GitHub Actions.

### Steps:

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/the-control-group/draft.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Navigate to **Settings** > **Pages**
   - Under "Source", select **GitHub Actions** (not "Deploy from a branch")
   - Save the settings

3. **Configure the base path (if needed):**
   - The `vite.config.ts` is set to use `/draft/` as the base path
   - If your repository is named `draft`, this is correct
   - If your repository has a different name, update the `base` path in `vite.config.ts`:
     ```typescript
     base: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '/',
     ```

4. **Push to trigger deployment:**
   - Push any changes to the `main` branch
   - GitHub Actions will automatically build and deploy
   - Check the **Actions** tab to see the deployment progress
   - Once complete, your app will be available at: `https://the-control-group.github.io/draft/`

### Note:
Since Supabase credentials are hardcoded in `useSupabase.ts`, you don't need to set up GitHub Secrets. However, for better security, consider using environment variables in production.

## Usage

1. Create a draft template at `/draft/new`
2. Add entries (name + optional image)
3. Start a new game from the template
4. Add players for the game
5. Begin drafting
6. After drafting, go through "Hear Me Out"
7. Generate voting links for each player
8. View results after all votes are in

## Project Structure

```
src/
├── components/     # Vue components
├── composables/    # Vue composables for logic
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── router/         # Vue Router configuration
```

## Database Schema

- `drafts` - Draft templates
- `draft_games` - Game instances
- `entries` - Draft entries (belong to templates)
- `players` - Players (belong to games)
- `picks` - Draft picks
- `votes` - Voting results
