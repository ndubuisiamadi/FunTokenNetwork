<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { uploadAPI } from '@/services/api'
import { getMediaUrl } from '@/utils/media'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  firstName: '',
  lastName: '',
  bio: '',
  location: '',
  birthDate: ''
})

// File upload refs
const avatarInput = ref(null)
const bannerInput = ref(null)
const avatarFile = ref(null)
const bannerFile = ref(null)
const avatarPreview = ref('')
const bannerPreview = ref('')
const uploadingFiles = ref(false)

const loading = ref(false)
const error = ref('')
const success = ref('')

// Populate form with current user data
onMounted(() => {
  if (authStore.user) {
    form.firstName = authStore.user.firstName || ''
    form.lastName = authStore.user.lastName || ''
    form.bio = authStore.user.bio || ''
    form.location = authStore.user.location || ''
    
    // Set current images as previews
    if (authStore.user.avatarUrl) {
      avatarPreview.value = getMediaUrl(authStore.user.avatarUrl)
    }
    if (authStore.user.bannerUrl) {
      bannerPreview.value = getMediaUrl(authStore.user.bannerUrl)
    }
    
    // Format birth date for input (YYYY-MM-DD)
    if (authStore.user.birthDate) {
      const date = new Date(authStore.user.birthDate)
      form.birthDate = date.toISOString().split('T')[0]
    }
  }
})

// File upload handlers
const triggerAvatarUpload = () => {
  avatarInput.value?.click()
}

const triggerBannerUpload = () => {
  bannerInput.value?.click()
}

const handleAvatarSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file for avatar')
    return
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    alert('Avatar image must be less than 5MB')
    return
  }

  avatarFile.value = file
  
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
  
  event.target.value = ''
}

const handleBannerSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file for banner')
    return
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    alert('Banner image must be less than 10MB')
    return
  }

  bannerFile.value = file
  
  const reader = new FileReader()
  reader.onload = (e) => {
    bannerPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
  
  event.target.value = ''
}

const removeAvatar = () => {
  avatarFile.value = null
  avatarPreview.value = authStore.user?.avatarUrl ? getMediaUrl(authStore.user.avatarUrl) : ''
  if (avatarInput.value) {
    avatarInput.value.value = ''
  }
}

