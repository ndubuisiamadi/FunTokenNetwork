<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import { uploadAPI } from '@/services/api'
import { 
  getMessageStatus, 
  shouldShowMessageStatus, 
  getStatusDisplay,
  MESSAGE_STATUS,
  isMessagePending,
  isMessageError
} from '@/utils/messageStatus'
import ConnectionStatus from '@/components/ConnectionStatus.vue'

const router = useRouter()
const messagesStore = useMessagesStore()
const authStore = useAuthStore()

const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['back'])

// Refs
const messagesContainer = ref(null)
const messageInputValue = ref('')
const selectedFiles = ref([])
const fileInput = ref(null)
const isAtBottom = ref(true)
const showScrollToBottom = ref(false)
const retryingMessages = ref(new Set())

// Enhanced computed properties
const currentConversation = computed(() => messagesStore.currentConversation)
const messages = computed(() => {
  if (!messagesStore.currentConversation) return []
  return messagesStore.currentMessages
})

const canSendMessage = computed(() => {
  const hasText = messageInputValue.value?.trim().length > 0
  const hasFiles = selectedFiles.value.length > 0
  const notSending = !messagesStore.sendingMessage
  const hasConversation = !!currentConversation.value
  
  return (hasText || hasFiles) && notSending && hasConversation
})

// 🔥 RELIABILITY FEATURES
const connectionStatus = computed(() => messagesStore.connectionStatus)
const failedMessages = computed(() => messagesStore.currentConversationFailedMessages)
const canLoadMore = computed(() => messagesStore.canLoadMoreMessages(currentConversation.value?.id))

// Enhanced message status display
const getMessageStatusDisplay = (message) => {
  const currentUserId = authStore.currentUser?.id
  const status = getMessageStatus(message, currentUserId)
  return status ? getStatusDisplay(status) : null
}

const shouldShowStatus = (message) => {
  const currentUserId = authStore.currentUser?.id
  return shouldShowMessageStatus(message, currentUserId)
}

// Check if message is in error state
const isMessageInError = (message) => {
  return isMessageError(message.status)
}

// Check if message is pending
const isMessageInPending = (message) => {
  return isMessagePending(message.status)
}

// Get retry info for failed message
const getRetryInfo = (message) => {
  const messageId = message.tempId || message.id
  const failureInfo = messagesStore.failedMessages.get(messageId)
  
  if (!failureInfo) return null
  
  return {
    canRetry: failureInfo.canRetry,
    retryCount: failureInfo.retryCount || 0,
    error: failureInfo.error,
    nextRetry: failureInfo.nextRetry
  }
}

// 🔥 ENHANCED SCROLL MANAGEMENT
const scrollToBottom = (smooth = false) => {
  if (!messagesContainer.value) return
  
  const container = messagesContainer.value
  requestAnimationFrame(() => {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant'
    })
    isAtBottom.value = true
    showScrollToBottom.value = false
  })
}

const handleScroll = () => {
  if (!messagesContainer.value) return
  
  const container = messagesContainer.value
  const threshold = 100
  const atBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) <= threshold
  
  isAtBottom.value = atBottom
  showScrollToBottom.value = !atBottom && messages.value.length > 0

  // Load more messages when scrolled to top
  if (container.scrollTop < 100 && canLoadMore.value) {
    loadMoreMessages()
  }
  
  // Mark as read when user scrolls to bottom
  if (atBottom && currentConversation.value) {
    messagesStore.markAsRead(currentConversation.value.id)
  }
}

// 🔥 MESSAGE PAGINATION
const loadingMore = ref(false)

const loadMoreMessages = async () => {
  if (loadingMore.value || !canLoadMore.value) return
  
  loadingMore.value = true
  const currentScrollHeight = messagesContainer.value?.scrollHeight || 0
  
  try {
    const result = await messagesStore.loadMoreMessages(currentConversation.value.id)
    
    if (result.success) {
      // Maintain scroll position after loading new messages
      await nextTick()
      if (messagesContainer.value) {
        const newScrollHeight = messagesContainer.value.scrollHeight
        const heightDiff = newScrollHeight - currentScrollHeight
        messagesContainer.value.scrollTop = heightDiff
      }
    }
  } catch (error) {
    console.error('❌ Load more messages failed:', error)
  } finally {
    loadingMore.value = false
  }
}

