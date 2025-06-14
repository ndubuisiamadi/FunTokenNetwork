<script setup>
import { ref, computed } from 'vue'
import { useCommunitiesStore } from '@/stores/communities'
import { uploadAPI } from '@/services/api'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'created'])

const communitiesStore = useCommunitiesStore()

// Form data
const formData = ref({
  name: '',
  description: '',
  rules: ''
})

// File upload refs
const avatarInput = ref(null)
const bannerInput = ref(null)
const avatarFile = ref(null)
const bannerFile = ref(null)
const avatarPreview = ref('')
const bannerPreview = ref('')
const uploadingFiles = ref(false)

// Form state
const errors = ref({})
const isSubmitting = computed(() => communitiesStore.creating || uploadingFiles.value)

// Validation
const validateForm = () => {
  errors.value = {}
  
  if (!formData.value.name.trim()) {
    errors.value.name = 'Community name is required'
  } else if (formData.value.name.trim().length < 3) {
    errors.value.name = 'Community name must be at least 3 characters'
  } else if (formData.value.name.trim().length > 50) {
    errors.value.name = 'Community name must be less than 50 characters'
  }
  
  if (formData.value.description && formData.value.description.length > 500) {
    errors.value.description = 'Description must be less than 500 characters'
  }
  
  if (formData.value.rules && formData.value.rules.length > 1000) {
    errors.value.rules = 'Rules must be less than 1000 characters'
  }
  
  return Object.keys(errors.value).length === 0
}

// Character counts
const nameCount = computed(() => formData.value.name.length)
const descriptionCount = computed(() => formData.value.description.length)
const rulesCount = computed(() => formData.value.rules.length)

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
  avatarPreview.value = ''
  if (avatarInput.value) {
    avatarInput.value.value = ''
  }
}

const removeBanner = () => {
  bannerFile.value = null
  bannerPreview.value = ''
  if (bannerInput.value) {
    bannerInput.value.value = ''
  }
}

// Create community
const createCommunity = async () => {
  if (!validateForm()) return
  
  uploadingFiles.value = true
  let avatarUrl = null
  let bannerUrl = null
  
  try {
    // Upload avatar if selected
    if (avatarFile.value) {
      try {
        const uploadResponse = await uploadAPI.uploadAvatar(avatarFile.value)
        avatarUrl = uploadResponse.data.url
        console.log('Avatar uploaded:', avatarUrl)
      } catch (uploadError) {
        console.error('Failed to upload avatar:', uploadError)
        alert('Failed to upload avatar. Community will be created without avatar.')
      }
    }
    
    // Upload banner if selected (using media upload endpoint)
    if (bannerFile.value) {
      try {
        const uploadResponse = await uploadAPI.uploadMedia([bannerFile.value])
        bannerUrl = uploadResponse.data.urls[0]
        console.log('Banner uploaded:', bannerUrl)
      } catch (uploadError) {
        console.error('Failed to upload banner:', uploadError)
        alert('Failed to upload banner. Community will be created without banner.')
      }
    }
    
    uploadingFiles.value = false
    
    // Create community with uploaded images
    const result = await communitiesStore.createCommunity({
      name: formData.value.name.trim(),
      description: formData.value.description.trim() || null,
      rules: formData.value.rules.trim() || null,
      avatarUrl,
      bannerUrl
    })
    
    if (result.success) {
      emit('created', result.community)
      closeModal()
    }
  } catch (error) {
    console.error('Error creating community:', error)
    uploadingFiles.value = false
  }
}

// Close modal
const closeModal = () => {
  // Reset form
  formData.value = {
    name: '',
    description: '',
    rules: ''
  }
  errors.value = {}
  
  // Reset file uploads
  removeAvatar()
  removeBanner()
  
  emit('close')
}

// Handle backdrop click
const handleBackdropClick = (event) => {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}
</script>

