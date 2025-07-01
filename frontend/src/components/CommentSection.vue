<template>
  <div class="comment-section bg-[#1a1a1a] rounded-lg p-4">
    <!-- Comment Input -->
    <div class="mb-6">
      <div class="flex items-start space-x-2">
        <!-- <img 
          :src="getAvatarUrl(currentUser?.avatarUrl)" 
          :alt="currentUser?.username || 'User'"
          class="size-6 rounded-full object-cover flex-shrink-0"
        /> -->
        <div class="flex-1">
          <textarea
            v-model="newComment"
            placeholder="Write a comment..."
            rows="3"
            class="w-full bg-[#2a2a2a] text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#055DFF] resize-none placeholder-white/50"
            @keydown="handleKeydown"
          ></textarea>
          <!-- <div class="flex justify-between items-center mt-2">
            <span class="text-xs text-white/50">
              {{ newComment.length }}/2000 characters
            </span>
            <button
              @click="submitComment"
              :disabled="!canSubmitComment || submitting"
              class="px-4 py-1.5 bg-[#12BE32] text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0ea028] transition-colors"
            >
              <span v-if="submitting">Posting...</span>
              <span v-else>Comment</span>
            </button>
          </div> -->
        </div>
      </div>
    </div>

    <!-- Sort Options -->
    <div class="mb-4">
      <div class="flex items-center space-x-1">
        <span class="text-xs font-medium text-white">{{ totalComments }} comments</span>
        <span class="text-white/50">•</span>
        <select 
          v-model="currentSort" 
          @change="handleSortChange"
          class="bg-transparent text-xs text-white/70 hover:text-white focus:outline-none cursor-pointer"
        >
          <option value="top" class="bg-[#1a1a1a]">Top comments</option>
          <option value="newest" class="bg-[#1a1a1a]">Newest first</option>
          <option value="oldest" class="bg-[#1a1a1a]">Oldest first</option>
        </select>
      </div>
    </div>

    <!-- Comments List -->
    <div class="space-y-4">
      <!-- Loading State -->
      <div v-if="loading && comments.length === 0" class="text-center py-8">
        <div class="flex justify-center space-x-1 mb-3">
          <div class="w-2 h-2 bg-[#12BE32] rounded-full animate-pulse"></div>
          <div class="w-2 h-2 bg-[#12BE32] rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
          <div class="w-2 h-2 bg-[#12BE32] rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
        </div>
        <p class="text-white/60">Loading comments...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && comments.length === 0" class="text-center py-8">
        <p class="text-white/60">No comments yet. Be the first to comment!</p>
      </div>

      <!-- Comments -->
      <div v-else>
        <CommentItem
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :current-user="currentUser"
          :loading-replies="loadingReplies"
          @reply="handleReplyToComment"
          @edit="handleEditComment"
          @delete="handleDeleteComment"
          @load-replies="handleLoadReplies"
          @load-more-replies="handleLoadMoreReplies"
          @hide-replies="handleHideReplies"
        />
      </div>

      <!-- Load More Button -->
      <div v-if="hasMoreComments && !loading" class="text-center mt-6">
        <button
          @click="loadMoreComments"
          :disabled="loading"
          class="px-6 py-2 bg-[#2a2a2a] text-white text-sm font-medium rounded-lg hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
        >
          <span v-if="loading" class="flex items-center gap-2">
            <div class="flex space-x-1">
              <div class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              <div class="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
              <div class="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
            </div>
            Loading...
          </span>
          <span v-else>Load More Comments</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { commentsAPI } from '@/services/api.js'
import { getAvatarUrl } from '@/utils/avatar.js'
import { useAuthStore } from '@/stores/auth'
import CommentItem from './CommentItem.vue'

// Props
const props = defineProps({
  postId: {
    type: String,
    required: true
  }
})

// Stores
const authStore = useAuthStore()

// Reactive data
const comments = ref([])
const newComment = ref('')
const loading = ref(false)
const submitting = ref(false)
const currentPage = ref(1)
const hasMoreComments = ref(true)
const currentSort = ref('top')
const totalComments = ref(0)
const loadingReplies = ref({})

// Computed
const currentUser = computed(() => authStore.user)

const canSubmitComment = computed(() => {
  return newComment.value.trim().length > 0 && 
         newComment.value.length <= 2000 && 
         currentUser.value
})

// Methods
const handleKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submitComment()
  }
}

const loadComments = async (page = 1, append = false) => {
  try {
    loading.value = true
    const response = await commentsAPI.getComments(props.postId, page, 20, currentSort.value)
    
    if (append) {
      comments.value.push(...response.data.comments)
    } else {
      comments.value = response.data.comments
      totalComments.value = response.data.totalCount || 0
    }
    
    hasMoreComments.value = response.data.pagination.hasMore
    currentPage.value = page
    
  } catch (error) {
    console.error('Failed to load comments:', error)
  } finally {
    loading.value = false
  }
}

const handleSortChange = () => {
  comments.value = []
  currentPage.value = 1
  hasMoreComments.value = true
  loadComments(1, false)
}

