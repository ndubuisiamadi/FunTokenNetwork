<template>
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    @click="handleBackdropClick"
  >
    <!-- Modal Content -->
    <div 
      class="bg-[#212121] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      @click.stop
    >
      <!-- Header -->
      <div class="flex justify-between items-center p-6 border-b border-white/10">
        <div class="flex items-center gap-3">
          <img 
            :src="task.platform.iconUrl" 
            :alt="task.platform.name"
            class="size-10 rounded-full object-cover"
          />
          <div>
            <h3 class="text-xl font-semibold text-white">{{ task.title || 'Complete Task' }}</h3>
            <p class="text-sm text-white/60">{{ task.platform.name }} • {{ task.target.handle }}</p>
          </div>
        </div>
        
        <button 
          @click="$emit('close')"
          class="text-white/60 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[70vh] scrollbar-hide">
        
        <!-- Task Details -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl font-bold text-[#FFCF00]">
                +{{ formatNumber(task.reward) }}
              </span>
              <span class="text-sm text-white/60">{{ task.currency || 'Gumballs' }}</span>
            </div>
            
            <span 
              :class="[
                'text-xs px-3 py-1 rounded-full font-medium',
                getTaskTypeBadge(task.type)
              ]"
            >
              {{ task.type.toUpperCase() }}
            </span>
          </div>
          
          <p class="text-white/80 mb-4">{{ task.description }}</p>
          
          <!-- Task Instructions -->
          <div v-if="task.instructions" class="bg-[#2a2a2a] rounded-lg p-4 mb-4">
            <h4 class="text-sm font-semibold text-white mb-2">Instructions:</h4>
            <ol class="space-y-2 text-sm text-white/80">
              <li 
                v-for="(instruction, index) in task.instructions" 
                :key="index"
                class="flex items-start gap-2"
              >
                <span class="bg-[#12BE32] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {{ index + 1 }}
                </span>
                <span>{{ instruction }}</span>
              </li>
            </ol>
          </div>

          <!-- Requirements Check -->
          <div v-if="task.requirements && task.requirements.length > 0" class="mb-4">
            <h4 class="text-sm font-semibold text-white mb-2">Requirements:</h4>
            <div class="space-y-2">
              <div 
                v-for="req in task.requirements"
                :key="req.id"
                class="flex items-center gap-2 text-sm"
              >
                <div 
                  :class="[
                    'w-4 h-4 rounded-full flex items-center justify-center',
                    req.met ? 'bg-green-500' : 'bg-red-500'
                  ]"
                >
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      v-if="req.met"
                      stroke-linecap="round" 
                      stroke-linejoin="round" 
                      stroke-width="2" 
                      d="M5 13l4 4L19 7"
                    />
                    <path 
                      v-else
                      stroke-linecap="round" 
                      stroke-linejoin="round" 
                      stroke-width="2" 
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <span :class="req.met ? 'text-green-400' : 'text-red-400'">
                  {{ req.description }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Task Completion Form -->
        <div v-if="showCompletionForm" class="space-y-4">
          
          <!-- Different form types based on task -->
          <div v-if="task.type === 'comment'">
            <label class="block text-sm font-medium text-white mb-2">
              Your Comment <span class="text-red-400">*</span>
            </label>
            <textarea
              v-model="submissionData.comment"
              rows="4"
              placeholder="Enter your comment here..."
              class="w-full bg-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12BE32] resize-none"
            ></textarea>
            <p class="text-xs text-white/50 mt-1">
              This should match the comment you posted on the platform
            </p>
          </div>

          <div v-if="task.type === 'share' || task.type === 'repost'">
            <label class="block text-sm font-medium text-white mb-2">
              Share URL <span class="text-red-400">*</span>
            </label>
            <input
              v-model="submissionData.shareUrl"
              type="url"
              placeholder="https://..."
              class="w-full bg-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12BE32]"
            />
          </div>

          <!-- Proof Upload -->
          <div v-if="task.requiresProof">
            <label class="block text-sm font-medium text-white mb-2">
              Upload Proof <span class="text-red-400">*</span>
            </label>
            <div 
              @click="triggerFileUpload"
              @dragover.prevent
              @drop.prevent="handleFileDrop"
              class="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-[#12BE32]/50 transition-colors"
            >
              <div v-if="!uploadedProof" class="space-y-2">
                <svg class="w-8 h-8 text-white/40 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <div class="text-sm text-white/60">
                  <p>Click to upload or drag and drop</p>
                  <p class="text-xs">Screenshots, images, or documents</p>
                </div>
              </div>
              
              <!-- Uploaded File Preview -->
              <div v-else class="space-y-2">
                <img 
                  v-if="uploadedProof.type.startsWith('image/')"
                  :src="proofPreviewUrl"
                  alt="Proof preview"
                  class="max-w-32 max-h-32 mx-auto rounded object-cover"
                />
                <div v-else class="flex items-center justify-center gap-2 text-white/80">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <span class="text-sm">{{ uploadedProof.name }}</span>
                </div>
                <button 
                  @click.stop="removeProof"
                  class="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              @change="handleFileSelect"
              class="hidden"
            />
          </div>

          <!-- Additional Notes -->
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              v-model="submissionData.notes"
              rows="3"
              placeholder="Any additional information..."
              class="w-full bg-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12BE32] resize-none"
            ></textarea>
          </div>

          <!-- Social Media Link -->
          <div v-if="task.target.url" class="bg-[#2a2a2a] rounded-lg p-4">
            <p class="text-sm text-white/60 mb-2">Complete the task on {{ task.platform.name }}:</p>
            <a 
              :href="task.target.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 text-[#12BE32] hover:text-[#0ea025] text-sm font-medium"
            >
              <span>Open {{ task.target.handle }}</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
            </a>
          </div>
        </div>

        <!-- Task Completed State -->
        <div v-else-if="task.status === 'completed'" class="text-center py-6">
          <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-white mb-2">Task Completed!</h3>
          <p class="text-white/60">You've earned {{ formatNumber(task.reward) }} {{ task.currency || 'Gumballs' }}</p>
        </div>

        <!-- Pending Verification State -->
        <div v-else-if="task.status === 'pending-verification'" class="text-center py-6">
          <div class="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-white mb-2">Verification Pending</h3>
          <p class="text-white/60">Your submission is being reviewed. You'll receive your reward once verified.</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-between items-center p-6 border-t border-white/10">
        <button 
          @click="$emit('close')"
          class="px-4 py-2 text-white/60 hover:text-white transition-colors"
        >
          Cancel
        </button>
        
        <div class="flex gap-3">
          <button 
            v-if="showCompletionForm && task.target.url"
            @click="openTaskLink"
            class="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-colors text-sm flex items-center gap-2"
          >
            <span>Open {{ task.platform.name }}</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
          </button>
          
          <button 
            v-if="showCompletionForm"
            @click="handleSubmit"
            :disabled="!canSubmit || submitting"
            :class="[
              'px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200',
              canSubmit && !submitting
                ? 'bg-[#12BE32] text-white hover:bg-[#0ea025] hover:scale-105'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            ]"
          >
            <div v-if="submitting" class="flex items-center gap-2">
              <div class="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </div>
            <span v-else>Complete Task</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'complete'])

