<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useAuthStore } from '@/stores/auth'
import { RouterLink } from 'vue-router'
import { getAvatarUrl } from '@/utils/avatar'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const postsStore = usePostsStore()
const authStore = useAuthStore()

const currentImageIndex = ref(0)
const showFullCaption = ref(false)
const showComments = ref(false)
const showPostMenu = ref(false)
const postMenuRef = ref(null)

// Video controls state
const videoRef = ref(null)
const isVideoPlaying = ref(false)
const isVideoMuted = ref(true) // Start muted
const showVideoControls = ref(true)
const videoControlsTimeout = ref(null)
const muteButtonClicked = ref(false) // Flag to prevent container click
const videoDuration = ref(0)
const currentTime = ref(0)

// Loading states
const likingInProgress = ref(false)
const savingInProgress = ref(false)

// Local state for optimistic updates
const localLikesCount = ref(props.post.likesCount || 0)
const localIsLiked = ref(props.post.isLiked || false)
const localIsSaved = ref(props.post.isSaved || false)

const showLightbox = ref(false)
const lightboxImageUrl = ref('')

// Backend URL
const BACKEND_URL = 'http://localhost:3000'

const openLightbox = () => {
  lightboxImageUrl.value = currentMediaUrl.value
  showLightbox.value = true
}

const closeLightbox = () => {
  showLightbox.value = false
  lightboxImageUrl.value = ''
}

// Helper functions
const getMediaUrl = (mediaUrl) => {
  if (!mediaUrl) return ''
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl
  }
  if (mediaUrl.startsWith('/uploads/')) {
    return `${BACKEND_URL}${mediaUrl}`
  }
  if (!mediaUrl.startsWith('/')) {
    return `${BACKEND_URL}/uploads/${mediaUrl}`
  }
  return `${BACKEND_URL}${mediaUrl}`
}

const isMultipleMedia = computed(() => 
  props.post.mediaUrls && props.post.mediaUrls.length > 1
)

const truncatedCaption = computed(() => {
  const caption = props.post.content
  if (!caption || caption.length <= 150 || showFullCaption.value) return caption
  return caption.slice(0, 150) + '...'
})

// Helper function to determine if URL is a video
const isVideoUrl = (url) => {
  if (!url) return false
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi']
  const lowerUrl = url.toLowerCase()
  return videoExtensions.some(ext => lowerUrl.includes(ext))
}

// Helper function to determine if URL is an image
const isImageUrl = (url) => {
  if (!url) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  const lowerUrl = url.toLowerCase()
  return imageExtensions.some(ext => lowerUrl.includes(ext))
}

// Computed properties for current media
const currentMediaUrl = computed(() => {
  if (!props.post.mediaUrls || props.post.mediaUrls.length === 0) return ''
  return getMediaUrl(props.post.mediaUrls[currentImageIndex.value])
})

const currentMediaType = computed(() => {
  const url = currentMediaUrl.value
  if (isVideoUrl(url)) return 'video'
  if (isImageUrl(url)) return 'image'
  return 'unknown'
})

const userAvatarUrl = computed(() => {
  return getAvatarUrl(props.post.user.avatarUrl)
})

// Video time calculations
const remainingTime = computed(() => {
  return Math.max(0, videoDuration.value - currentTime.value)
})

const formatTime = (timeInSeconds) => {
  if (!timeInSeconds || isNaN(timeInSeconds)) return '0:00'
  
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = Math.floor(timeInSeconds % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const formattedRemainingTime = computed(() => {
  return formatTime(remainingTime.value)
})

// Video control functions
const toggleVideoPlayback = () => {
  if (!videoRef.value) return
  
  if (isVideoPlaying.value) {
    videoRef.value.pause()
  } else {
    videoRef.value.play()
  }
}

const toggleVideoMute = (event) => {
  event.stopPropagation() // Prevent bubbling
  muteButtonClicked.value = true // Set flag
  
  if (!videoRef.value) return
  
  videoRef.value.muted = !videoRef.value.muted
  isVideoMuted.value = videoRef.value.muted
  
  // Reset flag after a short delay
  setTimeout(() => {
    muteButtonClicked.value = false
  }, 50)
}

const handleVideoContainerClick = (event) => {
  if (!isVideoPlaying.value || muteButtonClicked.value) return
  
  toggleVideoPlayback()
}

const handleVideoPlay = () => {
  isVideoPlaying.value = true
  hideVideoControlsAfterDelay()
}

const handleVideoPause = () => {
  isVideoPlaying.value = false
  showVideoControls.value = true
  clearVideoControlsTimeout()
}

const handleVideoEnded = () => {
  isVideoPlaying.value = false
  showVideoControls.value = true
  clearVideoControlsTimeout()
  currentTime.value = 0 // Reset to beginning
}

const handleVideoLoadedMetadata = () => {
  if (videoRef.value) {
    videoDuration.value = videoRef.value.duration || 0
    currentTime.value = 0
    console.log('Video metadata loaded:', {
      duration: videoDuration.value,
      currentTime: currentTime.value,
      formattedRemaining: formattedRemainingTime.value
    })
  }
}

const handleVideoTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime || 0
    console.log('Time update:', {
      currentTime: currentTime.value,
      duration: videoDuration.value,
      remaining: remainingTime.value,
      formatted: formattedRemainingTime.value
    })
  }
}

