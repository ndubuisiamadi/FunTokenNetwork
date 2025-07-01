<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useAuthStore } from '@/stores/auth'
import { RouterLink } from 'vue-router'
import { getAvatarUrl } from '@/utils/avatar'
import CommentSection from '@/components/CommentSection.vue'

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
const isVideoMuted = ref(true)
const showVideoControls = ref(true)
const videoControlsTimeout = ref(null)
const muteButtonClicked = ref(false)
const videoDuration = ref(0)
const currentTime = ref(0)

// Loading states
const likingInProgress = ref(false)
const savingInProgress = ref(false)

// Local state for optimistic updates
const localLikesCount = ref(props.post.likesCount || 0)
const localIsLiked = ref(props.post.isLiked || false)
const localIsSaved = ref(props.post.isSaved || false)
const localCommentsCount = ref(props.post.commentsCount || 0) // Add local comment count

const showLightbox = ref(false)
const lightboxImageUrl = ref('')

// Watch for prop changes to sync local state
watch(() => props.post.commentsCount, (newValue) => {
  localCommentsCount.value = newValue
}, { immediate: true })

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
  return `${BACKEND_URL}${mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`}`
}

// Computed properties
const userAvatarUrl = computed(() => {
  return getAvatarUrl(props.post.user?.avatarUrl)
})

const hasMedia = computed(() => {
  return props.post.mediaUrls && props.post.mediaUrls.length > 0
})

const currentMediaUrl = computed(() => {
  if (!hasMedia.value) return ''
  return getMediaUrl(props.post.mediaUrls[currentImageIndex.value])
})

const isVideo = computed(() => {
  const url = currentMediaUrl.value
  return url && (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov'))
})

const isImage = computed(() => {
  const url = currentMediaUrl.value
  return url && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp'))
})

const captionText = computed(() => {
  if (!props.post.content) return ''
  
  if (showFullCaption.value || props.post.content.length <= 150) {
    return props.post.content
  }
  
  return props.post.content.substring(0, 150) + '...'
})

const shouldShowSeeMore = computed(() => {
  return props.post.content && props.post.content.length > 150
})

// Media navigation
const nextImage = () => {
  if (hasMedia.value && currentImageIndex.value < props.post.mediaUrls.length - 1) {
    currentImageIndex.value++
  }
}

const prevImage = () => {
  if (hasMedia.value && currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

const goToImage = (index) => {
  if (hasMedia.value && index >= 0 && index < props.post.mediaUrls.length) {
    currentImageIndex.value = index
  }
}

// Video functions
const toggleVideoPlay = () => {
  const video = videoRef.value
  if (!video) return

  if (video.paused) {
    video.play()
    isVideoPlaying.value = true
  } else {
    video.pause()
    isVideoPlaying.value = false
  }
}

const handleVideoClick = (event) => {
  if (muteButtonClicked.value) {
    muteButtonClicked.value = false
    return
  }
  
  event.preventDefault()
  event.stopPropagation()
  toggleVideoPlay()
}

const toggleVideoMute = (event) => {
  event.preventDefault()
  event.stopPropagation()
  muteButtonClicked.value = true

  const video = videoRef.value
  if (!video) return

  video.muted = !video.muted
  isVideoMuted.value = video.muted
}

const showControlsTemporarily = () => {
  showVideoControls.value = true
  clearVideoControlsTimeout()
  
  videoControlsTimeout.value = setTimeout(() => {
    if (isVideoPlaying.value) {
      showVideoControls.value = false
    }
  }, 3000)
}

const clearVideoControlsTimeout = () => {
  if (videoControlsTimeout.value) {
    clearTimeout(videoControlsTimeout.value)
    videoControlsTimeout.value = null
  }
}

const updateVideoTime = () => {
  const video = videoRef.value
  if (!video) return
  
  currentTime.value = video.currentTime
  videoDuration.value = video.duration || 0
}

const formatTime = (seconds) => {
  if (isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Action handlers
const toggleLike = async () => {
  if (likingInProgress.value) return
  
  likingInProgress.value = true
  
  // Store the current state for potential rollback
  const wasLiked = localIsLiked.value
  const previousCount = localLikesCount.value
  
  // Optimistic update - immediate UI feedback
  localIsLiked.value = !localIsLiked.value
  localLikesCount.value += localIsLiked.value ? 1 : -1

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
      localLikesCount.value = previousCount
      console.error('Failed to toggle like:', result.error)
    }
  } catch (error) {
    // Revert optimistic update on error
    localIsLiked.value = wasLiked
    localLikesCount.value = previousCount
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

// Comment handlers with optimistic updates
const handleCommentAdded = (comment) => {
  // Only increment for top-level comments (not replies)
  if (!comment.parentId) {
    localCommentsCount.value += 1
  }
}

const handleCommentDeleted = (comment) => {
  // Only decrement for top-level comments (not replies)
  if (!comment.parentId) {
    localCommentsCount.value -= 1
  }
}

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
  <div class="bg-[#030712]/20 text-white mx-auto rounded-2xl w-full">
    
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
                  ? `${post.user.firstName} ${post.user.lastName}`.trim() 
                  : post.user.username }}
            </RouterLink>
          </div>
          <div class="text-xs text-white/50 flex items-center gap-1">
            <span>{{ formatTimeAgo(post.createdAt) }}</span>
            <span v-if="post.community">
              • in 
              <RouterLink 
                :to="`/community/${post.community.id}`"
                class="text-[#055CFF] hover:underline"
              >
                {{ post.community.name }}
              </RouterLink>
            </span>
          </div>
        </div>
      </div>
      
      <!-- Post Menu -->
      <div class="relative" v-if="isOwnPost">
        <button 
          @click="togglePostMenu"
          ref="postMenuRef"
          class="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
          </svg>
        </button>
        
        <!-- Dropdown Menu -->
        <div v-if="showPostMenu" class="absolute right-0 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-lg border border-white/10 z-10">
          <button @click="handlePostAction('copy')" class="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors">
            Copy link
          </button>
          <button @click="handlePostAction('save')" class="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors">
            {{ localIsSaved ? 'Unsave' : 'Save' }} post
          </button>
          <button @click="handlePostAction('delete')" class="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors text-red-400">
            Delete post
          </button>
        </div>
      </div>
    </div>

    <!-- Post Content -->
    <div v-if="post.content" class="px-4 pb-3">
      <div class="text-sm leading-relaxed whitespace-pre-wrap">
        {{ captionText }}
        <button 
          v-if="shouldShowSeeMore && !showFullCaption" 
          @click="toggleCaption"
          class="text-white/70 hover:text-white ml-1 font-medium"
        >
          See more
        </button>
        <button 
          v-if="shouldShowSeeMore && showFullCaption" 
          @click="toggleCaption"
          class="text-white/70 hover:text-white ml-1 font-medium"
        >
          See less
        </button>
      </div>
    </div>

    <!-- Media Content -->
    <div v-if="hasMedia" class="relative bg-black">
      <!-- Video -->
      <div v-if="isVideo" class="relative">
        <video
          ref="videoRef"
          :src="currentMediaUrl"
          class="w-full h-auto max-h-[600px] object-contain cursor-pointer"
          :muted="isVideoMuted"
          @click="handleVideoClick"
          @timeupdate="updateVideoTime"
          @loadedmetadata="updateVideoTime"
          @mousemove="showControlsTemporarily"
          @play="isVideoPlaying = true"
          @pause="isVideoPlaying = false"
          loop
        />
        
        <!-- Video Controls Overlay -->
        <div 
          v-if="showVideoControls || !isVideoPlaying"
          class="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300"
          @click="handleVideoClick"
        >
          <!-- Play/Pause Button -->
          <button 
            v-if="!isVideoPlaying"
            class="bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
            @click="toggleVideoPlay"
          >
            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 5v10l8-5-8-5z"/>
            </svg>
          </button>
          
          <!-- Mute Button -->
          <button 
            class="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            @click="toggleVideoMute"
          >
            <svg v-if="isVideoMuted" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.804L4.828 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.828l3.555-3.804a1 1 0 011.617-.196z"/>
              <path d="M13.293 7.293a1 1 0 011.414 0L16 8.586l1.293-1.293a1 1 0 111.414 1.414L17.414 10l1.293 1.293a1 1 0 01-1.414 1.414L16 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L14.586 10l-1.293-1.293a1 1 0 010-1.414z"/>
            </svg>
            <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.804L4.828 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.828l3.555-3.804a1 1 0 011.617-.196zM12 8a1 1 0 012 0v4a1 1 0 11-2 0V8z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Image -->
      <div v-else-if="isImage" class="relative">
        <img 
          :src="currentMediaUrl" 
          :alt="post.content || 'Post image'"
          class="w-full h-auto max-h-[600px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
          @click="openLightbox"
        />
      </div>

      <!-- Media Navigation -->
      <div v-if="post.mediaUrls.length > 1" class="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <button 
          v-if="currentImageIndex > 0"
          @click="prevImage"
          class="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors pointer-events-auto"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <button 
          v-if="currentImageIndex < post.mediaUrls.length - 1"
          @click="nextImage"
          class="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors pointer-events-auto"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <!-- Media Indicators -->
      <div v-if="post.mediaUrls.length > 1" class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        <button
          v-for="(media, index) in post.mediaUrls"
          :key="index"
          @click="goToImage(index)"
          :class="[
            'w-2 h-2 rounded-full transition-colors',
            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
          ]"
        />
      </div>
    </div>

    <!-- Post Actions and Stats -->
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
        
        <!-- <button 
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
        </button> -->
      </div>

      <!-- Likes count -->
      <div v-if="localLikesCount > 0" class="flex items-center gap-2">
        <p class="text-sm">
          <span class="font-semibold">{{ localLikesCount.toLocaleString() }}</span>
          <span class="text-white/70 ml-1">{{ localLikesCount === 1 ? 'like' : 'likes' }}</span>
        </p>
      </div>

      <!-- Comments and shares -->
      <div class="flex items-center justify-start text-xs text-white/70">
        <button @click="toggleComments" class="hover:text-white transition-colors duration-200">
          <span class="font-medium">{{ localCommentsCount || 0 }}</span> comments
        </button>
        <!-- <button class="hover:text-white transition-colors duration-200">
          <span class="font-medium">{{ post.sharesCount || 0 }}</span> shares
        </button> -->
      </div>
    </div>

    <!-- Comments Section -->
    <div v-if="showComments" class="border-t border-white/10 bg-[#1a1a1a] ">
      <CommentSection 
        :post-id="post.id"
        @comment-added="handleCommentAdded"
        @comment-deleted="handleCommentDeleted"
      />
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