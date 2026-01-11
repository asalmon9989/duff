<template>
  <div class="draft-board">
    <div v-if="!draftLogic" class="loading">Initializing...</div>
    <div v-else-if="isLoading" class="loading">Loading...</div>

    <div v-else>
      <div
        v-if="!draftLogic.entries || draftLogic.entries.length === 0"
        class="error-message"
      >
        <h2>No entries in this draft</h2>
        <p>Please add entries to the draft template before starting a game.</p>
        <router-link
          :to="`/draft/${draftLogic.currentDraft?.id}?password=${password}`"
        >
          Go to Draft Setup
        </router-link>
      </div>
      <div v-else>
        <h1>{{ currentDraft?.subject }}</h1>

        <div class="draft-info">
          <div class="current-turn">
            <div
              v-if="currentPlayer && currentPlayer.name"
              class="turn-indicator"
            >
              <h2>Current Turn: {{ currentPlayer.name }}</h2>
              <p>
                Pick {{ currentPickNumber }} of
                {{ totalPicks }}
              </p>
            </div>
            <div
              v-else-if="draftCompleteValue || picksList.length >= totalPicks"
              class="draft-complete"
            >
              <h2>Draft Complete!</h2>
              <button @click="handleContinue" class="continue-btn">
                Continue to Hear Me Out
              </button>
            </div>
            <div v-else class="turn-indicator">
              <h2>Loading...</h2>
            </div>
          </div>
        </div>

        <div class="entries-grid">
          <div
            v-for="entry in entriesList"
            :key="entry.id"
            :class="[
              'entry-card',
              {
                taken: isTaken(entry.id),
                available: isAvailable(entry.id),
                current: isCurrentPlayer() && isAvailable(entry.id),
              },
            ]"
            @click="handlePickEntry(entry.id)"
          >
            <div v-if="entry.image_url" class="entry-image">
              <img
                :src="entry.image_url"
                :alt="entry.name"
                @error="
                  (e) =>
                    console.error(
                      '[DraftBoard] Image load error:',
                      entry.image_url,
                      entry
                    )
                "
                @load="
                  () => console.log('[DraftBoard] Image loaded:', entry.name)
                "
              />
            </div>
            <div v-else class="entry-placeholder">No Image</div>
            <div class="entry-name">{{ entry.name }}</div>
            <div v-if="isTaken(entry.id)" class="taken-overlay">
              <span class="taken-x">✕</span>
            </div>
          </div>
        </div>

        <div class="teams-preview">
          <h3>Teams So Far</h3>
          <div class="teams-list">
            <div
              v-for="player in playersList"
              :key="player.id"
              class="team-item"
            >
              <h4>{{ player.name }}</h4>
              <div class="team-entries">
                <div
                  v-for="pick in getPlayerPicksForDisplay(player.id)"
                  :key="pick.id"
                  class="team-entry"
                >
                  <template v-if="getEntryById(pick.entry_id)">
                    <img
                      v-if="getEntryById(pick.entry_id)?.image_url"
                      :src="getEntryById(pick.entry_id)?.image_url"
                      :alt="getEntryById(pick.entry_id)?.name"
                    />
                    <span>{{ getEntryById(pick.entry_id)?.name }}</span>
                  </template>
                  <span v-else>Loading...</span>
                </div>
                <div
                  v-if="getPlayerPicksForDisplay(player.id).length === 0"
                  class="no-picks"
                >
                  No picks yet
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDraftLogic } from "../composables/useDraftLogic";
import { useDraft } from "../composables/useDraft";
import { useDraftGame } from "../composables/useDraftGame";
import type { Entry, Pick } from "../types";

console.log("[DraftBoard] Script setup executing");

const route = useRoute();
const router = useRouter();
const draftComposable = useDraft();
const draftGameComposable = useDraftGame();

const gameId = computed(() => route.params.gameId as string);
const password = computed(() => (route.query.password as string) || "");
// Don't pass gameId at setup - load it in onMounted instead
const draftLogic = useDraftLogic(null);

// Unwrap entries ref for template use
const entriesList = computed(() => {
  if (!draftLogic) return [];
  const entriesRef = draftLogic.entries;
  const entries = entriesRef?.value ?? entriesRef;
  return Array.isArray(entries) ? entries : [];
});

// Unwrap players ref for template use
const playersList = computed(() => {
  if (!draftLogic) return [];
  const playersRef = draftLogic.players;
  const players = playersRef?.value ?? playersRef;
  return Array.isArray(players) ? players : [];
});

// Unwrap currentPlayer computed for template use
const currentPlayer = computed(() => {
  if (!draftLogic) return null;
  const currentPlayerRef = draftLogic.currentPlayer;
  return currentPlayerRef?.value ?? currentPlayerRef;
});

// Unwrap currentDraft ref for template use
const currentDraft = computed(() => {
  if (!draftLogic) return null;
  const draftRef = draftLogic.currentDraft;
  return draftRef?.value ?? draftRef;
});