const handleVideoMouseMove = () => {
  showVideoControls.value = true
  hideVideoControlsAfterDelay()
}

const hideVideoControlsAfterDelay = () => {
  clearVideoControlsTimeout()
  if (isVideoPlaying.value) {
    videoControlsTimeout.value = setTimeout(() => {
      showVideoControls.value = false
    }, 3000) // Hide after 3 seconds of inactivity
  }
}

const clearVideoControlsTimeout = () => {
  if (videoControlsTimeout.value) {
    clearTimeout(videoControlsTimeout.value)
    videoControlsTimeout.value = null
  }
}

const resetVideoState = () => {
  isVideoPlaying.value = false
  isVideoMuted.value = true
  showVideoControls.value = true
  muteButtonClicked.value = false
  videoDuration.value = 0
  currentTime.value = 0
  clearVideoControlsTimeout()
}

// Navigation functions
const nextMedia = () => {
  if (currentImageIndex.value < props.post.mediaUrls.length - 1) {
    resetVideoState()
    currentImageIndex.value++
  }
}

const prevMedia = () => {
  if (currentImageIndex.value > 0) {
    resetVideoState()
    currentImageIndex.value--
  }
}

const goToMedia = (index) => {
  resetVideoState()
  currentImageIndex.value = index
}

const toggleLike = async () => {
  if (likingInProgress.value) return

  likingInProgress.value = true
  
  // Optimistic update
  const wasLiked = localIsLiked.value
  localIsLiked.value = !wasLiked
  localLikesCount.value += wasLiked ? -1 : 1

  try {
    let result
    if (wasLiked) {
      result = await postsStore.unlikePost(props.post.id)
    } else {
      result = await postsStore.likePost(props.post.id)
    }

    if (!result.success) {
      // Revert optimistic update on failure
      localIsLiked.value = wasLiked
      localLikesCount.value += wasLiked ? 1 : -1
      console.error('Failed to toggle like:', result.error)
    }
  } catch (error) {
    // Revert optimistic update on error
    localIsLiked.value = wasLiked
    localLikesCount.value += wasLiked ? 1 : -1
    console.error('Error toggling like:', error)
  } finally {
    likingInProgress.value = false
  }
}

const toggleSave = async () => {
  if (savingInProgress.value) return
  savingInProgress.value = true
  localIsSaved.value = !localIsSaved.value
  try {
    console.log('Save functionality not yet implemented')
  } catch (error) {
    localIsSaved.value = !localIsSaved.value
    console.error('Error toggling save:', error)
  } finally {
    savingInProgress.value = false
  }
}

const toggleCaption = () => {
  showFullCaption.value = !showFullCaption.value
}

const toggleComments = () => {
  showComments.value = !showComments.value
}

const togglePostMenu = () => {
  showPostMenu.value = !showPostMenu.value
}

