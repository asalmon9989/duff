<template>
  <div class="game-setup">
    <h1>Game Setup</h1>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="draft">
      <h2>{{ draft.subject }}</h2>

      <div class="players-section">
        <h3>Players</h3>
        <div class="player-form">
          <input
            v-model="newPlayerName"
            type="text"
            placeholder="Player name"
            @keyup.enter="handleAddPlayer"
          />
          <button
            @click="handleAddPlayer"
            :disabled="!newPlayerName || loading"
          >
            Add Player
          </button>
        </div>

        <div class="players-list">
          <div
            v-for="(player, index) in players"
            :key="index"
            class="player-item"
          >
            <span>{{ player }}</span>
            <button @click="handleRemovePlayer(index)" class="delete-btn">
              Remove
            </button>
          </div>
        </div>

        <div v-if="players.length < 2" class="warning">
          You need at least 2 players to start a draft
        </div>
      </div>

      <div class="actions">
        <button
          @click="handleStartDraft"
          :disabled="players.length < 2 || loading"
          class="start-btn"
        >
          {{ loading ? "Starting..." : "Start Draft" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDraft } from "../composables/useDraft";
import { useDraftGame } from "../composables/useDraftGame";
import type { Draft } from "../types";

const route = useRoute();
const router = useRouter();
const draftComposable = useDraft();
const draftGameComposable = useDraftGame();

const draft = ref<Draft | null>(null);
const players = ref<string[]>([]);
const newPlayerName = ref("");
const loading = ref(false);
const password = ref("");

const loadGame = async () => {
  const gameId = route.params.gameId as string;
  const draftPassword = (route.query.password as string) || "";

  if (!gameId) {
    console.error("No gameId in route params");
    return;
  }

  password.value = draftPassword;
  loading.value = true;

  try {
    console.log("Loading game:", gameId);
    const game = await draftGameComposable.getDraftGame(gameId);
    if (!game) {
      console.error("Game not found:", gameId);
      alert("Game not found");
      loading.value = false;
      return;
    }

    console.log("Game found:", game);
    const draftData = await draftComposable.getDraft(game.draft_id);
    if (!draftData) {
      console.error("Draft not found:", game.draft_id);
      alert("Draft not found");
      loading.value = false;
      return;
    }

    if (draftData.password !== draftPassword) {
      console.error("Invalid password");
      alert("Invalid password");
      loading.value = false;
      return;
    }

    draft.value = draftData;
    console.log("Draft loaded:", draftData);

    // Check if game already has players
    const existingPlayers = await draftGameComposable.getPlayers(gameId);
    console.log("Existing players:", existingPlayers);
    if (existingPlayers.length > 0) {
      // Game already started, redirect to draft board
      console.log("Game already started, redirecting to draft board");
      loading.value = false;
      await router.push(
        `/game/${gameId}?password=${encodeURIComponent(draftPassword)}`
      );
      return;
    }
  } catch (error) {
    console.error("Error loading game:", error);
    alert(
      `Error loading game: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    loading.value = false;
  }
};

const handleAddPlayer = () => {
  if (newPlayerName.value.trim()) {
    players.value.push(newPlayerName.value.trim());
    newPlayerName.value = "";
  }
};

const handleRemovePlayer = (index: number) => {
  players.value.splice(index, 1);
};

const handleStartDraft = async () => {
  const gameId = route.params.gameId as string;
  if (!gameId || players.value.length < 2) {
    alert("Please add at least 2 players");
    return;
  }

  loading.value = true;
  try {
    console.log("Starting draft with players:", players.value);

    // Create players directly instead of using useDraftLogic
    const shuffledNames = [...players.value];
    for (let i = shuffledNames.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledNames[i], shuffledNames[j]] = [
        shuffledNames[j],
        shuffledNames[i],
      ];
    }

    console.log("Shuffled player order:", shuffledNames);

    // Create players with turn order
    for (let i = 0; i < shuffledNames.length; i++) {
      console.log(`Adding player ${i}: ${shuffledNames[i]}`);
      const player = await draftGameComposable.addPlayer(
        gameId,
        shuffledNames[i],
        i
      );
      if (!player) {
        throw new Error(`Failed to add player: ${shuffledNames[i]}`);
      }
      console.log(`Player added successfully:`, player);
    }

    console.log("All players added, navigating to draft board");

    // Reset loading before navigation
    loading.value = false;

    // Navigate to draft board
    const targetPath = `/game/${gameId}?password=${encodeURIComponent(
      password.value
    )}`;
    console.log("Target path:", targetPath);

    // Force navigation using router.push with a small delay to ensure state is ready
    setTimeout(() => {
      console.log("Executing navigation...");
      router
        .push(targetPath)
        .then(() => {
          console.log("Navigation successful");
        })
        .catch((err) => {
          console.error("Navigation failed, using window.location:", err);
          window.location.hash = `#${targetPath}`;
        });
    }, 100);
  } catch (error) {
    console.error("Error starting draft:", error);
    alert(
      `Failed to start draft: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    loading.value = false;
  }
};

onMounted(() => {
  loadGame();
});
</script>

<style scoped>
.game-setup {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  color: #213547;
}

.game-setup h1,
.game-setup h2,
.game-setup h3 {
  color: #213547;
}

.game-setup label {
  color: #213547;
}

.loading {
  text-align: center;
  padding: 40px;
}

.players-section {
  margin-top: 30px;
}

.player-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.player-form input {
  flex: 1;
  padding: 8px;
  font-size: 16px;
}

.players-list {
  margin-bottom: 20px;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
}

.delete-btn {
  background: #dc3545;
  padding: 5px 10px;
  font-size: 14px;
}

.delete-btn:hover {
  background: #c82333;
}

.warning {
  color: #dc3545;
  margin-bottom: 20px;
  padding: 10px;
  background: #fff3cd;
  border-radius: 4px;
}

.actions {
  margin-top: 30px;
}

.start-btn {
  width: 100%;
  padding: 15px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
}

.start-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.start-btn:hover:not(:disabled) {
  background: #35a372;
}
</style>
