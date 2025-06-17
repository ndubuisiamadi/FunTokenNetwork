<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Username prefix (the part before .fun)
const usernamePrefix = ref('')

const form = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const error = ref('')

// Computed properties
const fullUsername = computed(() => {
  return usernamePrefix.value ? `${usernamePrefix.value}.fun` : ''
})

const isUsernameValid = computed(() => {
  return usernamePrefix.value.length >= 3 && /^[a-zA-Z0-9_]+$/.test(usernamePrefix.value)
})

// Methods
const updateUsername = () => {
  form.username = fullUsername.value
}

const validateUsernameInput = () => {
  // Remove any existing .fun suffix if user tries to type it
  if (usernamePrefix.value.includes('.fun')) {
    usernamePrefix.value = usernamePrefix.value.replace('.fun', '')
  }
  
  // Only allow valid characters
  usernamePrefix.value = usernamePrefix.value.replace(/[^a-zA-Z0-9_]/g, '')
  
  // Update the full username
  updateUsername()
}

const handleRegister = async () => {
  // Validation
  if (!usernamePrefix.value || !form.password || !form.confirmPassword) {
    error.value = 'Please fill in all fields'
    return
  }

  // Ensure username ends with .fun
  if (!form.username.endsWith('.fun')) {
    error.value = 'Username must end with .fun'
    return
  }

  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }

  if (form.password.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  if (usernamePrefix.value.length < 3) {
    error.value = 'Username must be at least 3 characters'
    return
  }

  if (!/^[a-zA-Z0-9_]+$/.test(usernamePrefix.value)) {
    error.value = 'Username can only contain letters, numbers, and underscores'
    return
  }

  loading.value = true
  error.value = ''

  const registrationData = {
    username: form.username, // This will be the full username with .fun
    password: form.password
  }
  
  const result = await authStore.register(registrationData)

  loading.value = false

  if (result.success) {
    // REDIRECT TO PROFILE COMPLETION
    router.push('/create-account')
  } else {
    error.value = result.error
  }
}

// Watch for changes to usernamePrefix and auto-update form.username
watch(usernamePrefix, () => {
  updateUsername()
})
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
          Join the Future of the Web
        </h1>
        <p class="text-sm xl:text-base text-white/90 leading-relaxed">
          Connect with your community in the next generation of social connection. Share moments, build relationships, and discover what matters most.
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
            Join the Future
          </h2>
          <p class="text-sm text-white/60">
            Create your account
          </p>
        </div>

        <form @submit.prevent="handleRegister" class="w-full max-w-xs sm:max-w-sm space-y-5 text-white">
          <div class="space-y-1 hidden lg:block text-center">
            <h2 class="text-xl font-semibold text-white">Create Account</h2>
            <p class="text-xs text-white/60">Fill in your details below</p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p class="text-xs text-red-300">{{ error }}</p>
          </div>

          <!-- Username with .fun suffix -->
<div>
  <label class="block text-xs font-medium mb-2 text-white/80" for="username">Username</label>
  <div class="relative">
    <input 
      id="username" 
      type="text" 
      placeholder="johndoe"
      v-model="usernamePrefix"
      @input="updateUsername"
      :disabled="loading"
      autocomplete="username"
      class="w-full text-sm px-3 py-2.5 pr-12 rounded-lg bg-black/20 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 transition-all" 
    />
    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
      <span class="text-sm text-white/60">.fun</span>
    </div>
  </div>
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
              autocomplete="new-password"
              class="w-full text-sm px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 transition-all" 
            />
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-xs font-medium mb-2 text-white/80" for="confirmPassword">Confirm Password</label>
            <input 
              id="confirmPassword" 
              type="password" 
              placeholder="********"
              v-model="form.confirmPassword"
              :disabled="loading"
              autocomplete="new-password"
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
            {{ loading ? 'Creating...' : 'Continue' }}
          </button>
        </form>

        <!-- Login Link -->
        <div class="text-center mt-6">
          <p class="text-xs text-white/50 mb-3">
            Already have an account?
          </p>
          <RouterLink 
            to="/login" 
            class="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors duration-200 underline-offset-4 hover:underline"
          >
            Login here
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>