const removeBanner = () => {
  bannerFile.value = null
  bannerPreview.value = authStore.user?.bannerUrl ? getMediaUrl(authStore.user.bannerUrl) : ''
  if (bannerInput.value) {
    bannerInput.value.value = ''
  }
}

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  success.value = ''
  uploadingFiles.value = true

  try {
    let avatarUrl = authStore.user?.avatarUrl
    let bannerUrl = authStore.user?.bannerUrl

    // Upload avatar if new file selected
    if (avatarFile.value) {
      try {
        const uploadResponse = await uploadAPI.uploadAvatar(avatarFile.value)
        avatarUrl = uploadResponse.data.url
        console.log('Avatar uploaded:', avatarUrl)
      } catch (uploadError) {
        console.error('Failed to upload avatar:', uploadError)
        alert('Failed to upload avatar. Profile will be updated without new avatar.')
      }
    }
    
    // Upload banner if new file selected
    if (bannerFile.value) {
      try {
        const uploadResponse = await uploadAPI.uploadMedia([bannerFile.value])
        bannerUrl = uploadResponse.data.urls[0]
        console.log('Banner uploaded:', bannerUrl)
      } catch (uploadError) {
        console.error('Failed to upload banner:', uploadError)
        alert('Failed to upload banner. Profile will be updated without new banner.')
      }
    }

    uploadingFiles.value = false

    // Build the profile data object, only including fields with actual values
    const profileData = {}
    
    if (form.firstName.trim()) {
      profileData.firstName = form.firstName.trim()
    }
    
    if (form.lastName.trim()) {
      profileData.lastName = form.lastName.trim()
    }
    
    if (form.bio.trim()) {
      profileData.bio = form.bio.trim()
    }
    
    if (form.location.trim()) {
      profileData.location = form.location.trim()
    }
    
    if (form.birthDate) {
      profileData.birthDate = form.birthDate
    }

    // Include uploaded image URLs
    if (avatarUrl) {
      profileData.avatarUrl = avatarUrl
    }
    
    if (bannerUrl) {
      profileData.bannerUrl = bannerUrl
    }

    console.log('Submitting profile update with:', profileData)

    // Call API to update user profile
    const result = await authStore.updateProfile(profileData)

    console.log('Profile update result:', result)

    if (result.success) {
      success.value = 'Profile updated successfully!'
      
      // Reset file states
      avatarFile.value = null
      bannerFile.value = null
      
      // Redirect back to profile after a short delay
      setTimeout(() => {
        router.push('/profile')
      }, 1500)
    } else {
      error.value = result.error || 'Failed to update profile'
    }
  } catch (err) {
    error.value = 'An error occurred while updating your profile'
    console.error('Profile update error:', err)
  } finally {
    loading.value = false
    uploadingFiles.value = false
  }
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="h-full overflow-y-auto scrollbar-hide text-white md:p-8 ">
    <div class="max-w-2xl mx-auto">
      
      <!-- Header -->
      <!-- <div class="flex items-center gap-4 mb-8">
        <button 
          @click="goBack"
          class="p-2 rounded-full bg-[#212121] hover:bg-[#2a2a2a] transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="text-2xl font-bold">Edit Profile</h1>
      </div> -->

      <!-- Profile Banner Preview -->
      <div class="relative mb-8 bg-[#212121] rounded-2xl overflow-hidden">
        <div class="relative">
          <img 
            :src="bannerPreview || 'https://random-image-pepebigotes.vercel.app/api/random-image'" 
            class="w-full h-32 md:h-48 object-cover" 
            alt="Profile Banner"
          />
          <!-- Banner Upload Button -->
          <button
            @click="triggerBannerUpload"
            class="absolute top-2 right-2 bg-black/70 hover:bg-black/90 p-2 rounded-full transition-colors"
            title="Change banner"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
          
          <div class="absolute -bottom-8 md:-bottom-12 left-6 flex items-end gap-4">
            <div class="relative">
              <img 
                :src="avatarPreview || 'https://randomuser.me/api/portraits/men/32.jpg'" 
                class="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-[#212121] object-cover" 
                alt="Profile"
              />
              <!-- Avatar Upload Button -->
              <button
                @click="triggerAvatarUpload"
                class="absolute bottom-0 right-0 bg-[#055CFF] hover:bg-[#0550e5] p-2 rounded-full transition-colors"
                title="Change avatar"
              >
                <svg class="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="pt-12 md:pt-16 px-6 pb-6">
          <div class="text-xs text-white/60">
            {{ form.firstName || 'Your' }} {{ form.lastName || 'Name' }} - Preview of your profile
          </div>
        </div>
      </div>

      <!-- Hidden file inputs -->
      <input
        ref="avatarInput"
        type="file"
        accept="image/*"
        @change="handleAvatarSelect"
        class="hidden"
      />
      <input
        ref="bannerInput"
        type="file"
        accept="image/*"
        @change="handleBannerSelect"
        class="hidden"
      />

      <!-- Edit Form -->
      <div class="bg-[#212121] rounded-2xl p-6">
        
        <!-- Success Message -->
        <div v-if="success" class="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
          <p class="text-green-400 text-sm">{{ success }}</p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p class="text-red-400 text-sm">{{ error }}</p>
        </div>

        <!-- Upload Progress -->
        <div v-if="uploadingFiles" class="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <p class="text-blue-400 text-sm">Uploading images...</p>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          
          <!-- Profile Images Section -->
          <div>
            <!-- <h3 class="text-lg font-semibold mb-4">Profile Images</h3> -->
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Avatar Upload -->
              <!-- <div>
                <label class="block text-sm font-medium mb-2">Avatar</label>
                <div class="flex items-center gap-4">
                  <div class="relative">
                    <img 
                      :src="avatarPreview || 'https://randomuser.me/api/portraits/men/32.jpg'" 
                      alt="Avatar preview" 
                      class="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                    />
                    <button
                      v-if="avatarFile"
                      @click="removeAvatar"
                      type="button"
                      class="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition-colors"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  <div>
                    <button
                      @click="triggerAvatarUpload"
                      type="button"
                      class="px-4 py-2 bg-[#055CFF] hover:bg-[#0550e5] rounded-lg text-sm transition-colors"
                    >
                      {{ avatarFile ? 'Change Avatar' : 'Upload Avatar' }}
                    </button>
                    <p class="text-xs text-white/50 mt-1">Recommended: 400x400px, max 5MB</p>
                  </div>
                </div>
              </div> -->

              <!-- Banner Upload -->
              <!-- <div>
                <label class="block text-sm font-medium mb-2">Banner</label>
                <div class="space-y-2">
                  <div class="relative">
                    <img 
                      :src="bannerPreview || 'https://random-image-pepebigotes.vercel.app/api/random-image'" 
                      alt="Banner preview" 
                      class="w-full h-20 rounded-lg object-cover border-2 border-white/20"
                    />
                    <button
                      v-if="bannerFile"
                      @click="removeBanner"
                      type="button"
                      class="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition-colors"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  <button
                    @click="triggerBannerUpload"
                    type="button"
                    class="w-full px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-white/20 rounded-lg text-sm transition-colors"
                  >
                    {{ bannerFile ? 'Change Banner' : 'Upload Banner' }}
                  </button>
                  <p class="text-xs text-white/50">Recommended: 1200x300px, max 10MB</p>
                </div>
              </div> -->
            </div>
          </div>

          <!-- Basic Information -->
          <div>
            <h3 class="text-lg font-semibold mb-4">Basic Information</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- First Name -->
              <div>
                <label for="firstName" class="block text-sm font-medium mb-2">
                  First Name <span class="text-red-400">*</span>
                </label>
                <input
                  id="firstName"
                  v-model="form.firstName"
                  type="text"
                  required
                  class="w-full px-4 py-3 bg-[#2a2a2a] border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#055CFF] transition-colors"
                  placeholder="Enter your first name"
                />
              </div>

              <!-- Last Name -->
              <div>
                <label for="lastName" class="block text-sm font-medium mb-2">
                  Last Name <span class="text-red-400">*</span>
                </label>
                <input
                  id="lastName"
                  v-model="form.lastName"
                  type="text"
                  required
                  class="w-full px-4 py-3 bg-[#2a2a2a] border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#055CFF] transition-colors"
                  placeholder="Enter your last name"
                />
              </div>
            </div>
          </div>

          <!-- Bio -->
          <div>
            <label for="bio" class="block text-sm font-medium mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              v-model="form.bio"
              rows="3"
              maxlength="500"
              class="w-full px-4 py-3 bg-[#2a2a2a] border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#055CFF] transition-colors resize-none"
              placeholder="Tell others about yourself..."
            ></textarea>
            <div class="text-xs text-white/50 mt-1">
              {{ form.bio.length }}/500 characters
            </div>
          </div>

          <!-- Location -->
          <div>
            <label for="location" class="block text-sm font-medium mb-2">
              Location
            </label>
            <input
              id="location"
              v-model="form.location"
              type="text"
              class="w-full px-4 py-3 bg-[#2a2a2a] border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#055CFF] transition-colors"
              placeholder="City, Country"
            />
          </div>

          <!-- Birth Date -->
          <div>
            <label for="birthDate" class="block text-sm font-medium mb-2">
              Birth Date
            </label>
            <input
              id="birthDate"
              v-model="form.birthDate"
              type="date"
              class="w-full px-4 py-3 bg-[#2a2a2a] border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#055CFF] transition-colors"
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-4 pt-6">
            <button
              type="button"
              @click="goBack"
              class="flex-1 px-6 py-3 bg-[#2a2a2a] border border-white/20 rounded-lg font-medium hover:bg-[#3a3a3a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading || uploadingFiles"
              class="flex-1 px-6 py-3 bg-[#055CFF] rounded-lg font-medium hover:bg-[#0550e5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ uploadingFiles ? 'Uploading...' : loading ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>