// 🔥 ENHANCED MESSAGE SENDING
const sendMessage = async () => {
  if (!canSendMessage.value) return

  const content = messageInputValue.value.trim()
  const mediaUrls = selectedFiles.value.map(file => file.url).filter(Boolean)

  if (!content && mediaUrls.length === 0) return

  let messageType = 'text'
  if (mediaUrls.length > 0) {
    if (mediaUrls.some(url => getFileType(url) === 'image')) messageType = 'image'
    else if (mediaUrls.some(url => getFileType(url) === 'video')) messageType = 'video'
    else if (mediaUrls.some(url => getFileType(url) === 'audio')) messageType = 'audio'
    else messageType = 'file'
  }

  const result = await messagesStore.sendMessage(content, mediaUrls, messageType)

  if (result.success) {
    messageInputValue.value = ''
    selectedFiles.value = []
    await nextTick()
    scrollToBottom(true)
  }
}

// 🔥 MESSAGE RETRY FUNCTIONALITY
const retryMessage = async (message) => {
  const messageId = message.tempId || message.id
  
  if (retryingMessages.value.has(messageId)) return
  
  retryingMessages.value.add(messageId)
  
  try {
    console.log('🔄 ChatArea: Retrying message:', messageId)
    
    const result = await messagesStore.retryFailedMessage(messageId)
    
    if (result.success) {
      console.log('✅ ChatArea: Message retry initiated')
    } else {
      console.error('❌ ChatArea: Message retry failed:', result.error)
    }
  } catch (error) {
    console.error('❌ ChatArea: Retry error:', error)
  } finally {
    // Remove from retrying set after a delay
    setTimeout(() => {
      retryingMessages.value.delete(messageId)
    }, 2000)
  }
}

const deleteFailedMessage = (message) => {
  const messageId = message.tempId || message.id
  const conversationId = currentConversation.value?.id
  
  if (!conversationId) return
  
  // Remove from messages array
  const messages = messagesStore.messages[conversationId] || []
  const index = messages.findIndex(m => (m.tempId || m.id) === messageId)
  
  if (index !== -1) {
    messages.splice(index, 1)
  }
  
  // Clean up failed message tracking
  messagesStore.failedMessages.delete(messageId)
}

// File handling (existing)
const handleKeyPress = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  for (const file of files) {
    if (selectedFiles.value.length >= 10) {
      alert('Maximum 10 files allowed')
      break
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await uploadAPI.uploadFile(formData)
      
      selectedFiles.value.push({
        name: file.name,
        size: file.size,
        type: file.type,
        url: response.data.url,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      })
    } catch (error) {
      console.error('Failed to upload file:', error)
      alert(`Failed to upload ${file.name}`)
    }
  }
  
  event.target.value = ''
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

// Helper functions (existing)
const shouldShowDateSeparator = (message, previousMessage) => {
  if (!previousMessage) return true
  
  const currentDate = new Date(message.createdAt || message.timestamp)
  const previousDate = new Date(previousMessage.createdAt || previousMessage.timestamp)
  
  return currentDate.toDateString() !== previousDate.toDateString()
}

const getFileType = (url) => {
  const ext = url.split('.').pop().toLowerCase()
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return 'image'
  } else if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) {
    return 'video'
  } else if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext)) {
    return 'audio'
  } else {
    return 'file'
  }
}

const getFileName = (url) => {
  return url.split('/').pop()
}

const downloadFile = (url, filename) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Conversation helper functions (existing)
const getConversationName = (conversation) => {
  if (conversation.isGroup) {
    return conversation.name || 'Group Chat'
  }
  
  const other = conversation.otherParticipant
  if (!other) return 'Unknown User'
  
  return `${other.firstName || ''} ${other.lastName || ''}`.trim() || other.username || 'Unknown User'
}

