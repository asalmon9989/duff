<script setup lang="ts">
import { RouterView, useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

const isHomePage = computed(() => route.path === '/' || route.path === '')

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div id="app">
    <button 
      v-if="!isHomePage" 
      @click="goHome" 
      class="home-button"
      title="Go to Home"
    >
      🏠
    </button>
    <RouterView />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f5f5f5;
}

#app {
  min-height: 100vh;
  position: relative;
}

.home-button {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-button:hover {
  background: #35a372;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.home-button:active {
  transform: scale(0.95);
}
</style>