// Unwrap computed properties for template use
const currentPickNumber = computed(() => {
  if (!draftLogic) return 0;
  const pickNumRef = draftLogic.currentPickNumber;
  return pickNumRef?.value ?? pickNumRef ?? 0;
});

const totalPicks = computed(() => {
  if (!draftLogic) return 0;
  const totalRef = draftLogic.totalPicks;
  return totalRef?.value ?? totalRef ?? 0;
});

const draftComplete = computed(() => {
  if (!draftLogic) return false;
  const completeRef = draftLogic.draftComplete;
  return completeRef?.value ?? completeRef ?? false;
});

// Also create a direct value for template use
const draftCompleteValue = computed(() => {
  const val = draftComplete.value;
  console.log(
    "[DraftBoard] draftCompleteValue:",
    val,
    "currentPlayer:",
    currentPlayer.value
  );
  return val;
});

// Create a local reactive loading state
const isLoading = ref(true);

// Watch the loading state from draftLogic
// draftLogic.loading is a ref, need to unwrap it
if (draftLogic) {
  watch(
    () => {
      const loadingRef = draftLogic.loading;
      // Unwrap the ref - check if it has a value property
      if (
        loadingRef &&
        typeof loadingRef === "object" &&
        "value" in loadingRef
      ) {
        return loadingRef.value;
      }
      return loadingRef;
    },
    (newVal) => {
      console.log("[DraftBoard] Loading state changed to:", newVal);
      isLoading.value = !!newVal;
    },
    { immediate: true }
  );

  // Set initial value
  const loadingRef = draftLogic.loading;
  const initialVal =
    loadingRef && typeof loadingRef === "object" && "value" in loadingRef
      ? loadingRef.value
      : loadingRef;
  isLoading.value = !!initialVal;
  console.log("[DraftBoard] Initial loading value set to:", isLoading.value);
}

const isTaken = (entryId: string): boolean => {
  return picksList.value.some((pick) => pick.entry_id === entryId);
};

const isAvailable = (entryId: string): boolean => {
  if (!draftLogic) return false;
  const availableEntriesRef = draftLogic.availableEntries;
  // Unwrap the computed ref
  const availableEntries = availableEntriesRef?.value ?? availableEntriesRef;
  if (!Array.isArray(availableEntries)) return false;
  return availableEntries.some((e) => e.id === entryId);
};

const isCurrentPlayer = (): boolean => {
  return currentPlayer.value !== null;
};

const handlePickEntry = async (entryId: string) => {
  console.log("[DraftBoard] handlePickEntry called with entryId:", entryId);
  if (!draftLogic) {
    console.log("[DraftBoard] No draftLogic");
    return;
  }
  if (!isAvailable(entryId)) {
    console.log("[DraftBoard] Entry not available:", entryId);
    console.log("[DraftBoard] Available entries:", draftLogic.availableEntries);
    return;
  }
  if (!currentPlayer.value) {
    console.log("[DraftBoard] No current player");
    return;
  }

  console.log("[DraftBoard] Making pick for entry:", entryId);
  if (!draftLogic) return;
  const success = await draftLogic.makePick(entryId);
  if (!success) {
    alert("Failed to make pick. This entry may have already been taken.");
  } else {
    console.log("[DraftBoard] Pick made successfully");
  }
};

// Create a computed property for picks list
const picksList = computed(() => {
  if (!draftLogic) return [];
  const picksRef = draftLogic.picks;
  const picks = picksRef?.value ?? picksRef;
  return Array.isArray(picks) ? picks : [];
});

// Create a function that returns picks for a player (reactive)
const getPlayerPicksForDisplay = (playerId: string): Pick[] => {
  return picksList.value
    .filter((pick) => pick.player_id === playerId)
    .sort((a, b) => a.pick_number - b.pick_number);
};

// Create a function that finds an entry by ID (reactive)
const getEntryById = (entryId: string): Entry | undefined => {
  return entriesList.value.find((e) => e.id === entryId);
};

const handleContinue = () => {
  router.push(`/game/${gameId.value}/hear-me-out?password=${password.value}`);
};