const handlePostAction = async (action) => {
  switch (action) {
    case 'save':
      await toggleSave()
      break
    case 'copy':
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/post/${props.post.id}`)
        console.log('Post link copied to clipboard')
      } catch (error) {
        console.error('Failed to copy link:', error)
      }
      break
    case 'delete':
      if (confirm('Are you sure you want to delete this post?')) {
        const result = await postsStore.deletePost(props.post.id)
        if (result.success) {
          console.log('Post deleted successfully')
        } else {
          console.error('Failed to delete post:', result.error)
          alert('Failed to delete post. Please try again.')
        }
      }
      break
  }
  showPostMenu.value = false
}

// Check if current user owns this post
const isOwnPost = computed(() => {
  return props.post.user.id === authStore.currentUser?.id
})

// Click outside to close menu
const handleClickOutside = (event) => {
  if (postMenuRef.value && !postMenuRef.value.contains(event.target)) {
    showPostMenu.value = false
  }
}

// Format time ago
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return 'now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
  return date.toLocaleDateString()
}

// Format date
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  clearVideoControlsTimeout()
  muteButtonClicked.value = false
})
</script>

<template>
  <div class="bg-[#212121] text-white mx-auto rounded-2xl w-full">
    
    <!-- Post Header -->
    <div class="flex items-center justify-between p-4">
      <div class="flex items-center gap-3">
    <div class="relative">
      <RouterLink :to="`/user-profile/${post.user.id}`">
        <img 
          :src="userAvatarUrl" 
          :alt="post.user.firstName || post.user.username" 
          class="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-[#055CFF] transition-all duration-200" 
        />
      </RouterLink>
    </div>
    <div>
      <div class="flex items-center gap-2">
        <RouterLink 
          :to="`/user-profile/${post.user.id}`"
          class="text-sm font-medium hover:text-[#055CFF] transition-colors duration-200 cursor-pointer"
        >
          {{ post.user.firstName && post.user.lastName 
              ? `${post.user.firstName} ${post.user.lastName}` 
              : post.user.username }}
        </RouterLink>
        <span class="text-xs text-white/40">•</span>
        <span class="text-xs text-white/50">{{ formatTimeAgo(post.createdAt) }}</span>
      </div>
      <p class="text-xs text-white/50">{{ formatDate(post.createdAt) }}</p>
    </div>
  </div>
  <div class="relative" ref="postMenuRef">
    <button 
      @click="togglePostMenu"
      class="p-2 hover:bg-white/5 rounded-full transition-colors duration-200"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01"/>
      </svg>
    </button>
        
        <!-- Dropdown Menu -->
        <div 
          v-if="showPostMenu"
          class="absolute right-0 top-10 w-48 bg-[#2a2a2a] rounded-lg shadow-lg border border-white/10 py-2 z-50"
        >
          <button 
            @click="handlePostAction('save')"
            :disabled="savingInProgress"
            class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3 disabled:opacity-50"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            {{ localIsSaved ? 'Unsave post' : 'Save post' }}
          </button>

          <button 
            @click="handlePostAction('copy')"
            class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            Copy link
          </button>

          <div v-if="isOwnPost" class="border-t border-white/10 my-2"></div>

          <template v-if="isOwnPost">
            <button 
              @click="handlePostAction('delete')"
              class="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete post
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Post Caption -->
    <div v-if="post.content" class="px-4 pb-3">
      <p class="text-sm leading-relaxed">
        {{ truncatedCaption }}
        <button 
          v-if="post.content && post.content.length > 150" 
          @click="toggleCaption"
          class="text-white/50 hover:text-white/70 ml-1 font-medium transition-colors duration-200"
        >
          {{ showFullCaption ? ' less' : ' more' }}
        </button>
      </p>
    </div>

    <!-- Post Media (Images and Videos) -->
    <div v-if="post.mediaUrls && post.mediaUrls.length > 0" class="relative group">
      
      <!-- Image Display with 1:1 Aspect Ratio -->
<div 
  v-if="currentMediaType === 'image'"
  class="w-full aspect-square bg-gray-900 cursor-pointer"
  @click="openLightbox"
>
  <img 
    :src="currentMediaUrl" 
    alt="Post content" 
    class="w-full h-full object-cover" 
    @error="(e) => console.error('Failed to load image:', e.target.src)"
  />
</div>
      
      <!-- Video Display with 1:1 Aspect Ratio and Custom Controls -->
<div 
  v-else-if="currentMediaType === 'video'"
  class="w-full aspect-square bg-black cursor-pointer relative"
  @mousemove="handleVideoMouseMove"
  @mouseleave="hideVideoControlsAfterDelay"
  @click="handleVideoContainerClick"
>
  <video 
    ref="videoRef"
    :src="currentMediaUrl"
    class="w-full h-full object-contain"
    :muted="isVideoMuted"
    preload="metadata"
    @play="handleVideoPlay"
    @pause="handleVideoPause"
    @ended="handleVideoEnded"
    @loadedmetadata="handleVideoLoadedMetadata"
    @timeupdate="handleVideoTimeUpdate"
    @error="(e) => console.error('Failed to load video:', e.target.src)"
  >
    Your browser does not support the video tag.
  </video>
  
  <!-- Remaining Time Counter (Always Visible) -->
  <div class="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded z-20">
    {{ formattedRemainingTime }}
  </div>
  
  <!-- Custom Video Controls Overlay -->
  <div 
    :class="[
      'absolute inset-0 transition-opacity duration-300',
      showVideoControls ? 'opacity-100' : 'opacity-0'
    ]"
  >
    <!-- Central Play/Pause Button -->
    <div class="absolute inset-0 flex items-center justify-center z-10">
      <button 
        @click.stop="toggleVideoPlayback"
        :class="[
          'w-16 h-16 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 hover:bg-black/80 hover:scale-110',
          isVideoPlaying ? 'opacity-0' : 'opacity-100'
        ]"
      >
        <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
    </div>
    
    <!-- Mute/Unmute Button (Bottom Right) -->
    <div class="absolute bottom-3 right-3 z-20">
      <button 
        @click.stop="toggleVideoMute"
        class="w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/80 transition-all duration-200"
      >
        <svg v-if="isVideoMuted" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2-2-2"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12l2-2-2-2"/>
        </svg>
        <svg v-else class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
        </svg>
      </button>
    </div>
  </div>
</div>
      
      <!-- Fallback for unknown media types -->
      <div 
        v-else
        class="w-full h-40 bg-gray-700 flex items-center justify-center text-white/50"
      >
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="text-sm">Unsupported media type</p>
        </div>
      </div>
      
      <!-- Navigation for multiple media -->
      <template v-if="isMultipleMedia">
        <button 
          v-if="currentImageIndex > 0"
          @click.stop="prevMedia"
          class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 p-1 rounded-full transition-all duration-200 z-10"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <button 
          v-if="currentImageIndex < post.mediaUrls.length - 1"
          @click.stop="nextMedia"
          class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 p-1 rounded-full transition-all duration-200 z-10"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <!-- Media indicators -->
        <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          <button 
            v-for="(mediaUrl, index) in post.mediaUrls" 
            :key="index"
            @click.stop="goToMedia(index)"
            :class="[
              'w-2 h-2 rounded-full transition-all duration-200',
              index === currentImageIndex 
                ? 'bg-white scale-110' 
                : 'bg-white/50 hover:bg-white/70'
            ]"
          />
        </div>
      </template>

      <!-- Gallery icon (only for multiple media) -->
<div v-if="isMultipleMedia" class="absolute top-3 left-3 z-10">
  <div class="w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  </div>
</div>
    </div>

    <!-- Engagement Section -->
    <div class="p-4 space-y-3">
      <!-- Action Buttons -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button 
            @click="toggleLike"
            :disabled="likingInProgress"
            :class="[
              'flex items-center gap-2 transition-all duration-200 group',
              localIsLiked ? 'text-red-500' : 'text-white hover:text-red-500',
              likingInProgress ? 'opacity-50 cursor-not-allowed' : ''
            ]"
          >
            <div class="relative">
              <svg 
                :class="[
                  'w-6 h-6 transition-transform duration-200',
                  localIsLiked ? 'scale-110 fill-current' : 'group-hover:scale-110',
                  localIsLiked ? 'fill-red-500' : 'fill-none stroke-current stroke-2'
                ]"
                viewBox="0 0 24 24"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <div v-if="likingInProgress" class="absolute inset-0 flex items-center justify-center">
                <div class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          </button>
          
          <button @click="toggleComments" :class="[
            'flex items-center gap-2 transition-all duration-200 group',
            showComments ? 'text-[#055CFF]' : 'text-white hover:text-[#055CFF]'
          ]">
            <svg class="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </button>
          
          <button class="flex items-center gap-2 text-white hover:text-green-500 transition-colors duration-200 group">
            <svg class="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
            </svg>
          </button>
        </div>
        
        <button 
          @click="toggleSave"
          :disabled="savingInProgress"
          :class="[
            'transition-colors duration-200',
            localIsSaved ? 'text-yellow-500' : 'text-white hover:text-yellow-500',
            savingInProgress ? 'opacity-50 cursor-not-allowed' : ''
          ]"
        >
          <svg 
            :class="[
              'w-6 h-6 transition-transform duration-200',
              localIsSaved ? 'fill-current scale-110' : 'fill-none stroke-current stroke-2'
            ]" 
            viewBox="0 0 24 24"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      <!-- Likes count -->
      <div v-if="localLikesCount > 0" class="flex items-center gap-2">
        <p class="text-sm">
          <span class="font-semibold">{{ localLikesCount.toLocaleString() }}</span>
          <span class="text-white/70 ml-1">{{ localLikesCount === 1 ? 'like' : 'likes' }}</span>
        </p>
      </div>

      <!-- Comments and shares -->
      <div class="flex items-center justify-between text-sm text-white/70">
        <button @click="toggleComments" class="hover:text-white transition-colors duration-200">
          <span class="font-medium">{{ post.commentsCount || 0 }}</span> comments
        </button>
        <button class="hover:text-white transition-colors duration-200">
          <span class="font-medium">{{ post.sharesCount || 0 }}</span> shares
        </button>
      </div>
    </div>

    <!-- Comments Section -->
    <div v-if="showComments" class="border-t border-white/10 bg-[#1a1a1a] p-4">
      <p class="text-white/60 text-sm text-center">Comments functionality coming soon...</p>
    </div>
  </div>
  <!-- Image Lightbox Modal -->
<div 
  v-if="showLightbox" 
  @click="closeLightbox"
  class="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
>
  <img 
    :src="lightboxImageUrl"
    alt="Full size image"
    class="max-w-full max-h-full object-contain"
    @click.stop
  />
  <button 
    @click="closeLightbox"
    class="absolute top-4 right-4 text-white text-3xl hover:bg-white/10 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
  >
    ×
  </button>
</div>
</template>