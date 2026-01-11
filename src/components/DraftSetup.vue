<template>
  <div class="draft-setup">
    <h1>Draft Setup</h1>

    <div v-if="!draft" class="create-draft">
      <h2>Create New Draft</h2>
      <form @submit.prevent="handleCreateDraft">
        <div class="form-group">
          <label for="subject">Subject:</label>
          <input
            id="subject"
            v-model="subject"
            type="text"
            required
            placeholder="e.g., Best Movies of 2023"
          />
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="Password to protect this draft"
          />
        </div>
        <button type="submit" :disabled="loading">Create Draft</button>
      </form>
    </div>

    <div v-else class="edit-draft">
      <h2>{{ draft.subject }}</h2>

      <div class="form-group">
        <label for="edit-subject">Subject:</label>
        <input
          id="edit-subject"
          v-model="editSubject"
          type="text"
          required
        />
      </div>
      <div class="form-group">
        <label for="edit-password">Password:</label>
        <input
          id="edit-password"
          v-model="editPassword"
          type="password"
          required
        />
      </div>
      <button @click="handleUpdateDraft" :disabled="loading">Update Draft</button>

      <div class="entries-section">
        <h3>Entries</h3>
        <div class="entry-form">
          <input
            v-model="newEntryName"
            type="text"
            placeholder="Entry name"
            @keyup.enter="handleAddEntry"
          />
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            style="display: none"
          />
          <button @click="() => fileInput?.click()">Choose Image</button>
          <button @click="handleAddEntry" :disabled="!newEntryName || loading">
            Add Entry
          </button>
        </div>
        <div v-if="selectedFile" class="selected-file">
          Selected: {{ selectedFile.name }}
          <button @click="selectedFile = null">Clear</button>
        </div>

        <div class="entries-list">
          <div v-for="entry in entries" :key="entry.id" class="entry-item">
            <div v-if="entry.image_url" class="entry-image">
              <img 
                :src="entry.image_url" 
                :alt="entry.name"
                @error="(e) => console.error('Image load error:', entry.image_url, e)"
                @load="() => console.log('Image loaded successfully:', entry.image_url)"
              />
            </div>
            <div class="entry-info">
              <input
                v-model="entry.name"
                @blur="handleUpdateEntry(entry)"
                type="text"
              />
            </div>
            <button @click="handleDeleteEntry(entry.id)" class="delete-btn">Delete</button>
          </div>
        </div>
      </div>

      <div class="games-section">
        <h3>Previous Games</h3>
        <div v-if="games.length === 0" class="no-games">No games yet</div>
        <div v-else class="games-list">
          <div v-for="game in games" :key="game.id" class="game-item">
            <span>Game {{ new Date(game.created_at).toLocaleDateString() }}</span>
            <span class="status">{{ game.status }}</span>
            <router-link :to="`/game/${game.id}?password=${password}`">View</router-link>
          </div>
        </div>
        <button @click="handleStartNewGame" :disabled="entries.length === 0 || loading">
          Start New Game
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDraft } from '../composables/useDraft'
import { useDraftGame } from '../composables/useDraftGame'
import type { Draft, Entry, DraftGame } from '../types'

const route = useRoute()
const router = useRouter()
const draftComposable = useDraft()
const draftGameComposable = useDraftGame()

const draft = ref<Draft | null>(null)
const entries = ref<Entry[]>([])
const games = ref<DraftGame[]>([])
const loading = ref(false)

const subject = ref('')
const password = ref('')
const editSubject = ref('')
const editPassword = ref('')
const newEntryName = ref('')
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const loadDraft = async () => {
  const draftId = route.params.id as string
  const draftPassword = (route.query.password as string) || ''

  if (!draftId) return

  loading.value = true
  try {
    const draftData = await draftComposable.getDraft(draftId)
    if (!draftData) {
      alert('Draft not found')
      return
    }

    if (draftData.password !== draftPassword) {
      alert('Invalid password')
      return
    }

    draft.value = draftData
    editSubject.value = draftData.subject
    editPassword.value = draftPassword
    password.value = draftPassword

    const entriesData = await draftComposable.getEntries(draftId)
    entries.value = entriesData

    const gamesData = await draftGameComposable.getGamesForDraft(draftId)
    games.value = gamesData
  } finally {
    loading.value = false
  }
}

