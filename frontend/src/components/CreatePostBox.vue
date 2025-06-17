<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useAuthStore } from '@/stores/auth'
import { uploadAPI } from '@/services/api'
import { getAvatarUrl } from '@/utils/avatar'

const postsStore = usePostsStore()
const authStore = useAuthStore()

const isExpanded = ref(false)
const postText = ref('')
const uploadedMedia = ref([])
const isDragging = ref(false)
const showEmojiPicker = ref(false)
const postType = ref('text')
const linkPreview = ref(null)
const isProcessingLink = ref(false)
const error = ref('')
const isUploading = ref(false)
const uploadProgress = ref(0)

const maxCharacters = 2000
const maxFiles = 10
const maxFileSize = 50 * 1024 * 1024 // 50MB

const fileInputRef = ref(null)
const textareaRef = ref(null)
const uploadErrors = ref([])

// Character count and validation
const characterCount = computed(() => postText.value.length)
const charactersLeft = computed(() => maxCharacters - characterCount.value)
const isOverLimit = computed(() => characterCount.value > maxCharacters)
const canPost = computed(() => {
  return (postText.value.trim().length > 0 || uploadedMedia.value.length > 0) && 
         !isOverLimit.value && 
         !isUploading.value &&
         !postsStore.creating
})

// Post type options
const postTypes = [
  { id: 'text', name: 'Text Post', icon: '📝' },
  { id: 'photo', name: 'Photo', icon: '📷' },
  { id: 'video', name: 'Video', icon: '🎥' },
  { id: 'link', name: 'Link', icon: '🔗' }
]

// Popular emojis
const popularEmojis = ['😀', '😂', '🥰', '😍', '🤔', '👍', '❤️', '🔥', '💯', '🎉', '😎', '🚀']

const expandComposer = async () => {
  isExpanded.value = true
  await nextTick()
  textareaRef.value?.focus()
}

const collapseComposer = () => {
  if (!postText.value.trim() && uploadedMedia.value.length === 0) {
    isExpanded.value = false
    resetForm()
  }
}

const forceCollapseComposer = () => {
  isExpanded.value = false
  resetForm()
}

const resetForm = () => {
  postText.value = ''
  uploadedMedia.value = []
  postType.value = 'text'
  linkPreview.value = null
  showEmojiPicker.value = false
  uploadErrors.value = []
  error.value = ''
  uploadProgress.value = 0
}

const isValidFileType = (file) => {
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo']
  
  return validImageTypes.includes(file.type) || validVideoTypes.includes(file.type)
}

const getFileSizeString = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleFileUpload = async (files) => {
  uploadErrors.value = []
  
  if (uploadedMedia.value.length + files.length > maxFiles) {
    uploadErrors.value.push(`You can only upload up to ${maxFiles} files per post`)
    return
  }

  const validFiles = []
  
  // Validate files
  for (const file of Array.from(files)) {
    if (!isValidFileType(file)) {
      uploadErrors.value.push(`"${file.name}" is not a supported file type`)
      continue
    }
    
    if (file.size > maxFileSize) {
      uploadErrors.value.push(`"${file.name}" is too large (max 50MB)`)
      continue
    }
    
    validFiles.push(file)
  }

  if (validFiles.length === 0) return

  isUploading.value = true
  uploadProgress.value = 0

  try {
    console.log('Uploading files:', validFiles.map(f => f.name))
    
    // Create FormData for file upload
    const formData = new FormData()
    validFiles.forEach(file => {
      formData.append('media', file)
    })

    // Upload files to server
    const response = await uploadAPI.uploadMedia(formData, {
      onUploadProgress: (progressEvent) => {
        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
    })

    console.log('Upload successful:', response.data)

    // Add uploaded files to media array
    const uploadedUrls = response.data.urls
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const serverUrl = uploadedUrls[i]
      
      const mediaItem = {
        id: Date.now() + Math.random(),
        file,
        url: serverUrl, // Use server URL instead of blob URL
        localUrl: URL.createObjectURL(file), // Keep local URL for preview
        type: file.type.startsWith('image/') ? 'image' : 'video',
        name: file.name,
        size: getFileSizeString(file.size),
        serverUrl: serverUrl
      }
      
      // Get video duration if it's a video
      if (mediaItem.type === 'video') {
        try {
          mediaItem.duration = await getVideoDuration(file)
        } catch (err) {
          console.warn('Could not get video duration:', err)
          mediaItem.duration = '0:00'
        }
      }
      
      uploadedMedia.value.push(mediaItem)
    }

    // Update post type
    const hasVideo = uploadedMedia.value.some(m => m.type === 'video')
    postType.value = hasVideo ? 'video' : 'photo'

  } catch (error) {
    console.error('Upload failed:', error)
    uploadErrors.value.push('Failed to upload files. Please try again.')
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
  
  // Clear errors after 5 seconds
  if (uploadErrors.value.length > 0) {
    setTimeout(() => {
      uploadErrors.value = []
    }, 5000)
  }
}

const getVideoDuration = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src)
      const duration = video.duration
      if (isNaN(duration)) {
        resolve('0:00')
      } else {
        const minutes = Math.floor(duration / 60)
        const seconds = Math.floor(duration % 60)
        resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
    }
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src)
      reject(new Error('Could not load video'))
    }
    video.src = URL.createObjectURL(file)
  })
}

