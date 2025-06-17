<script setup>
import { ref, reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  username: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!form.username || !form.password) {
    error.value = 'Please fill in all fields'
    return
  }

  loading.value = true
  error.value = ''

  const result = await authStore.login({
    username: form.username,
    password: form.password
  })

  loading.value = false

  if (result.success) {
    // Check if user needs to complete profile
    if (authStore.hasIncompleteProfile) {
      router.push('/create-account')
    } else {
      router.push('/')
    }
  } else {
    error.value = result.error
  }
}
</script>

<template>
  <div class="flex min-h-screen w-full text-white bg-[url(@/assets/auth-bg.png)] bg-top bg-cover">
    <!-- Left Panel - Hidden on mobile, shown on desktop -->
    <div class="hidden lg:block flex-1 p-8 xl:p-12 content-center bg-black/30">
      <div class="max-w-md text-white">
        <div class="mb-8">
          <img src="@/assets/logo.png" alt="Logo" class="h-8 xl:h-10 w-auto mb-6 xl:mb-8">
        </div>
        <h1 class="text-3xl xl:text-4xl font-bold mb-4 xl:mb-6 leading-tight text-shadow-[0_4px_0px_#101010]">
          Connect, Share, and Win
        </h1>
        <p class="text-sm xl:text-base text-white/90 leading-relaxed">
          Join your community in the next generation of social connection. Share moments, build relationships, and discover what matters most.
        </p>
      </div>
    </div>
    
    <!-- Right Panel - Full width on mobile, half width on desktop -->
    <div class="flex flex-col w-full lg:flex-1 min-h-screen justify-center items-center bg-black/60 backdrop-blur-xl lg:border lg:border-white/20 lg:shadow-2xl">
      <div class="w-full flex flex-col items-center justify-center px-6 sm:px-8 lg:px-6 lg:py-0">
        
        <!-- Mobile Logo - Only shown on mobile -->
        <div class="lg:hidden mb-12 text-center">
          <img src="@/assets/logo.png" alt="Logo" class="size-10 mx-auto mb-6">
          <h2 class="text-xl sm:text-2xl font-bold mb-3 leading-tight">
            Welcome Back
          </h2>
          <p class="text-sm text-white/60">
            Sign in to continue
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="w-full max-w-xs sm:max-w-sm space-y-5 text-white">
          <div class="space-y-1 hidden lg:block text-center">
            <h2 class="text-xl font-semibold text-white">Login</h2>
            <p class="text-xs text-white/60">Enter your credentials below</p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p class="text-xs text-red-300">{{ error }}</p>
          </div>

          <!-- Username -->
          <div>
            <label class="block text-xs font-medium mb-2 text-white/80" for="username">Username</label>
            <input 
              id="username" 
              type="text" 
              placeholder="johndoe.fun"
              v-model="form.username"
              :disabled="loading"
              autocomplete="username"
              class="w-full text-sm px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 transition-all" 
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-xs font-medium mb-2 text-white/80" for="password">Password</label>
            <input 
              id="password" 
              type="password" 
              placeholder="********"
              v-model="form.password"
              :disabled="loading"
              autocomplete="current-password"
              class="w-full text-sm px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 transition-all" 
            />
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            :disabled="loading"
            :class="[
              'w-full py-2.5 px-4 rounded-lg font-medium text-white transition-all duration-200 text-sm mt-6',
              loading 
                ? 'bg-gray-600/50 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent'
            ]"
          >
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </form>

        <!-- Sign Up Link -->
        <div class="text-center mt-6">
          <p class="text-xs text-white/50 mb-3">
            New to our community?
          </p>
          <RouterLink 
            to="/signup" 
            class="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors duration-200 underline-offset-4 hover:underline"
          >
            Create your account
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>