const getConversationAvatar = (conversation) => {
  if (conversation.isGroup) {
    return conversation.avatarUrl || 
           'https://ui-avatars.com/api/?name=' + encodeURIComponent(conversation.name || 'Group') + '&background=055CFF&color=fff&size=40'
  }
  
  return conversation.otherParticipant?.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'
}

const isOnline = (conversation) => {
  if (conversation.isGroup) return false
  if (!conversation.otherParticipant?.id) return false
  
  return messagesStore.isUserOnline(conversation.otherParticipant.id)
}

const getConversationStatus = (conversation) => {
  if (conversation.isGroup) {
    const memberCount = conversation.participants?.length || 0
    return `${memberCount} members`
  }
  
  const userIsOnline = isOnline(conversation)
  
  return userIsOnline 
    ? 'Online' 
    : `Last seen ${formatLastSeen(conversation.otherParticipant?.lastSeen)}`
}

const formatLastSeen = (date) => {
  try {
    if (!date) return 'Unknown'
    
    const now = new Date()
    const lastSeen = new Date(date)
    
    if (isNaN(lastSeen.getTime())) {
      return 'Unknown'
    }
    
    const diffInMinutes = Math.floor((now - lastSeen) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return lastSeen.toLocaleDateString()
  } catch (error) {
    console.error('Error formatting last seen:', error, 'Date:', date)
    return 'Unknown'
  }
}

// Time formatting functions (existing)
const formatMessageTime = (date) => {
  try {
    if (!date) return ''
    
    const messageDate = new Date(date)
    
    if (isNaN(messageDate.getTime())) {
      return 'Unknown Time'
    }
    
    return messageDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    console.error('Error formatting message time:', error, 'Date:', date)
    return 'Unknown Time'
  }
}

const formatDate = (date) => {
  try {
    if (!date) return ''
    
    const messageDate = new Date(date)
    const now = new Date()
    
    if (isNaN(messageDate.getTime())) {
      return 'Unknown Date'
    }
    
    if (messageDate.toDateString() === now.toDateString()) {
      return 'Today'
    }
    
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    if (messageDate > weekAgo) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' })
    }
    
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  } catch (error) {
    console.error('Error formatting date:', error, 'Date:', date)
    return 'Unknown Date'
  }
}

// Enhanced watchers
watch(() => currentConversation.value?.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    nextTick(() => {
      scrollToBottom(false)
      messagesStore.markAsRead(newId)
    })
  }
})

watch(() => messages.value?.length, (newLength, oldLength) => {
  if (newLength > oldLength && isAtBottom.value) {
    nextTick(() => {
      scrollToBottom(true)
    })
  }
})