const triggerFileUpload = () => {
  fileInputRef.value?.click()
}

const removeMedia = (mediaId) => {
  const media = uploadedMedia.value.find(m => m.id === mediaId)
  if (media && media.localUrl) {
    URL.revokeObjectURL(media.localUrl)
  }
  
  uploadedMedia.value = uploadedMedia.value.filter(media => media.id !== mediaId)
  
  if (uploadedMedia.value.length === 0 && (postType.value === 'photo' || postType.value === 'video')) {
    postType.value = 'text'
  } else if (uploadedMedia.value.length > 0) {
    const hasVideo = uploadedMedia.value.some(m => m.type === 'video')
    postType.value = hasVideo ? 'video' : 'photo'
  }
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer.files
  handleFileUpload(files)
}

const handleDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const insertEmoji = (emoji) => {
  const textarea = textareaRef.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = postText.value.substring(0, start)
  const after = postText.value.substring(end)
  
  postText.value = before + emoji + after
  
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + emoji.length, start + emoji.length)
  })
  
  showEmojiPicker.value = false
}

const props = defineProps({
  communityId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['post-created'])

// Watch for URLs in text and generate previews (simplified for now)
watch(postText, async (newText) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urls = newText.match(urlRegex)
  
  if (urls && urls.length > 0 && !isProcessingLink.value) {
    // For now, just show a simple link preview
    // In a full production app, you'd call a URL metadata service
    linkPreview.value = {
      url: urls[0],
      title: 'Link Preview',
      description: 'This would show actual link metadata in production',
      image: null
    }
    if (uploadedMedia.value.length === 0) {
      postType.value = 'link'
    }
  } else if (!urls) {
    linkPreview.value = null
    if (postType.value === 'link') {
      if (uploadedMedia.value.length > 0) {
        const hasVideo = uploadedMedia.value.some(m => m.type === 'video')
        postType.value = hasVideo ? 'video' : 'photo'
      } else {
        postType.value = 'text'
      }
    }
  }
})

const removeLinkPreview = () => {
  linkPreview.value = null
  if (postType.value === 'link') {
    if (uploadedMedia.value.length > 0) {
      const hasVideo = uploadedMedia.value.some(m => m.type === 'video')
      postType.value = hasVideo ? 'video' : 'photo'
    } else {
      postType.value = 'text'
    }
  }
}

