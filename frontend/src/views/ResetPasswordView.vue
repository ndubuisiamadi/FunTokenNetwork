<script setup>
import { ref, reactive, onMounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.0.159:3000/api'

const form = reactive({
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const resetToken = ref('')
const tokenValid = ref(true)

const validatePasswords = () => {
  if (form.password.length < 6) {
    error.value = 'Password must be at least 6 characters long'
    return false
  }

  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match'
    return false
  }

  return true
}

const handleResetPassword = async () => {
  if (!validatePasswords()) {
    return
  }

  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const url = API_BASE_URL + '/auth/reset-password'
    console.log('Making reset password request to:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: resetToken.value,
        password: form.password
      })
    })

    console.log('Response status:', response.status)

    // Read the response body
    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.log('Failed to parse JSON response')
      data = { message: 'Invalid response from server' }
    }

    console.log('Response data:', data)

    if (response.ok) {
      // Success case
      successMessage.value = data.message || 'Password reset successfully!'
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } else {
      // Error case
      error.value = data.message || `Server error (${response.status})`
      
      // If token is invalid, mark it as such
      if (response.status === 400 && data.message?.includes('Invalid')) {
        tokenValid.value = false
      }
    }

  } catch (err) {
    console.error('Reset password error:', err)
    error.value = 'Network error. Please check your connection and try again.'
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  const token = route.query.token || route.params.token
  if (!token) {
    console.error('No reset token provided')
    tokenValid.value = false
    error.value = 'Invalid reset link. Please request a new password reset.'
    return
  }
  
  resetToken.value = token
  console.log('Reset token:', token)
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
          Create New Password
        </h1>
        <p class="text-sm xl:text-base text-white/90 leading-relaxed">
          Choose a strong password that you haven't used before. Make sure it's something you'll remember!
        </p>
      </div>
    </div>
    
    <!-- Right Panel - Full width on mobile, half width on desktop -->
    <div class="flex flex-col w-full lg:flex-1 min-h-screen justify-center items-center bg-black/60 backdrop-blur-xl lg:border lg:border-white/20 lg:shadow-2xl">
      <div class="w-full flex flex-col items-center justify-center px-6 sm:px-8 lg:px-6 lg:py-0">
        
        <!-- Mobile Header - Only shown on mobile -->
        <div class="lg:hidden mb-12 text-center">
          <img src="@/assets/logo.png" alt="Logo" class="size-10 mx-auto mb-6">
          <h2 class="text-xl sm:text-2xl font-bold mb-3 leading-tight">
            Reset Password
          </h2>
          <p class="text-sm text-white/60">
            Create your new password
          </p>
        </div>

        <div class="w-full max-w-xs sm:max-w-sm">
          <!-- Success State -->
          <div v-if="successMessage" class="text-center space-y-6">
            <div class="space-y-1 text-center">
              <div class="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-white">Password Reset Successfully</h2>
              <p class="text-xs text-white/60">Redirecting you to login...</p>
            </div>

            <div class="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p class="text-xs text-green-300">{{ successMessage }}</p>
            </div>
          </div>

          <!-- Invalid Token State -->
          <div v-else-if="!tokenValid" class="text-center space-y-6">
            <div class="space-y-1 text-center">
              <div class="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-white">Invalid Reset Link</h2>
              <p class="text-xs text-white/60">This password reset link is invalid or has expired</p>
            </div>

            <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p class="text-xs text-red-300 leading-relaxed">
                Please request a new password reset link. Reset links expire after 1 hour for security reasons.
              </p>
            </div>

            <div class="space-y-3">
              <RouterLink 
                to="/forgot-password"
                class="block w-full py-2.5 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 text-sm text-center"
              >
                Request New Reset Link
              </RouterLink>
              
              <RouterLink 
                to="/login"
                class="block w-full py-2.5 px-4 rounded-lg font-medium text-white/60 border border-white/20 hover:bg-white/5 transition-all duration-200 text-sm text-center"
              >
                Back to Login
              </RouterLink>
            </div>
          </div>

          <!-- Form State -->
          <div v-else>
            <form @submit.prevent="handleResetPassword" class="space-y-5 text-white">
              <div class="space-y-1 hidden lg:block text-center">
                <h2 class="text-xl font-semibold text-white">Reset Password</h2>
                <p class="text-xs text-white/60">Enter your new password below</p>
              </div>

              <!-- Error Message -->
              <div v-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p class="text-xs text-red-300">{{ error }}</p>
              </div>

              <!-- New Password -->
              <div>
                <label class="block text-xs font-medium mb-2 text-white/80" for="password">New Password</label>
                <input 
                  id="password" 
                  type="password" 
                  placeholder="Enter new password"
                  v-model="form.password"
                  :disabled="loading"
                  autocomplete="new-password"
                  class="w-full text-sm px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 transition-all" 
                />
                <p class="text-xs text-white/50 mt-1">Must be at least 6 characters long</p>
              </div>

              <!-- Confirm Password -->
              <div>
                <label class="block text-xs font-medium mb-2 text-white/80" for="confirmPassword">Confirm New Password</label>
                <input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Confirm new password"
                  v-model="form.confirmPassword"
                  :disabled="loading"
                  autocomplete="new-password"
                  class="w-full text-sm px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 transition-all" 
                />
              </div>

              <!-- Submit Button -->
              <button 
                type="submit"
                :disabled="loading || !form.password || !form.confirmPassword"
                :class="[
                  'w-full py-2.5 px-4 rounded-lg font-medium text-white transition-all duration-200 text-sm mt-6',
                  loading || !form.password || !form.confirmPassword
                    ? 'bg-gray-600/50 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent'
                ]"
              >
                {{ loading ? 'Updating Password...' : 'Update Password' }}
              </button>
            </form>

            <!-- Back to Login -->
            <div class="text-center mt-8">
              <RouterLink 
                to="/login" 
                class="text-white/60 hover:text-white text-sm transition-colors"
              >
                ← Back to Login
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>