onMounted(async () => {
  console.log("[DraftBoard] Component mounted, gameId:", gameId.value);
  if (draftLogic) {
    try {
      // Verify password first
      console.log("[DraftBoard] Verifying password");
      const game = await draftGameComposable.getDraftGame(gameId.value);
      if (!game) {
        alert("Game not found");
        router.push("/");
        return;
      }

      const draft = await draftComposable.getDraft(game.draft_id);
      if (!draft) {
        alert("Draft not found");
        router.push("/");
        return;
      }

      if (draft.password !== password.value) {
        alert("Invalid password");
        router.push("/");
        return;
      }

      console.log("[DraftBoard] Starting to load game");
      await draftLogic.loadGame(gameId.value);
      console.log("[DraftBoard] Game loaded successfully");

      // Debug: Log all the data
      const entriesValue = draftLogic.entries;
      const entriesUnwrapped = entriesValue?.value ?? entriesValue;
      console.log("[DraftBoard] Entries (unwrapped):", entriesUnwrapped);
      console.log(
        "[DraftBoard] Entries with image URLs:",
        entriesUnwrapped?.map((e) => ({
          name: e.name,
          image_url: e.image_url,
          hasImage: !!e.image_url,
        }))
      );

      console.log("[DraftBoard] Players:", draftLogic.players);
      console.log("[DraftBoard] Picks:", draftLogic.picks);

      // Force evaluation of computed properties
      const currentPlayerValue = draftLogic.currentPlayer;
      const currentPlayerUnwrapped =
        currentPlayerValue?.value ?? currentPlayerValue;
      console.log(
        "[DraftBoard] Current player (forced eval):",
        currentPlayerUnwrapped
      );
      console.log("[DraftBoard] Current player ref:", currentPlayerValue);

      const availableEntriesValue = draftLogic.availableEntries;
      const availableEntriesUnwrapped =
        availableEntriesValue?.value ?? availableEntriesValue;
      console.log(
        "[DraftBoard] Available entries (forced eval):",
        availableEntriesUnwrapped
      );

      // Redirect based on game status
      // currentGame is a ref - access .value property
      const currentGameRef = draftLogic.currentGame;
      const gameValue = currentGameRef?.value || currentGameRef;
      console.log("[DraftBoard] currentGame ref:", currentGameRef);
      console.log("[DraftBoard] gameValue:", gameValue);
      if (gameValue) {
        const status = gameValue.status;
        console.log("[DraftBoard] Game status:", status);
        if (status === "hear_me_out") {
          console.log("[DraftBoard] Redirecting to hear me out");
          router.push(
            `/game/${gameId.value}/hear-me-out?password=${password.value}`
          );
        } else if (status === "voting") {
          console.log("[DraftBoard] Redirecting to voting links");
          router.push(
            `/game/${gameId.value}/voting-links?password=${password.value}`
          );
        } else if (status === "complete") {
          console.log("[DraftBoard] Redirecting to results");
          router.push(
            `/game/${gameId.value}/results?password=${password.value}`
          );
        } else {
          console.log("[DraftBoard] Status is drafting, showing draft board");
        }
      } else {
        console.log("[DraftBoard] No current game found");
      }
    } catch (error) {
      console.error("[DraftBoard] Error loading game:", error);
      alert(
        `Error loading draft: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  } else {
    console.error("[DraftBoard] draftLogic is null");
  }
});
</script>

<style scoped>
.draft-board {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #213547;
}

.draft-board h1 {
  color: #213547;
  margin-bottom: 20px;
}

.draft-board h2,
.draft-board h3,
.draft-board h4 {
  color: #213547;
}

.draft-board p {
  color: #213547;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #213547;
}

.error-message {
  text-align: center;
  padding: 40px;
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  margin: 20px 0;
}

.error-message h2 {
  color: #856404;
  margin-bottom: 10px;
}

.error-message p {
  color: #856404;
  margin-bottom: 20px;
}

.error-message a {
  display: inline-block;
  padding: 10px 20px;
  background: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
}

.error-message a:hover {
  background: #35a372;
}

.draft-info {
  margin-bottom: 30px;
}

.turn-indicator {
  text-align: center;
  padding: 20px;
  background: #42b983;
  color: white;
  border-radius: 8px;
}

.draft-complete {
  text-align: center;
  padding: 20px;
  background: #28a745;
  color: white;
  border-radius: 8px;
}

.continue-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: white;
  color: #28a745;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.continue-btn:hover {
  background: #f0f0f0;
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 40px;
}

.entry-card {
  position: relative;
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.entry-card:hover:not(.taken) {
  border-color: #42b983;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.entry-card.available.current {
  border-color: #42b983;
  border-width: 3px;
  box-shadow: 0 0 10px rgba(66, 185, 131, 0.5);
}

.entry-card.taken {
  opacity: 0.5;
  cursor: not-allowed;
}

.entry-image,
.entry-placeholder {
  width: 100%;
  height: 150px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.entry-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.entry-name {
  padding: 10px;
  text-align: center;
  font-weight: bold;
  background: white;
  color: #213547;
}

.taken-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.taken-x {
  color: white;
  font-size: 60px;
  font-weight: bold;
}

.teams-preview {
  margin-top: 40px;
  padding-top: 40px;
  border-top: 2px solid #ddd;
}

.teams-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.team-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: #f9f9f9;
  color: #213547;
}

.team-item h4 {
  margin: 0 0 10px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
  color: #213547;
}

.team-entries {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.team-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px;
  background: white;
  border-radius: 4px;
  color: #213547;
}

.team-entry span {
  color: #213547;
}

.team-entry img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}
</style>
