<!-- src/components/CommunityEditModal.vue -->
<script setup>
import { ref, computed, watch } from 'vue'
import { useCommunitiesStore } from '@/stores/communities'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  community: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

const communitiesStore = useCommunitiesStore()

// Form data
const formData = ref({
  name: '',
  description: '',
  rules: ''
})

// Form state
const errors = ref({})
const isSubmitting = computed(() => communitiesStore.updating)

// Initialize form when modal opens or community changes
watch(() => [props.show, props.community], ([show, community]) => {
  if (show && community) {
    formData.value = {
      name: community.name || '',
      description: community.description || '',
      rules: community.rules || ''
    }
    errors.value = {}
  }
}, { immediate: true })

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

// Check if form has changes
const hasChanges = computed(() => {
  if (!props.community) return false
  
  return (
    formData.value.name.trim() !== (props.community.name || '') ||
    formData.value.description.trim() !== (props.community.description || '') ||
    formData.value.rules.trim() !== (props.community.rules || '')
  )
})

// Update community
const updateCommunity = async () => {
  if (!validateForm() || !hasChanges.value) return
  
  const result = await communitiesStore.updateCommunity(props.community.id, {
    name: formData.value.name.trim(),
    description: formData.value.description.trim() || null,
    rules: formData.value.rules.trim() || null
  })
  
  if (result.success) {
    emit('updated', result.community)
    closeModal()
  }
}

// Close modal
const closeModal = () => {
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
    <div class="bg-[#212121] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-white/10">
        <h2 class="text-xl font-bold text-white">Edit Community</h2>
        <button
          @click="closeModal"
          class="text-white/70 hover:text-white transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        <form @submit.prevent="updateCommunity" class="space-y-6">
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
              placeholder="Describe your community..."
              rows="3"
              maxlength="500"
              :class="[
                'w-full px-4 py-3 bg-black/50 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 transition-colors resize-none',
                errors.description ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-[#055CFF]'
              ]"
            ></textarea>
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
            ></textarea>
            <div class="flex justify-between mt-1">
              <p v-if="errors.rules" class="text-sm text-red-400">{{ errors.rules }}</p>
              <p class="text-xs text-white/50 ml-auto">{{ rulesCount }}/1000</p>
            </div>
          </div>

          <!-- Changes Note -->
          <div v-if="!hasChanges" class="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
            <div class="flex">
              <svg class="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <div>
                <p class="text-sm text-yellow-400 font-medium">No Changes</p>
                <p class="text-xs text-yellow-300/80 mt-1">
                  Make changes to update your community.
                </p>
              </div>
            </div>
          </div>

          <!-- Error Display -->
          <div v-if="communitiesStore.error" class="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
            <div class="flex">
              <svg class="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <div>
                <p class="text-sm text-red-400 font-medium">Error</p>
                <p class="text-xs text-red-300/80 mt-1">{{ communitiesStore.error }}</p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-white/10">
        <button
          @click="closeModal"
          type="button"
          class="px-4 py-2 text-white/70 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          @click="updateCommunity"
          :disabled="isSubmitting || !formData.name.trim() || !hasChanges"
          class="px-6 py-2 bg-[#055CFF] hover:bg-[#044ACC] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {{ isSubmitting ? 'Updating...' : 'Update Community' }}
        </button>
      </div>
    </div>
  </div>
</template>