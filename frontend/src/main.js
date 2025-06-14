import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// Import stores to ensure they're registered
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import { useLeaderboardStore } from '@/stores/leaderboard'
import { useUsersStore } from '@/stores/users'
import { useCommunitiesStore } from '@/stores/communities'
import { useTasksStore } from '@/stores/tasks'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')