<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.0.159:3000/api'

const email = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const emailSent = ref(false)

const handleForgotPassword = async () => {
  if (!email.value) {
    error.value = 'Please enter your email address'
    return
  }

  if (!email.value.includes('@')) {
    error.value = 'Please enter a valid email address'
    return
  }

  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const url = API_BASE_URL + '/auth/forgot-password'
    console.log('Making forgot password request to:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value
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
      successMessage.value = data.message || 'Password reset instructions sent to your email!'
      emailSent.value = true
    } else {
      // Error case
      error.value = data.message || `Server error (${response.status})`
    }

  } catch (err) {
    console.error('Forgot password error:', err)
    error.value = 'Network error. Please check your connection and try again.'
  } finally {
    loading.value = false
  }
}

const handleResendEmail = () => {
  emailSent.value = false
  successMessage.value = ''
  error.value = ''
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
          Reset Your Password
        </h1>
        <p class="text-sm xl:text-base text-white/90 leading-relaxed">
          Don't worry, it happens to the best of us. Enter your email address and we'll send you a link to reset your password.
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
            Forgot Password?
          </h2>
          <p class="text-sm text-white/60">
            We'll help you reset it
          </p>
        </div>

        <div class="w-full max-w-xs sm:max-w-sm">
          <!-- Success State -->
          <div v-if="emailSent" class="text-center space-y-6">
            <div class="space-y-1 text-center">
              <div class="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-white">Check Your Email</h2>
              <p class="text-xs text-white/60">We've sent password reset instructions to</p>
              <p class="text-sm font-medium text-blue-400">{{ email }}</p>
            </div>

            <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p class="text-xs text-blue-300 leading-relaxed">
                Didn't receive the email? Check your spam folder or wait a few minutes for it to arrive.
              </p>
            </div>

            <div class="space-y-3">
              <button
                @click="handleResendEmail"
                class="w-full py-2.5 px-4 rounded-lg font-medium text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 transition-all duration-200 text-sm"
              >
                Send Another Email
              </button>
              
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
            <form @submit.prevent="handleForgotPassword" class="space-y-5 text-white">
              <div class="space-y-1 hidden lg:block text-center">
                <h2 class="text-xl font-semibold text-white">Forgot Password</h2>
                <p class="text-xs text-white/60">Enter your email to reset your password</p>
              </div>

              <!-- Success Message -->
              <div v-if="successMessage" class="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p class="text-xs text-green-300">{{ successMessage }}</p>
              </div>

              <!-- Error Message -->
              <div v-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p class="text-xs text-red-300">{{ error }}</p>
              </div>

              <!-- Email -->
              <div>
                <label class="block text-xs font-medium mb-2 text-white/80" for="email">Email Address</label>
                <input 
                  id="email" 
                  type="email" 
                  placeholder="your.email@example.com"
                  v-model="email"
                  :disabled="loading"
                  autocomplete="email"
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
                {{ loading ? 'Sending...' : 'Send Reset Instructions' }}
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