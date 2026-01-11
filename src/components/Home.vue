<template>
  <div class="home">
    <div class="header">
      <h1>Draft App</h1>
      <router-link to="/draft/new" class="new-draft-btn">Create New Draft</router-link>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else class="content">
      <div class="section">
        <h2>Draft Templates</h2>
        <div v-if="drafts.length === 0" class="empty-state">
          <p>No draft templates yet. Create one to get started!</p>
        </div>
        <div v-else class="drafts-grid">
          <div
            v-for="draft in drafts"
            :key="draft.id"
            class="draft-card"
            @click="handleDraftClick(draft)"
          >
            <h3>{{ draft.subject }}</h3>
            <div class="draft-meta">
              <span class="date">{{ formatDate(draft.updated_at) }}</span>
              <span class="games-count">{{ getGamesCount(draft.id) }} game(s)</span>
            </div>
            <div class="draft-actions">
              <button
                @click.stop="handleEditDraft(draft)"
                class="action-btn edit-btn"
              >
                Edit
              </button>
              <button
                @click.stop="handleStartGame(draft)"
                class="action-btn start-btn"
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Active Games</h2>
        <div v-if="games.length === 0" class="empty-state">
          <p>No active games. Start a game from a draft template!</p>
        </div>
        <div v-else class="games-list">
          <div
            v-for="game in games"
            :key="game.id"
            class="game-card"
            @click="handleGameClick(game)"
          >
            <div class="game-header">
              <h3>{{ getDraftSubject(game.draft_id) }}</h3>
              <span :class="['status-badge', `status-${game.status}`]">
                {{ formatStatus(game.status) }}
              </span>
            </div>
            <div class="game-meta">
              <span class="date">{{ formatDate(game.updated_at) }}</span>
            </div>
            <div class="game-actions">
              <button
                @click.stop="handleResumeGame(game)"
                class="action-btn resume-btn"
              >
                Resume
              </button>
              <button
                @click.stop="handleDeleteGame(game)"
                class="action-btn delete-btn"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDraft } from "../composables/useDraft";
import { useDraftGame } from "../composables/useDraftGame";
import type { Draft, DraftGame } from "../types";

const router = useRouter();
const draftComposable = useDraft();
const draftGameComposable = useDraftGame();

const drafts = ref<Draft[]>([]);
const games = ref<DraftGame[]>([]);
const draftMap = ref<Map<string, Draft>>(new Map());
const gamesCountMap = ref<Map<string, number>>(new Map());
const loading = ref(false);

const loadData = async () => {
  loading.value = true;
  try {
    // Load all drafts
    const draftsData = await draftComposable.getAllDrafts();
    drafts.value = draftsData;

    // Create draft map for quick lookup
    draftMap.value = new Map(draftsData.map((d) => [d.id, d]));

    // Load games count for each draft
    for (const draft of draftsData) {
      const gamesForDraft = await draftGameComposable.getGamesForDraft(draft.id);
      gamesCountMap.value.set(draft.id, gamesForDraft.length);
    }

    // Load all games
    const gamesData = await draftGameComposable.getAllGames();
    games.value = gamesData;
  } finally {
    loading.value = false;
  }
};

const getDraftSubject = (draftId: string): string => {
  return draftMap.value.get(draftId)?.subject || "Unknown Draft";
};