const handleCreateDraft = async () => {
  loading.value = true
  try {
    const newDraft = await draftComposable.createDraft(subject.value, password.value)
    if (newDraft) {
      router.push(`/draft/${newDraft.id}?password=${password.value}`)
    }
  } finally {
    loading.value = false
  }
}

const handleUpdateDraft = async () => {
  if (!draft.value) return

  loading.value = true
  try {
    const updated = await draftComposable.updateDraft(
      draft.value.id,
      editSubject.value,
      editPassword.value
    )
    if (updated) {
      draft.value = updated
      password.value = editPassword.value
    }
  } finally {
    loading.value = false
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const handleAddEntry = async () => {
  if (!draft.value || !newEntryName.value) return

  loading.value = true
  try {
    // First create the entry without image
    const entry = await draftComposable.addEntry(draft.value.id, newEntryName.value, null)
    if (!entry) {
      return
    }

    // Then upload image if one was selected, using the entry's ID
    let imageUrl: string | null = null
    if (selectedFile.value) {
      imageUrl = await draftComposable.uploadImage(
        selectedFile.value,
        draft.value.id,
        entry.id
      )
      console.log('[handleAddEntry] Image URL after upload:', imageUrl)
      
      // Update the entry with the image URL
      if (imageUrl) {
        const updated = await draftComposable.updateEntry(entry.id, entry.name, imageUrl)
        console.log('[handleAddEntry] Updated entry:', updated)
        if (updated) {
          entries.value.push(updated)
          // Reload entries to ensure we have the latest data
          if (draft.value) {
            const refreshedEntries = await draftComposable.getEntries(draft.value.id)
            entries.value = refreshedEntries
          }
        } else {
          entries.value.push(entry)
        }
      } else {
        entries.value.push(entry)
      }
    } else {
      entries.value.push(entry)
    }

    newEntryName.value = ''
    selectedFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } finally {
    loading.value = false
  }
}

const handleUpdateEntry = async (entry: Entry) => {
  loading.value = true
  try {
    const updated = await draftComposable.updateEntry(entry.id, entry.name, entry.image_url)
    if (updated) {
      // Reload entries to ensure we have the latest data including image URLs
      if (draft.value) {
        const refreshedEntries = await draftComposable.getEntries(draft.value.id)
        entries.value = refreshedEntries
      } else {
        const index = entries.value.findIndex(e => e.id === entry.id)
        if (index !== -1) {
          entries.value[index] = updated
        }
      }
    }
  } finally {
    loading.value = false
  }
}

const handleDeleteEntry = async (entryId: string) => {
  if (!confirm('Are you sure you want to delete this entry?')) return

  loading.value = true
  try {
    const success = await draftComposable.deleteEntry(entryId)
    if (success) {
      entries.value = entries.value.filter(e => e.id !== entryId)
    }
  } finally {
    loading.value = false
  }
}

const handleStartNewGame = async () => {
  if (!draft.value) return

  loading.value = true
  try {
    const game = await draftGameComposable.createDraftGame(draft.value.id)
    if (game) {
      router.push(`/game/${game.id}/setup?password=${password.value}`)
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (route.params.id) {
    loadDraft()
  }
})
</script>

<style scoped>
.draft-setup {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  color: #213547;
}

.draft-setup h1,
.draft-setup h2,
.draft-setup h3 {
  color: #213547;
}

.draft-setup label {
  color: #213547;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 8px;
  font-size: 16px;
}

button {
  padding: 10px 20px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #35a372;
}

.entries-section,
.games-section {
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid #ddd;
}

.entry-form {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.entry-form input {
  flex: 1;
}

.selected-file {
  margin-bottom: 10px;
  padding: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.entries-list {
  margin-top: 20px;
}

.entry-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
}

.entry-image {
  width: 60px;
  height: 60px;
  overflow: hidden;
  border-radius: 4px;
}

.entry-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.entry-info {
  flex: 1;
}

.entry-info input {
  width: 100%;
  padding: 5px;
}

.delete-btn {
  background: #dc3545;
  padding: 5px 10px;
  font-size: 14px;
}

.delete-btn:hover {
  background: #c82333;
}

.games-list {
  margin-bottom: 20px;
}

.game-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
}

.status {
  text-transform: capitalize;
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 14px;
}

.no-games {
  color: #666;
  font-style: italic;
  margin-bottom: 20px;
}
</style>
