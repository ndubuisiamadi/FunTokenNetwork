<template>
  <div class="comment-item">
    <div class="flex space-x-2 mb-3">
      <!-- Avatar -->
      <img 
        :src="getAvatarUrl(comment.user?.avatarUrl)" 
        :alt="comment.user?.username || 'User'"
        class="size-5 rounded-full object-cover flex-shrink-0"
      />
      
      <!-- Comment Content -->
      <div class="flex-1">
        <!-- User Info and Timestamp -->
        <div class="flex items-center space-x-2 mb-1">
          <h4 class="text-sm font-medium text-white">
            {{ getUserDisplayName(comment.user) }}
          </h4>
          <span class="text-xs text-white/50">{{ formatTimeAgo(comment.createdAt) }}</span>
          <span v-if="comment.updatedAt !== comment.createdAt" class="text-xs text-white/40">(edited)</span>
        </div>

        <!-- Comment Content -->
        <div v-if="!isEditing" class="mb-2">
          <p v-if="!comment.isDeleted" class="text-xs text-white whitespace-pre-wrap">{{ comment.content }}</p>
          <p v-else class="text-xs text-white/50 italic">[deleted]</p>
        </div>

        <!-- Edit Form -->
        <div v-if="isEditing" class="mb-2">
          <textarea
            v-model="editContent"
            rows="3"
            class="w-full bg-[#2a2a2a] text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#12BE32] resize-none"
            @keydown="handleEditKeydown"
          ></textarea>
          <div class="flex justify-end space-x-2 mt-2">
            <button
              @click="cancelEdit"
              class="px-3 py-1 text-xs text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              @click="saveEdit"
              :disabled="!canSaveEdit"
              class="px-3 py-1 bg-[#12BE32] text-white text-xs font-medium rounded disabled:opacity-50 hover:bg-[#0ea028] transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div v-if="!comment.isDeleted" class="flex items-center space-x-4 text-xs">
          <!-- Like Button with Optimistic Updates -->
          <button
            @click="toggleLike"
            :disabled="likingInProgress"
            :class="[
              'flex items-center space-x-1 transition-colors duration-200',
              localIsLiked ? 'text-[#00BFFF]' : 'text-white/60 hover:text-white',
              likingInProgress ? 'opacity-50' : ''
            ]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                :d="localIsLiked ? 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' : 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'"
                :fill="localIsLiked ? 'currentColor' : 'none'"
              />
            </svg>
            <span>{{ localLikesCount || 0 }}</span>
          </button>

          <!-- Reply Button -->
          <button
            v-if="!isReply"
            @click="toggleReplyForm"
            class="text-white/60 hover:text-white transition-colors"
          >
            Reply
          </button>

          <!-- Edit Button -->
          <button
            v-if="canEdit && !isEditing"
            @click="startEdit"
            class="text-white/60 hover:text-white transition-colors"
          >
            Edit
          </button>

          <!-- Delete Button -->
          <button
            v-if="canDelete"
            @click="confirmDelete"
            class="text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        </div>

        <!-- Reply Form -->
        <div v-if="showingReplyForm && !isReply" class="mt-3">
          <div class="flex space-x-2">
            <img 
              :src="getAvatarUrl(currentUser?.avatarUrl)" 
              :alt="currentUser?.username || 'User'"
              class="w-6 h-6 rounded-full object-cover flex-shrink-0"
            />
            <div class="flex-1">
              <textarea
                v-model="replyContent"
                :placeholder="`Reply to ${comment.user.username}...`"
                rows="2"
                class="w-full bg-[#2a2a2a] text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#055DFF] resize-none placeholder-white/50"
                @keydown="handleReplyKeydown"
              ></textarea>
              <div class="flex justify-end space-x-2 mt-2">
                <button
                  @click="cancelReply"
                  class="px-3 py-1 text-xs text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  @click="submitReply"
                  :disabled="!canSubmitReply || submittingReply"
                  class="px-3 py-1 bg-[#055DFF] text-white text-xs font-medium rounded disabled:opacity-50 hover:bg-[#055DFF]/50 transition-colors"
                >
                  <span v-if="submittingReply">Replying...</span>
                  <span v-else>Reply</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Replies Section -->
        <div v-if="comment.replies && comment.replies.length > 0 && comment.showingReplies" class="mt-4 space-y-3">
          <!-- Replies -->
          <CommentItem
            v-for="reply in comment.replies"
            :key="reply.id"
            :comment="reply"
            :current-user="currentUser"
            :is-reply="true"
            :loading-replies="loadingReplies"
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
          />

          <!-- Load More Replies Button -->
          <div v-if="comment.repliesCount > comment.replies.length" class="mt-3">
            <button
              @click="loadMoreReplies"
              :disabled="loadingReplies[comment.id]"
              class="text-[#12BE32] text-xs hover:text-[#0ea028] transition-colors disabled:opacity-50"
            >
              <span v-if="loadingReplies[comment.id]" class="flex items-center gap-1">
                <div class="flex space-x-1">
                  <div class="w-1 h-1 bg-[#12BE32] rounded-full animate-pulse"></div>
                  <div class="w-1 h-1 bg-[#12BE32] rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                  <div class="w-1 h-1 bg-[#12BE32] rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
                </div>
                Loading...
              </span>
              <span v-else>
                Load {{ Math.min(10, comment.repliesCount - comment.replies.length) }} more replies
              </span>
            </button>
          </div>

          <!-- Hide Replies Button -->
          <div class="mt-3">
            <button
              @click="hideReplies"
              class="text-white/60 text-xs hover:text-white transition-colors"
            >
              Hide replies
            </button>
          </div>
        </div>

        <!-- Show Replies Button (if there are replies but none shown) -->
        <div v-else-if="comment.repliesCount > 0 && !comment.showingReplies">
          <button
            @click="loadReplies"
            :disabled="loadingReplies[comment.id]"
            class="text-[#00BFFF] text-xs hover:text-[#00BFFF]/50 transition-colors disabled:opacity-50"
          >
            <span v-if="loadingReplies[comment.id]" class="flex items-center gap-1">
              <div class="flex space-x-1">
                <div class="w-1 h-1 bg-[#12BE32] rounded-full animate-pulse"></div>
                <div class="w-1 h-1 bg-[#12BE32] rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                <div class="w-1 h-1 bg-[#12BE32] rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
              </div>
              Loading...
            </span>
            <span v-else>
              Show {{ comment.repliesCount }} {{ comment.repliesCount === 1 ? 'reply' : 'replies' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getAvatarUrl } from '@/utils/avatar.js'
import { commentsAPI } from '@/services/api.js'

// Props
const props = defineProps({
  comment: {
    type: Object,
    required: true
  },
  currentUser: {
    type: Object,
    default: null
  },
  isReply: {
    type: Boolean,
    default: false
  },
  parentComment: {
    type: Object,
    default: null
  },
  loadingReplies: {
    type: Object,
    default: () => ({})
  }
})

// Emits
const emits = defineEmits(['reply', 'edit', 'delete', 'load-replies', 'load-more-replies', 'hide-replies'])

// Reactive data
const isEditing = ref(false)
const editContent = ref('')
const showingReplyForm = ref(false)
const replyContent = ref('')
const submittingReply = ref(false)

// Optimistic update state for likes (like post likes)
const localIsLiked = ref(props.comment.isLiked || false)
const localLikesCount = ref(props.comment.likesCount || 0)
const likingInProgress = ref(false)

// Watch for prop changes to sync local state
watch(() => props.comment.isLiked, (newValue) => {
  localIsLiked.value = newValue
}, { immediate: true })

watch(() => props.comment.likesCount, (newValue) => {
  localLikesCount.value = newValue
}, { immediate: true })

// Computed
const canEdit = computed(() => {
  return props.currentUser && props.comment.user.id === props.currentUser.id
})

const canDelete = computed(() => {
  return props.currentUser && props.comment.user.id === props.currentUser.id
})

const canSaveEdit = computed(() => {
  return editContent.value.trim().length > 0 && 
         editContent.value.trim() !== props.comment.content &&
         editContent.value.length <= 2000
})

const canSubmitReply = computed(() => {
  return replyContent.value.trim().length > 0 && 
         replyContent.value.length <= 2000 &&
         props.currentUser
})

// Methods
const handleEditKeydown = (event) => {
  if (event.key === 'Escape') {
    cancelEdit()
  } else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    saveEdit()
  }
}

const handleReplyKeydown = (event) => {
  if (event.key === 'Escape') {
    cancelReply()
  } else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submitReply()
  }
}

const getUserDisplayName = (user) => {
  if (user.firstName || user.lastName) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim()
  }
  return user.username
}

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)
  
  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Optimistic Like Toggle (like post likes!)
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
    // Make API call
    if (wasLiked) {
      await commentsAPI.unlikeComment(props.comment.id)
    } else {
      await commentsAPI.likeComment(props.comment.id)
    }
  } catch (error) {
    // Revert optimistic update on failure
    localIsLiked.value = wasLiked
    localLikesCount.value = previousCount
    console.error('Failed to toggle comment like:', error)
  } finally {
    likingInProgress.value = false
  }
}