const createPost = async () => {
  // Validate post has content
  if (!postText.value.trim() && uploadedMedia.value.length === 0) {
    error.value = 'Please add some content to your post'
    return
  }

  if (isOverLimit.value) {
    error.value = 'Post is too long'
    return
  }

  try {
    // Prepare post data
    const postData = {
      content: postText.value.trim(),
      postType: postType.value,
      mediaUrls: uploadedMedia.value.map(media => media.serverUrl || media.url),
      linkPreview: linkPreview.value,
      ...(props.communityId && { communityId: props.communityId }) // Add this line
    }

    console.log('Creating post with data:', postData)

    // Create the post via the store
    const result = await postsStore.createPost(postData)

    if (result.success) {
      console.log('Post created successfully!')
      
      // Clean up blob URLs
      uploadedMedia.value.forEach(media => {
        if (media.localUrl) {
          URL.revokeObjectURL(media.localUrl)
        }
      })
      
      // Reset form
      resetForm()
      isExpanded.value = false
    } else {
      error.value = result.error || 'Failed to create post'
    }
  } catch (err) {
    console.error('Create post error:', err)
    error.value = 'An error occurred while creating the post'
  }
}

const handleTextareaInput = (e) => {
  // Auto-resize textarea
  e.target.style.height = 'auto'
  e.target.style.height = e.target.scrollHeight + 'px'
}

const previewMedia = (media) => {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4'
  modal.onclick = () => modal.remove()
  
  if (media.type === 'image') {
    const img = document.createElement('img')
    img.src = media.localUrl || media.url
    img.className = 'max-w-full max-h-full object-contain'
    modal.appendChild(img)
  } else if (media.type === 'video') {
    const video = document.createElement('video')
    video.src = media.localUrl || media.url
    video.controls = true
    video.className = 'max-w-full max-h-full'
    modal.appendChild(video)
  }
  
  // Add close button
  const closeBtn = document.createElement('button')
  closeBtn.innerHTML = '×'
  closeBtn.className = 'absolute top-4 right-4 text-white text-4xl hover:bg-white/10 w-12 h-12 rounded-full flex items-center justify-center'
  closeBtn.onclick = (e) => {
    e.stopPropagation()
    modal.remove()
  }
  modal.appendChild(closeBtn)
  
  document.body.appendChild(modal)
}
</script>

