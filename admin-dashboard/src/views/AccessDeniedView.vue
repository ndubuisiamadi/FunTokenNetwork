<!-- AccessDeniedView.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
    <div class="text-center max-w-md mx-auto">
      <!-- Access Denied Icon -->
      <div class="w-24 h-24 bg-red-900/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
        </svg>
      </div>

      <!-- Error Message -->
      <h1 class="text-3xl font-bold text-white mb-4">Access Denied</h1>
      <p class="text-gray-400 mb-8 leading-relaxed">
        You don't have sufficient privileges to access this area. 
        Contact your system administrator if you believe this is an error.
      </p>

      <!-- Action Buttons -->
      <div class="space-y-3">
        <router-link 
          to="/"
          class="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          Return to Dashboard
        </router-link>
        
        <div>
          <button 
            @click="logout"
            class="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Sign out and login with different account
          </button>
        </div>
      </div>

      <!-- Support Information -->
      <div class="mt-12 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <h3 class="text-sm font-medium text-white mb-2">Need Help?</h3>
        <p class="text-xs text-gray-400">
          Contact support at <a href="mailto:admin@funnetwork.com" class="text-blue-400 hover:text-blue-300">admin@funnetwork.com</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>