const startEdit = () => {
  isEditing.value = true
  editContent.value = props.comment.content
}

const cancelEdit = () => {
  isEditing.value = false
  editContent.value = ''
}

const saveEdit = () => {
  if (canSaveEdit.value) {
    emits('edit', {
      commentId: props.comment.id,
      content: editContent.value.trim()
    })
    isEditing.value = false
  }
}

const toggleReplyForm = () => {
  showingReplyForm.value = !showingReplyForm.value
  if (showingReplyForm.value) {
    replyContent.value = ''
  }
}

const cancelReply = () => {
  showingReplyForm.value = false
  replyContent.value = ''
}

const submitReply = async () => {
  if (!canSubmitReply.value || submittingReply.value) return
  
  submittingReply.value = true
  try {
    emits('reply', {
      parentCommentId: props.comment.id,
      content: replyContent.value.trim()
    })
    showingReplyForm.value = false
    replyContent.value = ''
  } catch (error) {
    console.error('Failed to submit reply:', error)
  } finally {
    submittingReply.value = false
  }
}

const confirmDelete = () => {
  if (confirm('Are you sure you want to delete this comment?')) {
    emits('delete', props.comment.id)
  }
}

const loadReplies = () => {
  emits('load-replies', props.comment.id)
}

const loadMoreReplies = () => {
  emits('load-more-replies', props.comment.id)
}

const hideReplies = () => {
  emits('hide-replies', props.comment.id)
}
</script>

<style scoped>
/* Any additional styles if needed */
</style>