<template>
  <div class="bg-[#030712]/20 rounded-2xl transition-all duration-300">
    
    <!-- Collapsed State -->
    <div 
      v-if="!isExpanded"
      @click="expandComposer"
      class="flex items-center gap-3 p-4 cursor-pointer transition-colors duration-200"
    >
      <div class="size-10 rounded-full 
      bg-linear-to-tr from-[#9E03FF] to-[#082CFC] backdrop-blur-xl
       flex items-center justify-center">
        <svg class="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
      <p class="text-white/60 text-sm flex-1">What's on your mind?</p>
      <svg class="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
      </svg>
    </div>

    <!-- Expanded State -->
    <div v-else class="p-4 space-y-4">
      
      <!-- Header with Post Type -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img 
    :src="getAvatarUrl(authStore.currentUser?.avatarUrl)" 
    alt="Your avatar" 
    class="w-10 h-10 rounded-full object-cover" 
  />
          <div>
            <p class="text-white font-medium text-sm">{{ authStore.userFullName || authStore.currentUser?.username || 'User' }}</p>
            <div class="flex items-center gap-1">
              <span class="text-xs text-white/50">{{ postTypes.find(p => p.id === postType)?.icon }}</span>
              <span class="text-xs text-white/50">{{ postTypes.find(p => p.id === postType)?.name }}</span>
            </div>
          </div>
        </div>
        <button 
          @click="forceCollapseComposer"
          :disabled="isUploading || postsStore.creating"
          class="p-2 hover:bg-white/10 rounded-full transition-colors duration-200 disabled:opacity-50"
        >
          <svg class="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Error Messages -->
      <div v-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
        <p class="text-sm text-red-300">{{ error }}</p>
      </div>

      <div v-if="postsStore.createError" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
        <p class="text-sm text-red-300">{{ postsStore.createError }}</p>
      </div>

      <!-- Upload Progress -->
      <div v-if="isUploading" class="bg-[#2a2a2a] rounded-lg p-3">
        <div class="flex items-center gap-3 mb-2">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-[#055CFF]"></div>
          <span class="text-sm text-white">Uploading files...</span>
          <span class="text-xs text-white/60">{{ uploadProgress }}%</span>
        </div>
        <div class="w-full bg-white/10 rounded-full h-2">
          <div 
            class="bg-[#055CFF] h-2 rounded-full transition-all duration-300" 
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
      </div>

      <!-- Text Input -->
      <div class="relative">
        <textarea
          ref="textareaRef"
          v-model="postText"
          @input="handleTextareaInput"
          :disabled="isUploading || postsStore.creating"
          placeholder="What's happening?"
          class="w-full bg-transparent text-white placeholder-white/50 resize-none border-none outline-none text-lg min-h-[80px] max-h-[200px] disabled:opacity-50"
          style="field-sizing: content"
        />
        
        <!-- Character Counter -->
        <div class="absolute bottom-2 right-2 flex items-center gap-2">
          <div v-if="characterCount > 0" :class="[
            'text-xs',
            isOverLimit ? 'text-red-400' : charactersLeft < 50 ? 'text-yellow-400' : 'text-white/50'
          ]">
            {{ charactersLeft }}
          </div>
          <div v-if="characterCount > 0" :class="[
            'w-6 h-6 rounded-full border-2 relative',
            isOverLimit ? 'border-red-400' : charactersLeft < 50 ? 'border-yellow-400' : 'border-white/20'
          ]">
            <div 
              :class="[
                'absolute inset-0 rounded-full transition-all duration-300',
                isOverLimit ? 'bg-red-400' : charactersLeft < 50 ? 'bg-yellow-400' : 'bg-[#055CFF]'
              ]"
              :style="{ 
                transform: `rotate(${Math.min(360, (characterCount / maxCharacters) * 360)}deg)`,
                clipPath: 'polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%)'
              }"
            />
          </div>
        </div>
      </div>

      <!-- Link Preview -->
      <div v-if="linkPreview" class="border border-white/10 rounded-lg overflow-hidden">
        <div class="flex">
          <div v-if="linkPreview.image" class="w-20 h-16 bg-white/5 flex items-center justify-center">
            <svg class="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
          </div>
          <div class="flex-1 p-3">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white truncate">{{ linkPreview.title }}</p>
                <p class="text-xs text-white/60 truncate">{{ linkPreview.description }}</p>
                <p class="text-xs text-white/40 truncate">{{ linkPreview.url }}</p>
              </div>
              <button 
                @click="removeLinkPreview"
                class="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors duration-200"
              >
                <svg class="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Errors -->
      <div v-if="uploadErrors.length > 0" class="space-y-2">
        <div 
          v-for="(error, index) in uploadErrors" 
          :key="index"
          class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3"
        >
          <svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-sm text-red-300">{{ error }}</p>
          <button 
            @click="uploadErrors.splice(index, 1)"
            class="ml-auto text-red-400 hover:text-red-300 transition-colors duration-200"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Media Previews -->
      <div v-if="uploadedMedia.length > 0" class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm text-white/70">{{ uploadedMedia.length }} file{{ uploadedMedia.length !== 1 ? 's' : '' }} selected</p>
          <button 
            @click="uploadedMedia.forEach(m => m.localUrl && URL.revokeObjectURL(m.localUrl)); uploadedMedia = []; postType = 'text'"
            :disabled="isUploading"
            class="text-xs text-red-400 hover:text-red-300 transition-colors duration-200 disabled:opacity-50"
          >
            Clear all
          </button>
        </div>
        
        <div class="grid grid-cols-2 gap-3" :class="{ 'grid-cols-1': uploadedMedia.length === 1 }">
          <div v-for="media in uploadedMedia" :key="media.id" class="relative group bg-[#2a2a2a] rounded-lg overflow-hidden">
            
            <!-- Image Preview -->
            <div v-if="media.type === 'image'" class="relative">
              <img 
                :src="media.localUrl || media.url" 
                alt="Upload preview" 
                class="w-full h-40 object-cover transition-all duration-300"
              />
              <div class="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                📷 {{ media.size }}
              </div>
            </div>
            
            <!-- Video Preview -->
            <div v-else-if="media.type === 'video'" class="relative">
              <video 
                :src="media.localUrl || media.url" 
                class="w-full h-40 object-cover"
                muted
                preload="metadata"
              />
              <div class="absolute inset-0 flex items-center justify-center bg-black/30">
                <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              
              <div class="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                🎥 {{ media.duration || '0:00' }}
              </div>
              <div class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {{ media.size }}
              </div>
            </div>
            
            <!-- File Info Bar -->
            <div class="p-2 bg-[#2a2a2a]">
              <p class="text-xs text-white/90 truncate" :title="media.name">{{ media.name }}</p>
            </div>
            
            <!-- Media Controls Overlay -->
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
              
              <!-- Preview Button -->
              <button 
                @click="previewMedia(media)"
                class="p-2 bg-black/70 rounded-full hover:bg-black/90 transition-colors duration-200"
                title="Preview"
              >
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </button>
              
              <!-- Remove Button -->
              <button 
                @click="removeMedia(media.id)"
                :disabled="isUploading"
                class="p-2 bg-red-500/70 rounded-full hover:bg-red-500/90 transition-colors duration-200 disabled:opacity-50"
                title="Remove"
              >
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Drag & Drop Area -->
      <div 
        v-if="isDragging"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        class="border-2 border-dashed border-[#055CFF] rounded-lg p-8 text-center bg-[#055CFF]/10"
      >
        <div class="space-y-2">
          <p class="text-[#055CFF] font-medium">Drop images and videos here to upload</p>
          <p class="text-xs text-[#055CFF]/70">Supports: JPEG, PNG, GIF, WebP, MP4, WebM, OGG, MOV, AVI (max 50MB each)</p>
        </div>
      </div>

      <!-- Emoji Picker -->
      <div v-if="showEmojiPicker" class="bg-[#2a2a2a] rounded-lg p-3 border border-white/10">
        <div class="grid grid-cols-8 gap-2">
          <button
            v-for="emoji in popularEmojis"
            :key="emoji"
            @click="insertEmoji(emoji)"
            class="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors duration-200"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between pt-3 border-t border-white/10">
        <div class="flex items-center gap-1">
          
          <!-- Media Upload -->
          <button 
            @click="triggerFileUpload"
            :disabled="isUploading || postsStore.creating"
            class="p-2 hover:bg-white/10 rounded-full transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add photos and videos"
          >
            <svg class="w-5 h-5 text-white/70 group-hover:text-[#055CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </button>

          <!-- Emoji Picker Toggle -->
          <button 
            @click="showEmojiPicker = !showEmojiPicker"
            :disabled="isUploading || postsStore.creating"
            :class="[
              'p-2 hover:bg-white/10 rounded-full transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed',
              showEmojiPicker ? 'bg-[#055CFF]/20' : ''
            ]"
            title="Add emoji"
          >
            <svg class="w-5 h-5 text-white/70 group-hover:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>
        </div>

        <!-- Post Button -->
        <button 
          @click="createPost"
          :disabled="!canPost"
          :class="[
            'px-6 py-2 rounded-full font-medium text-sm transition-all duration-200',
            canPost
              ? 'bg-[#055CFF] text-white hover:bg-[#0550e5] shadow-lg hover:shadow-xl' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          ]"
        >
          {{ isUploading ? 'Uploading...' : postsStore.creating ? 'Posting...' : 'Post' }}
        </button>
      </div>

      <!-- Hidden File Input -->
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept="image/*,video/*"
        @change="handleFileUpload($event.target.files)"
        class="hidden"
      />
    </div>
  </div>
</template>