const loadMoreComments = () => {
  if (hasMoreComments.value && !loading.value) {
    loadComments(currentPage.value + 1, true)
  }
}

const submitComment = async () => {
  if (!canSubmitComment.value || submitting.value) return

  try {
    submitting.value = true
    const response = await commentsAPI.createComment(props.postId, newComment.value.trim())
    
    if (currentSort.value === 'newest') {
      comments.value.unshift(response.data.comment)
    } else {
      loadComments(1, false)
    }
    
    newComment.value = ''
    totalComments.value += 1
    
    emits('commentAdded', response.data.comment)
    
  } catch (error) {
    console.error('Failed to create comment:', error)
  } finally {
    submitting.value = false
  }
}

const handleReplyToComment = async (replyData) => {
  try {
    const { parentCommentId, content } = replyData
    console.log('Replying to comment:', parentCommentId, 'with content:', content)
    
    const response = await commentsAPI.createComment(props.postId, content, parentCommentId)
    console.log('Reply created:', response.data)
    
    const parentComment = comments.value.find(c => c.id === parentCommentId)
    if (parentComment) {
      if (!parentComment.replies) {
        parentComment.replies = []
      }
      
      if (parentComment.showingReplies) {
        parentComment.replies.push(response.data.comment)
      }
      
      parentComment.repliesCount += 1
      console.log('Updated parent comment:', parentComment)
    } else {
      console.error('Parent comment not found:', parentCommentId)
    }
    
  } catch (error) {
    console.error('Failed to reply to comment:', error)
  }
}

const handleEditComment = async (data) => {
  try {
    const { commentId, content } = data
    console.log('Editing comment:', commentId, 'with content:', content)
    
    const response = await commentsAPI.updateComment(commentId, content)
    
    updateCommentInList(commentId, (comment) => {
      comment.content = response.data.comment.content
      comment.updatedAt = response.data.comment.updatedAt
    })
    
  } catch (error) {
    console.error('Failed to edit comment:', error)
  }
}

const handleDeleteComment = async (commentId) => {
  try {
    const response = await commentsAPI.deleteComment(commentId)
    
    if (response.data.type === 'content_replaced') {
      updateCommentInList(commentId, (comment) => {
        comment.content = '[deleted]'
        comment.updatedAt = new Date().toISOString()
        comment.isDeleted = true
      })
    } else {
      comments.value = comments.value.filter(comment => {
        if (comment.id === commentId) {
          emits('commentDeleted', comment)
          return false
        }
        if (comment.replies) {
          comment.replies = comment.replies.filter(reply => {
            if (reply.id === commentId) {
              comment.repliesCount -= 1
              return false
            }
            return true
          })
        }
        return true
      })
    }
    
  } catch (error) {
    console.error('Failed to delete comment:', error)
  }
}

const handleLoadReplies = async (commentId) => {
  console.log('🔍 handleLoadReplies called with:', commentId)
  
  try {
    loadingReplies.value[commentId] = true
    
    const response = await commentsAPI.getReplies(commentId, 1, 10)
    console.log('🔍 API Response:', response.data)
    
    const comment = comments.value.find(c => c.id === commentId)
    if (comment) {
      comment.replies = response.data.replies
      comment.showingReplies = true
      comment.hasMoreReplies = response.data.pagination.hasMore
      comment.repliesPage = 1
      console.log('🔍 Updated comment:', comment)
    }
    
  } catch (error) {
    console.error('❌ Failed to load replies:', error)
  } finally {
    loadingReplies.value[commentId] = false
  }
}

const handleLoadMoreReplies = async (commentId) => {
  try {
    loadingReplies.value[commentId] = true
    
    const comment = comments.value.find(c => c.id === commentId)
    if (!comment) return
    
    const nextPage = (comment.repliesPage || 1) + 1
    const response = await commentsAPI.getReplies(commentId, nextPage, 10)
    
    comment.replies.push(...response.data.replies)
    comment.hasMoreReplies = response.data.pagination.hasMore
    comment.repliesPage = nextPage
    
  } catch (error) {
    console.error('Failed to load more replies:', error)
  } finally {
    loadingReplies.value[commentId] = false
  }
}

const handleHideReplies = (commentId) => {
  const comment = comments.value.find(c => c.id === commentId)
  if (comment) {
    comment.showingReplies = false
    comment.replies = []
  }
}

// Utility function to update a comment in the list
const updateCommentInList = (commentId, updateFn) => {
  const updateComment = (commentsList) => {
    for (let comment of commentsList) {
      if (comment.id === commentId) {
        updateFn(comment)
        return true
      }
      if (comment.replies && updateComment(comment.replies)) {
        return true
      }
    }
    return false
  }
  
  updateComment(comments.value)
}

// Events
const emits = defineEmits(['commentAdded', 'commentDeleted'])

// Lifecycle
onMounted(() => {
  loadComments()
})

// Watch for post changes
watch(() => props.postId, () => {
  comments.value = []
  currentPage.value = 1
  hasMoreComments.value = true
  loadComments()
})
</script>

<style scoped>
/* Any additional styles if needed */
</style>