<template>
  <div class="flex min-h-screen w-full text-white bg-[url(@/assets/auth-bg.png)] bg-top bg-cover">
    <div class="flex-1 flex items-center justify-center p-8">
      <div class="flex flex-col p-8  justify-center items-center bg-black/60 backdrop-blur-xl lg:border lg:border-white/20 lg:shadow-2xl">
        <div class="text-center mb-8">
          <img src="@/assets/logo.png" alt="Logo" class="h-10 w-auto mx-auto mb-6">
          <h2 class="text-xl sm:text-2xl font-bold mb-3 leading-tight">
            Verify Your Email
          </h2>
          <p class="text-xs text-white/60">
            We've sent a 6-digit code to<br>
            <span class="font-medium">{{ email }}</span>
          </p>
        </div>

        <form @submit.prevent="handleVerifyEmail" class="space-y-4">
          <!-- Verification Code Input -->
          <div>
            <!-- <label class="block text-sm font-medium text-white/90 mb-2">
              Verification Code
            </label> -->
            <input
              v-model="verificationCode"
              type="text"
              placeholder="Enter 6-digit code"
              maxlength="6"
              class="w-full p-4 text-center text-lg tracking-widest rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
              :class="{ 'border-red-500': error }"
              @input="onCodeInput"
            />
          </div>

          <!-- Error Message -->
          <div v-if="error" class="text-red-400 text-xs text-center">
            {{ error }}
          </div>

          <!-- Success Message -->
          <div v-if="successMessage" class="text-green-400 text-xs text-center">
            {{ successMessage }}
          </div>

          <!-- Verify Button -->
          <button
            type="submit"
            :disabled="loading || verificationCode.length !== 6"
            class="w-full py-2.5 px-4 rounded-lg font-medium text-white transition-all duration-200 text-sm"
            :class="verificationCode.length === 6 && !loading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'"
          >
            {{ loading ? 'Verifying...' : 'Verify Email' }}
          </button>

          <!-- Resend Code -->
          <div class="text-center">
            <p class="text-white/60 text-sm mb-2">
              Didn't receive the code?
            </p>
            <button
              type="button"
              @click="handleResendCode"
              :disabled="resendLoading || countdown > 0"
              class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              :class="{ 'opacity-50 cursor-not-allowed': resendLoading || countdown > 0 }"
            >
              {{ resendLoading ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code' }}
            </button>
          </div>
        </form>

        <!-- Back to Login -->
        <div class="text-center mt-8">
          <router-link 
            to="/login" 
            class="text-white/60 hover:text-white text-sm transition-colors"
          >
            ← Back to Login
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Get the correct API URL - fix the template literal issue
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.0.159:3000/api'

// Reactive data - ADD the missing successMessage
const email = ref(route.query.email || '')
const verificationCode = ref('')
const loading = ref(false)
const resendLoading = ref(false)
const error = ref('')
const successMessage = ref('') // This was missing!
const countdown = ref(0)
let countdownInterval = null

// Methods
const onCodeInput = (event) => {
  // Only allow numeric input
  const value = event.target.value.replace(/\D/g, '')
  verificationCode.value = value
  error.value = ''
}

const handleVerifyEmail = async () => {
  if (!email.value || !verificationCode.value || verificationCode.value.length !== 6) {
    error.value = 'Please enter a valid 6-digit code'
    return
  }

  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const url = API_BASE_URL + '/auth/verify-email'
    console.log('Making request to:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value,
        code: verificationCode.value
      })
    })

    console.log('Response status:', response.status)

    // Read the response body first, regardless of status
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
      successMessage.value = 'Email verified successfully!'
      
      // Store auth data
      authStore.user = data.user
      authStore.token = data.accessToken
      authStore.isAuthenticated = true
      
      // Store in localStorage
      localStorage.setItem('authToken', data.accessToken)
      localStorage.setItem('authUser', JSON.stringify(data.user))

      // Redirect to create account (profile completion) after a brief delay
      setTimeout(() => {
        router.push('/create-account')
      }, 1500)

    } else {
      // Error case - use the actual error message from backend
      error.value = data.message || `Server error (${response.status})`
    }

  } catch (err) {
    console.error('Verification error:', err)
    error.value = 'Network error. Please check your connection and try again.'
  } finally {
    loading.value = false
  }
}

const handleResendCode = async () => {
  if (!email.value) {
    error.value = 'Email address is required'
    return
  }

  resendLoading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const url = API_BASE_URL + '/auth/resend-verification'
    console.log('Making resend request to:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value
      })
    })

    console.log('Resend response status:', response.status)

    // Read the response body first, regardless of status
    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.log('Failed to parse JSON response')
      data = { message: 'Invalid response from server' }
    }

    console.log('Resend response data:', data)

    if (response.ok) {
      // Success case
      successMessage.value = data.message || 'Verification code sent successfully!'
      // Start countdown
      startCountdown()
      verificationCode.value = '' // Clear previous code
    } else {
      // Error case - use the actual error message from backend
      error.value = data.message || `Server error (${response.status})`
    }

  } catch (err) {
    console.error('Resend error:', err)
    error.value = 'Network error. Please check your connection and try again.'
  } finally {
    resendLoading.value = false
  }
}

const startCountdown = () => {
  countdown.value = 60
  countdownInterval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownInterval)
    }
  }, 1000)
}

// Lifecycle
onMounted(async () => {
  if (!email.value) {
    router.push('/signup')
    return
  }
  
  console.log('Email verification mounted for:', email.value)
  console.log('API_BASE_URL:', API_BASE_URL)
  
  // Auto-send verification code when page loads
  console.log('🔄 Auto-sending verification code on page load...')
  await handleResendCode()
  
  startCountdown() // Start countdown after sending code
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>