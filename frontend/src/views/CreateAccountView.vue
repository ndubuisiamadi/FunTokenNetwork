<script setup>
import { ref, reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  firstName: '',
  lastName: '',
  // email: '', // TEMPORARILY DISABLED
  location: '',
  birthDate: ''
})

const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  // Basic validation - firstName and lastName are now required
  if (!form.firstName.trim() || !form.lastName.trim()) {
    error.value = 'Please provide your first and last name'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Build the profile data object, only including fields with actual values
    const profileData = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim()
    }

    // Only add optional fields if they have values
    if (form.location && form.location.trim()) {
      profileData.location = form.location.trim()
    }

    if (form.birthDate && form.birthDate.trim()) {
      profileData.birthDate = form.birthDate.trim()
    }

    console.log('Submitting profile update with:', profileData)

    // Call API to update user profile
    const result = await authStore.updateProfile(profileData)

    console.log('Profile update result:', result)

    if (result.success) {
      // Profile completed, redirect to home
      router.push('/')
    } else {
      error.value = result.error || 'Failed to update profile'
      console.error('Profile update failed:', result.error)
    }
  } catch (err) {
    error.value = 'An error occurred while updating your profile'
    console.error('Profile update error:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen w-full text-white bg-[url(@/assets/auth-bg.png)] bg-top bg-cover">
    <!-- Left Panel - Hidden on mobile, shown on desktop -->
    <div class="hidden lg:block flex-1 p-8 xl:p-12 content-center bg-black/30">
      <div class="max-w-md text-white">
        <div class="mb-8">
          <img src="@/assets/logo.svg" alt="Logo" class="h-8 xl:h-10 w-auto mb-6 xl:mb-8">
        </div>
        <h1 class="text-3xl xl:text-4xl font-bold mb-4 xl:mb-6 leading-tight text-shadow-[0_4px_0px_#101010]">
          Complete Your Profile
        </h1>
        <p class="text-sm xl:text-base text-white/90 leading-relaxed">
          Just a few more details and you'll be ready to connect with your community and start your journey.
        </p>
      </div>
    </div>
    
    <!-- Right Panel - Full width on mobile, half width on desktop -->
    <div class="flex flex-col w-full lg:flex-1 min-h-screen justify-center items-center bg-black/60 backdrop-blur-xl lg:border lg:border-white/20 lg:shadow-2xl">
      <div class="w-full flex flex-col items-center justify-center px-6 sm:px-8 lg:px-6 py-12 lg:py-0">
        
        <!-- Mobile Logo - Only shown on mobile -->
        <div class="lg:hidden mb-12 text-center">
          <img src="@/assets/logo.svg" alt="Logo" class="h-6 w-auto mx-auto mb-6">
          <h2 class="text-xl sm:text-2xl font-bold mb-3 leading-tight">
            Complete Your Profile
          </h2>
          <p class="text-sm text-white/60">
            Add your details to get started
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="w-full max-w-sm space-y-5 text-white">
          <div class="space-y-1 hidden lg:block text-center">
            <h2 class="text-xl font-semibold text-white">Complete Your Profile</h2>
            <p class="text-xs text-white/60">Please provide your name to complete registration</p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p class="text-xs text-red-300">{{ error }}</p>
          </div>
          
          <!-- Name Fields -->
          <div class="flex gap-3">
            <!-- First Name -->
            <div class="flex-1">
              <label class="block text-xs font-medium mb-2 text-white/80" for="fname">First Name *</label>
              <input 
                id="fname" 
                type="text" 
                placeholder="John"
                v-model="form.firstName"
                :disabled="loading"
                autocomplete="given-name"
                required
                class="w-full text-sm px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 transition-all" 
              />
            </div>

            <!-- Last Name -->
            <div class="flex-1">
              <label class="block text-xs font-medium mb-2 text-white/80" for="lname">Last Name *</label>
              <input 
                id="lname" 
                type="text" 
                placeholder="Doe"
                v-model="form.lastName"
                :disabled="loading"
                autocomplete="family-name"
                required
                class="w-full text-sm px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 transition-all" 
              />
            </div>
          </div>

          <!-- Location (Optional) -->
          <div>
            <label class="block text-xs font-medium mb-2 text-white/80" for="location">Location (Optional)</label>
            <input 
              id="location" 
              type="text" 
              placeholder="Lagos, Nigeria"
              v-model="form.location"
              :disabled="loading"
              autocomplete="address-level1"
              class="w-full text-sm px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 transition-all" 
            />
          </div>

          <!-- Birthday (Optional) -->
          <div>
            <label class="block text-xs font-medium mb-2 text-white/80" for="birthday">Birthday (Optional)</label>
            <input 
              id="birthday" 
              type="date"
              v-model="form.birthDate"
              :disabled="loading"
              autocomplete="bday"
              class="w-full text-sm px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 transition-all" 
            />
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            :disabled="loading || !form.firstName.trim() || !form.lastName.trim()"
            :class="[
              'w-full py-2.5 px-4 rounded-lg font-medium text-white transition-all duration-200 text-sm mt-6',
              (loading || !form.firstName.trim() || !form.lastName.trim())
                ? 'bg-gray-600/50 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent'
            ]"
          >
            {{ loading ? 'Saving...' : 'Complete Profile' }}
          </button>

          <!-- Requirements Note -->
          <div class="text-center space-y-2">
            <p class="text-xs text-white/50">
              <span class="text-red-400">*</span> Required fields must be completed to continue
            </p>
          
          </div>
        </form>
      </div>
    </div>
  </div>
</template>