const getGamesCount = (draftId: string): number => {
  return gamesCountMap.value.get(draftId) || 0;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const handleDraftClick = (draft: Draft) => {
  // Prompt for password
  const password = prompt(`Enter password for "${draft.subject}":`);
  if (password) {
    router.push(`/draft/${draft.id}?password=${encodeURIComponent(password)}`);
  }
};

const handleEditDraft = (draft: Draft) => {
  const password = prompt(`Enter password for "${draft.subject}":`);
  if (password) {
    router.push(`/draft/${draft.id}?password=${encodeURIComponent(password)}`);
  }
};

const handleStartGame = async (draft: Draft) => {
  const password = prompt(`Enter password for "${draft.subject}":`);
  if (!password) return;

  // Verify password
  const isValid = await draftComposable.verifyPassword(draft.id, password);
  if (!isValid) {
    alert("Invalid password");
    return;
  }

  // Create new game
  const game = await draftGameComposable.createDraftGame(draft.id);
  if (game) {
    router.push(`/game/${game.id}/setup?password=${encodeURIComponent(password)}`);
  }
};

const handleGameClick = async (game: DraftGame) => {
  const draft = draftMap.value.get(game.draft_id);
  if (!draft) return;

  const password = prompt(`Enter password for "${draft.subject}":`);
  if (!password) return;

  // Verify password
  const isValid = await draftComposable.verifyPassword(draft.id, password);
  if (!isValid) {
    alert("Invalid password");
    return;
  }

  // Route based on game status
  if (game.status === "drafting") {
    router.push(`/game/${game.id}?password=${encodeURIComponent(password)}`);
  } else if (game.status === "hear_me_out") {
    router.push(`/game/${game.id}/hear-me-out?password=${encodeURIComponent(password)}`);
  } else if (game.status === "voting") {
    router.push(`/game/${game.id}/voting-links?password=${encodeURIComponent(password)}`);
  } else if (game.status === "complete") {
    router.push(`/game/${game.id}/results?password=${encodeURIComponent(password)}`);
  }
};

const handleResumeGame = (game: DraftGame) => {
  handleGameClick(game);
};

const handleDeleteGame = async (game: DraftGame) => {
  const draft = draftMap.value.get(game.draft_id);
  if (!draft) return;

  const password = prompt(`Enter password to delete game for "${draft.subject}":`);
  if (!password) return;

  // Verify password
  const isValid = await draftComposable.verifyPassword(draft.id, password);
  if (!isValid) {
    alert("Invalid password");
    return;
  }

  // Confirm deletion
  const confirmed = confirm(`Are you sure you want to delete this game? This action cannot be undone.`);
  if (!confirmed) return;

  // Delete the game
  try {
    const success = await draftGameComposable.deleteDraftGame(game.id);
    if (success) {
      // Reload data to refresh the list
      await loadData();
      alert("Game deleted successfully.");
    } else {
      alert("Failed to delete game. Please check the browser console for details.");
    }
  } catch (error) {
    console.error("Error in handleDeleteGame:", error);
    alert(`Error deleting game: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #213547;
}

.home h1,
.home h2,
.home h3 {
  color: #213547;
}

.home p {
  color: #213547;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #ddd;
}

.header h1 {
  margin: 0;
  font-size: 32px;
}

.new-draft-btn {
  padding: 12px 24px;
  background: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: bold;
  transition: background 0.2s;
}

.new-draft-btn:hover {
  background: #35a372;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.section {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  box-sizing: border-box;
}

.section h2 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #333;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

.drafts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.draft-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f9f9f9;
}

.draft-card:hover {
  border-color: #42b983;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.draft-card h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #333;
}

.draft-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  font-size: 14px;
  color: #666;
}

.draft-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background 0.2s;
  white-space: nowrap;
}

.draft-actions .action-btn {
  flex: 1;
}

.game-actions .action-btn {
  flex: 0 1 auto;
  min-width: 100px;
}

.edit-btn {
  background: #6c757d;
  color: white;
}

.edit-btn:hover {
  background: #5a6268;
}

.start-btn {
  background: #42b983;
  color: white;
}

.start-btn:hover {
  background: #35a372;
}

.resume-btn {
  background: #007bff;
  color: white;
}

.resume-btn:hover {
  background: #0056b3;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

.games-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.game-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f9f9f9;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.game-card:hover {
  border-color: #42b983;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 15px;
  min-width: 0;
}

.game-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  flex-shrink: 0;
  white-space: nowrap;
}

.status-drafting {
  background: #ffc107;
  color: #000;
}

.status-hear_me_out {
  background: #17a2b8;
  color: white;
}

.status-voting {
  background: #6f42c1;
  color: white;
}

.status-complete {
  background: #28a745;
  color: white;
}

.game-meta {
  margin-bottom: 15px;
  font-size: 14px;
  color: #666;
}

.game-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}
</style>