<template>
  <!-- Modal Backdrop -->
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click="handleBackdropClick"
  >
    <!-- Modal Content -->
    <div class="bg-[#212121] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-white/10">
        <h2 class="text-xl font-bold text-white">Create Community</h2>
        <button
          @click="closeModal"
          class="text-white/60 hover:text-white transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="p-6 overflow-y-auto max-h-[68vh] scrollbar-hide">
        <form @submit.prevent="createCommunity" class="space-y-6">
          <!-- Banner Upload -->
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Community Banner (Optional)
            </label>
            <div class="relative">
              <div 
                v-if="bannerPreview" 
                class="relative rounded-lg overflow-hidden mb-2"
              >
                <img 
                  :src="bannerPreview" 
                  alt="Banner preview" 
                  class="w-full h-32 object-cover"
                />
                <button
                  @click="removeBanner"
                  type="button"
                  class="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                @click="triggerBannerUpload"
                type="button"
                class="w-full h-32 border-2 border-dashed border-white/20 rounded-lg hover:border-[#055CFF] transition-colors flex flex-col items-center justify-center text-white/60 hover:text-white"
              >
                <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-sm">Click to upload banner</span>
                <span class="text-xs opacity-50">Recommended: 1200x300px, max 10MB</span>
              </button>
              <input
                ref="bannerInput"
                type="file"
                accept="image/*"
                @change="handleBannerSelect"
                class="hidden"
              />
            </div>
          </div>

          <!-- Avatar Upload -->
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Community Avatar (Optional)
            </label>
            <div class="flex items-center gap-4">
              <div class="relative">
                <div 
                  v-if="avatarPreview"
                  class="relative"
                >
                  <img 
                    :src="avatarPreview" 
                    alt="Avatar preview" 
                    class="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                  />
                  <button
                    @click="removeAvatar"
                    type="button"
                    class="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition-colors"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div 
                  v-else
                  class="w-20 h-20 border-2 border-dashed border-white/20 rounded-full hover:border-[#055CFF] transition-colors flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
                  @click="triggerAvatarUpload"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
              <div>
                  <p class="text-sm text-white/70">Upload community logo</p>
                  <p class="text-xs text-white/40">Max 5MB • JPG, PNG, GIF</p>
                </div>
              <input
                ref="avatarInput"
                type="file"
                accept="image/*"
                @change="handleAvatarSelect"
                class="hidden"
              />
            </div>
          </div>

          <!-- Community Name -->
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Community Name *
            </label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="Enter community name..."
              maxlength="50"
              :class="[
                'w-full px-4 py-3 bg-black/50 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 transition-colors',
                errors.name ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-[#055CFF]'
              ]"
            />
            <div class="flex justify-between mt-1">
              <p v-if="errors.name" class="text-sm text-red-400">{{ errors.name }}</p>
              <p class="text-xs text-white/50 ml-auto">{{ nameCount }}/50</p>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Description (Optional)
            </label>
            <textarea
              v-model="formData.description"
              placeholder="Describe what your community is about..."
              rows="3"
              maxlength="500"
              :class="[
                'w-full px-4 py-3 bg-black/50 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 transition-colors resize-none',
                errors.description ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-[#055CFF]'
              ]"
            />
            <div class="flex justify-between mt-1">
              <p v-if="errors.description" class="text-sm text-red-400">{{ errors.description }}</p>
              <p class="text-xs text-white/50 ml-auto">{{ descriptionCount }}/500</p>
            </div>
          </div>

          <!-- Rules -->
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Community Rules (Optional)
            </label>
            <textarea
              v-model="formData.rules"
              placeholder="Set guidelines for your community..."
              rows="4"
              maxlength="1000"
              :class="[
                'w-full px-4 py-3 bg-black/50 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 transition-colors resize-none',
                errors.rules ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-[#055CFF]'
              ]"
            />
            <div class="flex justify-between mt-1">
              <p v-if="errors.rules" class="text-sm text-red-400">{{ errors.rules }}</p>
              <p class="text-xs text-white/50 ml-auto">{{ rulesCount }}/1000</p>
            </div>
          </div>

          <!-- Community Info -->
          <div class="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
            <div class="flex">
              <svg class="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <div>
                <p class="text-sm text-blue-400 font-medium">Community Guidelines</p>
                <p class="text-xs text-blue-300/80 mt-1">
                  You'll be the owner and can manage members and settings. Make sure to follow platform guidelines.
                </p>
              </div>
            </div>
          </div>

          <!-- Error Display -->
          <div v-if="communitiesStore.createError" class="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
            <div class="flex">
              <svg class="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <div>
                <p class="text-sm text-red-400 font-medium">Error</p>
                <p class="text-xs text-red-300/80 mt-1">{{ communitiesStore.createError }}</p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-4 border-t border-white/10">
        <button
          @click="closeModal"
          type="button"
          class="px-4 py-2 text-white/70 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          @click="createCommunity"
          :disabled="isSubmitting || !formData.name.trim()"
          class="px-6 py-2 bg-[#055CFF] hover:bg-[#044ACC] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {{ uploadingFiles ? 'Uploading...' : isSubmitting ? 'Creating...' : 'Create Community' }}
        </button>
      </div>
    </div>
  </div>
</template>