onMounted(() => {
  if (messagesContainer.value) {
    messagesContainer.value.addEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <main 
    v-if="currentConversation"
    class="flex-1 flex flex-col bg-[#141619] relative"
    :class="isMobile ? 'h-svh' : 'rounded-r-2xl'"
  >
    <!-- Chat Header with Connection Status -->
    <header class="flex items-center justify-between p-4 border-b border-white/10 bg-[#1A1A1A]" :class="isMobile ? '' : 'rounded-tr-2xl'">
      <div class="flex items-center gap-3 flex-1">
        <div class="relative">
          <img 
            :src="getConversationAvatar(currentConversation)"
            :alt="getConversationName(currentConversation)"
            class="w-10 h-10 rounded-full object-cover"
          />
          <div 
            v-if="!currentConversation.isGroup && isOnline(currentConversation)"
            class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1A1A]"
          ></div>
        </div>
        
        <div class="flex-1 min-w-0">
          <h2 class="font-medium text-white truncate">
            {{ getConversationName(currentConversation) }}
          </h2>
          <div class="flex items-center gap-2">
            <p class="text-xs text-white/50">
              {{ getConversationStatus(currentConversation) }}
            </p>
            
            <!-- Connection Status Indicator -->
            <div v-if="!isOnline" class="flex items-center gap-1">
              <span class="w-2 h-2 bg-red-400 rounded-full"></span>
              <span class="text-xs text-red-400">{{ connectionStatus.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Header Actions -->
      <div class="flex items-center gap-2">
        <!-- Connection Status (Desktop) -->
        <ConnectionStatus 
          v-if="!isMobile && (!isOnline || failedMessages.length > 0)"
          compact
          position="inline"
        />
        
        <!-- Back button for mobile -->
        <button 
          v-if="isMobile"
          @click="emit('back')"
          class="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Failed Messages Banner -->
    <div v-if="failedMessages.length > 0" class="bg-red-500/20 border-b border-red-500/30 p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-sm text-red-400">
            {{ failedMessages.length }} message{{ failedMessages.length === 1 ? '' : 's' }} failed to send
          </span>
        </div>
        
        <button 
          @click="messagesStore.clearFailedMessages()"
          class="text-xs text-red-400 hover:text-red-300 underline"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Messages Area -->
    <div 
      ref="messagesContainer"
      @scroll="handleScroll"
      class="bg-[url(../assets/chat-background.png)] flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide relative"
      :style="isMobile ? { paddingBottom: 'var(--nav-height)' } : {paddingBottom: '10px'}"
    >
      <!-- Load More Messages Button -->
      <div v-if="canLoadMore" class="text-center py-2">
        <button 
          @click="loadMoreMessages"
          :disabled="loadingMore"
          class="px-4 py-2 bg-[#2C2F36] hover:bg-[#3C3F46] text-white/70 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {{ loadingMore ? 'Loading...' : 'Load More Messages' }}
        </button>
      </div>

      <!-- Messages -->
      <div v-for="(message, index) in messages" :key="message.id || message.tempId">
        
        <!-- Date separator -->
        <div 
          v-if="index === 0 || shouldShowDateSeparator(message, messages[index - 1])" 
          class="w-full text-center my-4"
        >
          <span class="bg-[#2C2F36] px-3 py-1 rounded-full text-xs text-white/50">
            {{ formatDate(message.createdAt || message.timestamp) }}
          </span>
        </div>
        
        <div class="flex" :class="message.senderId === authStore.currentUser?.id ? 'justify-end' : 'justify-start'">
          
          <!-- Incoming Message -->
          <div v-if="message.senderId !== authStore.currentUser?.id" class="flex gap-2 items-end max-w-[70%]">
            <img 
              v-if="currentConversation.isGroup" 
              :src="message.sender?.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'" 
              :alt="message.sender?.username"
              class="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            
            <div class="bg-[#2C2F36] px-3 py-2 rounded-tr-lg rounded-b-lg text-white">
              <div v-if="currentConversation.isGroup" class="text-xs text-[#055CFF] mb-1">
                {{ message.sender?.firstName }} {{ message.sender?.lastName }}
              </div>
              
              <!-- Media content -->
              <div v-if="message.mediaUrls && message.mediaUrls.length > 0" class="mb-2 space-y-2">
                <div v-for="mediaUrl in message.mediaUrls" :key="mediaUrl" class="relative">
                  
                  <div v-if="getFileType(mediaUrl) === 'image'" class="relative max-w-xs">
                    <img 
                      :src="mediaUrl" 
                      :alt="getFileName(mediaUrl)"
                      class="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </div>
                  
                  <div v-else-if="getFileType(mediaUrl) === 'video'" class="relative max-w-xs">
                    <video 
                      :src="mediaUrl" 
                      controls 
                      class="rounded-lg max-w-full"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  
                  <div v-else-if="getFileType(mediaUrl) === 'audio'" class="flex items-center gap-2 bg-[#3C3F46] p-2 rounded-lg max-w-xs">
                    <svg class="w-6 h-6 text-[#055CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                    <audio controls class="flex-1">
                      <source :src="mediaUrl" type="audio/mpeg">
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  
                  <div v-else class="flex items-center gap-2 bg-[#3C3F46] p-2 rounded-lg max-w-xs">
                    <svg class="w-6 h-6 text-[#055CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="text-sm text-white truncate flex-1">{{ getFileName(mediaUrl) }}</span>
                    <button 
                      @click="downloadFile(mediaUrl, getFileName(mediaUrl))"
                      class="text-white/70 hover:text-green-400 p-1 rounded transition-colors"
                      title="Download"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div v-if="message.content" style="white-space: pre-wrap" class="text-xs">{{ message.content }}</div>
              <div class="text-[10px] text-white/70 mt-1">{{ formatMessageTime(message.createdAt || message.timestamp) }}</div>
            </div>
          </div>
          
          <!-- Outgoing Message -->
          <div v-else class="flex gap-2 items-end max-w-[70%]">
            
            <!-- Message Content -->
            <div 
              :class="[
                'px-3 py-2 rounded-tl-lg rounded-b-lg text-white relative',
                isMessageInError(message) 
                  ? 'bg-red-600' 
                  : isMessageInPending(message)
                    ? 'bg-[#2979FF]/70'
                    : 'bg-[#2979FF]'
              ]"
            >
              <!-- Retry overlay for failed messages -->
              <div 
                v-if="isMessageInError(message)" 
                class="absolute inset-0 bg-red-500/20 rounded-tl-lg rounded-b-lg flex items-center justify-center"
                :class="{ 'animate-pulse': retryingMessages.has(message.tempId || message.id) }"
              >
                <div class="flex items-center gap-2 text-xs">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>Failed</span>
                </div>
              </div>

              <!-- Media content for outgoing messages -->
              <div v-if="message.mediaUrls && message.mediaUrls.length > 0" class="mb-2 space-y-2">
                <div v-for="mediaUrl in message.mediaUrls" :key="mediaUrl" class="relative">
                  
                  <div v-if="getFileType(mediaUrl) === 'image'" class="relative max-w-xs">
                    <img 
                      :src="mediaUrl" 
                      :alt="getFileName(mediaUrl)"
                      class="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </div>
                  
                  <div v-else-if="getFileType(mediaUrl) === 'video'" class="relative max-w-xs">
                    <video 
                      :src="mediaUrl" 
                      controls 
                      class="rounded-lg max-w-full"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  
                  <div v-else-if="getFileType(mediaUrl) === 'audio'" class="flex items-center gap-2 bg-[#3C3F46] p-2 rounded-lg max-w-xs">
                    <svg class="w-6 h-6 text-[#055CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                    <audio controls class="flex-1">
                      <source :src="mediaUrl" type="audio/mpeg">
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  
                  <div v-else class="flex items-center gap-2 bg-[#3C3F46] p-2 rounded-lg max-w-xs">
                    <svg class="w-6 h-6 text-[#055CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="text-sm text-white truncate flex-1">{{ getFileName(mediaUrl) }}</span>
                    <button 
                      @click="downloadFile(mediaUrl, getFileName(mediaUrl))"
                      class="text-white/70 hover:text-green-400 p-1 rounded transition-colors"
                      title="Download"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div v-if="message.content" style="white-space: pre-wrap" class="text-xs">{{ message.content }}</div>
              <div class="text-[10px] text-white/40 mt-1">{{ formatMessageTime(message.createdAt || message.timestamp) }}</div>
            </div>
            
            <!-- Enhanced Message Status with Retry Actions -->
            <div v-if="shouldShowStatus(message)" class="flex flex-col items-end gap-1">
              
              <!-- Status Indicator -->
              <div class="flex-shrink-0">
                <template v-if="getMessageStatusDisplay(message)">
                  <div :class="getMessageStatusDisplay(message).color" :title="getMessageStatusDisplay(message).tooltip">
                    
                    <!-- Loading spinner -->
                    <div 
                      v-if="getMessageStatusDisplay(message).icon === 'clock'"
                      class="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin"
                    ></div>
                    
                    <!-- Error icon with retry button -->
                    <div v-else-if="getMessageStatusDisplay(message).icon === 'error'" class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    
                    <!-- Single tick -->
                    <svg 
                      v-else-if="getMessageStatusDisplay(message).ticks === 1"
                      class="w-4 h-4" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    
                    <!-- Double ticks -->
                    <div 
                      v-else-if="getMessageStatusDisplay(message).ticks === 2"
                      class="flex"
                    >
                      <svg class="w-4 h-4" :class="getMessageStatusDisplay(message).color" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                      <svg class="w-4 h-4 -ml-1" :class="getMessageStatusDisplay(message).color" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                    
                  </div>
                </template>
              </div>

              <!-- Retry Actions for Failed Messages -->
              <div v-if="isMessageInError(message)" class="flex gap-1">
                <button 
                  @click="retryMessage(message)"
                  :disabled="retryingMessages.has(message.tempId || message.id)"
                  class="p-1 text-white/60 hover:text-green-400 transition-colors disabled:opacity-50"
                  title="Retry"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                </button>
                
                <button 
                  @click="deleteFailedMessage(message)"
                  class="p-1 text-white/60 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll to Bottom Button -->
    <button 
      v-if="showScrollToBottom"
      @click="scrollToBottom(true)"
      class="absolute bottom-20 right-4 w-10 h-10 bg-[#055CFF] hover:bg-[#0550e5] rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-105"
      title="Scroll to bottom"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
      </svg>
    </button>

    <!-- Selected Files Preview -->
    <div v-if="selectedFiles.length > 0" class="px-4 py-2 border-t border-white/10 bg-[#1A1A1A]">
      <div class="flex gap-2 overflow-x-auto">
        <div v-for="(file, index) in selectedFiles" :key="index" class="relative flex-shrink-0">
          <div class="flex items-center gap-2 bg-[#2C2F36] p-2 rounded-lg">
            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span class="text-xs text-white truncate max-w-32">{{ file.name }}</span>
            <button @click="removeFile(index)" class="text-white/50 hover:text-red-400">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isMobile" class="h-4"></div>

    <!-- Enhanced Message Input -->
    <div class="border-t border-white/10 bg-[#1A1A1A]" 
    :class="isMobile ? 'fixed inset-x-0 bottom-0' : 'rounded-br-2xl'"
    :style="isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : {}"
    >
      <!-- Connection Warning -->
      <div v-if="!isOnline" class="px-4 py-2 bg-yellow-500/20 border-b border-yellow-500/30">
        <div class="flex items-center gap-2 text-yellow-400 text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>{{ connectionStatus.message }} - Messages will be queued</span>
        </div>
      </div>

      <div class="flex p-3 items-center gap-3">
        <div class="flex flex-row items-start align-center grow bg-[#2a2a2a] rounded-lg px-4 py-3 gap-2">
          <button 
            @click="triggerFileUpload"
            class="text-white/60 cursor-pointer"
            title="Attach files"
          >
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
          </button>
          
          <textarea
            v-model="messageInputValue"
            @keydown="handleKeyPress"
            placeholder="Type a message..."
            class="flex-1 relative w-full text-white text-xs placeholder-white/50 focus:outline-none resize-none scrollbar-hide"
            rows="1"
          ></textarea>
        </div>
        
        <button 
          @click="sendMessage"
          :disabled="!canSendMessage"
          :class="[
            'p-3 rounded-lg transition-colors',
            canSendMessage
              ? 'bg-[#055CFF] hover:bg-[#0550e5] text-white'
              : 'bg-[#2C2F36] text-white/30 cursor-not-allowed'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      multiple
      class="hidden"
      @change="handleFileSelect"
      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
    />

    <!-- Mobile Connection Status -->
    <ConnectionStatus 
      v-if="isMobile"
      compact
      position="bottom-right"
    />
  </main>

  <!-- Show placeholder when no conversation selected -->
  <div 
    v-else-if="!currentConversation" 
    class="flex-1 flex items-center justify-center bg-[#141619] text-white/50"
    :class="isMobile ? 'h-svh' : 'rounded-r-2xl'"
  >
    <div class="text-center">
      <svg class="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
      <p class="text-lg font-medium mb-2">Select a chat to start messaging</p>
      <p class="text-sm">Choose someone from your chats list to see your conversation</p>
    </div>
  </div>
</template>