// Reactive state
const submissionData = ref({
  comment: '',
  shareUrl: '',
  notes: ''
})

const uploadedProof = ref(null)
const proofPreviewUrl = ref('')
const submitting = ref(false)
const fileInput = ref(null)

// Computed properties
const showCompletionForm = computed(() => {
  return props.task.status === 'available' || props.task.status === 'in-progress'
})

const canSubmit = computed(() => {
  if (submitting.value) return false
  
  const task = props.task
  
  // Check required fields based on task type
  if (task.type === 'comment' && !submissionData.value.comment.trim()) {
    return false
  }
  
  if ((task.type === 'share' || task.type === 'repost') && !submissionData.value.shareUrl.trim()) {
    return false
  }
  
  if (task.requiresProof && !uploadedProof.value) {
    return false
  }
  
  // Check requirements
  if (task.requirements && task.requirements.some(req => !req.met)) {
    return false
  }
  
  return true
})

// Methods
const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (file) {
    setUploadedFile(file)
  }
}

const handleFileDrop = (e) => {
  const file = e.dataTransfer.files[0]
  if (file) {
    setUploadedFile(file)
  }
}

const setUploadedFile = (file) => {
  uploadedProof.value = file
  
  if (file.type.startsWith('image/')) {
    proofPreviewUrl.value = URL.createObjectURL(file)
  }
}

const removeProof = () => {
  if (proofPreviewUrl.value) {
    URL.revokeObjectURL(proofPreviewUrl.value)
  }
  uploadedProof.value = null
  proofPreviewUrl.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const openTaskLink = () => {
  if (props.task.target.url) {
    window.open(props.task.target.url, '_blank', 'noopener,noreferrer')
  }
}

const handleSubmit = async () => {
  if (!canSubmit.value) return
  
  submitting.value = true
  
  try {
    const formData = new FormData()
    
    // Add text data
    Object.keys(submissionData.value).forEach(key => {
      if (submissionData.value[key]) {
        formData.append(key, submissionData.value[key])
      }
    })
    
    // Add proof file if exists
    if (uploadedProof.value) {
      formData.append('proof', uploadedProof.value)
    }
    
    // Emit completion event
    emit('complete', props.task, formData)
    
  } catch (error) {
    console.error('Task submission error:', error)
  } finally {
    submitting.value = false
  }
}

const getTaskTypeBadge = (type) => {
  const badges = {
    follow: 'bg-blue-500/20 text-blue-400',
    like: 'bg-red-500/20 text-red-400',
    comment: 'bg-green-500/20 text-green-400',
    share: 'bg-purple-500/20 text-purple-400',
    subscribe: 'bg-orange-500/20 text-orange-400'
  }
  return badges[type] || 'bg-gray-500/20 text-gray-400'
}

const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num)
}

// Handle escape key
const handleEscape = (e) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = 'auto'
  
  // Cleanup blob URLs
  if (proofPreviewUrl.value) {
    URL.revokeObjectURL(proofPreviewUrl.value)
  }
})
</script>