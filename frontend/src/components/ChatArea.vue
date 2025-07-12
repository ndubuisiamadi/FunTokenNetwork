<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import { uploadAPI } from '@/services/api'
import GroupInfoModal from '@/components/GroupInfoModal.vue'

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

// Refs - keep exactly the same as before
const messagesContainer = ref(null)
const messageInputValue = ref('')
const selectedFiles = ref([])
const fileInput = ref(null)
const isAtBottom = ref(true)
const isDragging = ref(false)
const showDirectMessageOptions = ref(false)
const showGroupOptions = ref(false)
const showGroupInfoModal = ref(false)

// Computed - back to original
const currentConversation = computed(() => messagesStore.currentConversation)
const messages = computed(() => messagesStore.currentMessages)
const typingUsers = computed(() => messagesStore.typingUsers || [])

const canLoadMore = computed(() => {
  if (!currentConversation.value) return false
  return messagesStore.hasMoreMessages[currentConversation.value.id]
})

const canSendMessage = computed(() => {
  const hasText = messageInputValue.value && messageInputValue.value.trim().length > 0
  const hasFiles = selectedFiles.value.length > 0
  const notSending = !messagesStore.sendingMessage
  const hasConversation = !!currentConversation.value
  
  return (hasText || hasFiles) && notSending && hasConversation
})

const isGroupAdmin = computed(() => {
  if (!currentConversation.value?.isGroup || !currentConversation.value?.participants) {
    return false
  }
  
  const currentUserId = authStore.currentUser?.id
  const currentUserParticipant = currentConversation.value.participants.find(p => p.userId === currentUserId)
  
  return currentUserParticipant?.role === 'admin' || 
         currentConversation.value.participants[0]?.userId === currentUserId
})

const loadMoreMessages = async () => {
  if (!currentConversation.value) return
  await messagesStore.loadMoreMessages(currentConversation.value.id)
}

// Drag and drop
const handleDragEnter = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (e) => {
  e.preventDefault()
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDragging.value = false
  }
}

const handleDragOver = (e) => {
  e.preventDefault()
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  
  const files = Array.from(e.dataTransfer.files)
  handleFilesDrop(files)
}

const handleFilesDrop = async (files) => {
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
}

// Navigation helpers
const navigateToProfile = () => {
  if (!currentConversation.value?.otherParticipant) return
  router.push(`/user/${currentConversation.value.otherParticipant.id}`)
}

const navigateToGroupInfo = () => {
  showGroupInfoModal.value = true
}

// Conversation actions
const viewUserProfile = () => {
  navigateToProfile()
}

const toggleMuteConversation = async () => {
  console.log('Toggle mute conversation')
}

const toggleMuteGroup = async () => {
  console.log('Toggle mute group')
}

const openSearchInConversation = () => {
  console.log('Open search in conversation')
}

const clearChatHistory = async () => {
  if (confirm('Are you sure you want to clear the chat history? This action cannot be undone.')) {
    try {
      console.log('Clear chat history')
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }
}

const blockUser = async () => {
  if (confirm('Are you sure you want to block this user?')) {
    try {
      console.log('Block user')
    } catch (error) {
      console.error('Failed to block user:', error)
    }
  }
}

const leaveGroup = async () => {
  if (confirm('Are you sure you want to leave this group?')) {
    try {
      const result = await messagesStore.leaveConversation(currentConversation.value.id)
      if (result.success) {
        if (props.isMobile) {
          emit('back')
        } else {
          router.push('/messages')
        }
      }
    } catch (error) {
      console.error('Failed to leave group:', error)
    }
  }
}

const deleteGroup = async () => {
  if (confirm('Are you sure you want to delete this group? This action cannot be undone and will remove the group for all members.')) {
    try {
      console.log('Delete group')
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
  }
}

// SIMPLIFIED Message handling - this is the key change
const sendMessage = async () => {
  if (!canSendMessage.value || !currentConversation.value) {
    return
  }

  const content = messageInputValue.value.trim()
  const mediaUrls = selectedFiles.value.map(file => file.url).filter(Boolean)

  if (!content && mediaUrls.length === 0) {
    return
  }

  // Determine message type based on content
  let messageType = 'text'
  if (mediaUrls.length > 0) {
    const hasVideo = mediaUrls.some(url => {
      const ext = getFileExtension(url)
      return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)
    })
    
    const hasAudio = mediaUrls.some(url => {
      const ext = getFileExtension(url)
      return ['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext)
    })
    
    const hasImage = mediaUrls.some(url => {
      const ext = getFileExtension(url)
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
    })
    
    if (hasVideo) messageType = 'video'
    else if (hasImage) messageType = 'image'
    else if (hasAudio) messageType = 'audio'
    else messageType = 'file'
  }

  console.log('Sending message:', { content, mediaUrls, messageType })

  // Just send the message - no conversation creation logic here
  const result = await messagesStore.sendMessage(content, mediaUrls, messageType)

  if (result.success) {
    messageInputValue.value = ''
    selectedFiles.value = []
    await nextTick()
    scrollToBottom(true)
  } else {
    console.error('Failed to send message:', result.error)
  }
}

const handleKeyPress = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const handleInputChange = () => {
  // Handle typing indicators here if needed
}

// File handling
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

// Helper functions - keep all existing ones
const getFileExtension = (url) => {
  return url.split('.').pop().toLowerCase()
}

const getFileType = (url) => {
  const ext = getFileExtension(url)
  
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

const getConversationName = (conversation) => {
  if (conversation.isGroup) {
    return conversation.name || 'Group Chat'
  }
  
  const other = conversation.otherParticipant
  if (other) {
    return `${other.firstName || ''} ${other.lastName || ''}`.trim() || other.username
  }
  
  return 'Unknown User'
}

const getConversationAvatar = (conversation) => {
  if (conversation.isGroup) {
    return conversation.avatarUrl || 
           'https://ui-avatars.com/api/?name=' + encodeURIComponent(conversation.name || 'Group') + '&background=055CFF&color=fff&size=40'
  }
  
  return conversation.otherParticipant?.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'
}

const getConversationStatus = (conversation) => {
  if (conversation.isGroup) {
    const memberCount = conversation.participants?.length || 0
    return `${memberCount} members`
  }
  
  return isOnline(conversation) 
    ? 'Online' 
    : `Last seen ${formatLastSeen(conversation.otherParticipant?.lastSeen)}`
}

const isOnline = (conversation) => {
  if (conversation.isGroup) return false
  return conversation.otherParticipant?.isOnline || false
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

const closeDropdowns = () => {
  showDirectMessageOptions.value = false
  showGroupOptions.value = false
}

const handleClickOutside = (event) => {
  const isClickInsideDropdown = event.target.closest('.relative')
  if (!isClickInsideDropdown) {
    showDirectMessageOptions.value = false
    showGroupOptions.value = false
  }
}

// Time formatting functions
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

// Watchers
// Watch for new messages and auto-scroll
watch(() => messages.value, (newMessages, oldMessages) => {
  if (!newMessages || !oldMessages) return
  
  // Check if new messages were added
  if (newMessages.length > oldMessages.length) {
    nextTick(() => {
      // Auto-scroll only if user was near the bottom
      if (isAtBottom.value || isNearBottom()) {
        scrollToBottom(true)
      }
    })
  }
}, { deep: true })

// Watch for conversation changes
watch(() => currentConversation.value?.id, (newConvId, oldConvId) => {
  if (newConvId && newConvId !== oldConvId) {
    nextTick(() => {
      scrollToBottom(false) // Smooth scroll to bottom when switching conversations
      markMessagesAsRead() // Mark messages as read when opening conversation
    })
  }
})

// Enhanced scroll methods
const scrollToBottom = (instant = false) => {
  if (!messagesContainer.value) return
  
  const container = messagesContainer.value
  const scrollOptions = {
    top: container.scrollHeight,
    behavior: instant ? 'instant' : 'smooth'
  }
  
  container.scrollTo(scrollOptions)
  isAtBottom.value = true
}

const isNearBottom = () => {
  if (!messagesContainer.value) return true
  
  const container = messagesContainer.value
  const threshold = 100 // pixels from bottom
  return (container.scrollHeight - container.scrollTop - container.clientHeight) <= threshold
}

const handleScroll = () => {
  if (!messagesContainer.value) return
  
  const container = messagesContainer.value
  const threshold = 50
  
  // Update isAtBottom state
  isAtBottom.value = (container.scrollHeight - container.scrollTop - container.clientHeight) <= threshold
  
  // Mark messages as read when scrolling (debounced)
  clearTimeout(scrollTimeout.value)
  scrollTimeout.value = setTimeout(() => {
    if (currentConversation.value) {
      markMessagesAsRead()
    }
  }, 500)
}

// Auto-mark messages as read
const markMessagesAsRead = async () => {
  if (!currentConversation.value) return
  
  try {
    await messagesStore.autoMarkAsRead(currentConversation.value.id)
  } catch (error) {
    console.error('Failed to mark messages as read:', error)
  }
}

// Add scroll timeout ref
const scrollTimeout = ref(null)

// Add scroll listener on mount
onMounted(() => {
  if (messagesContainer.value) {
    messagesContainer.value.addEventListener('scroll', handleScroll)
  }
})

// Remove scroll listener on unmount
onUnmounted(() => {
  if (messagesContainer.value) {
    messagesContainer.value.removeEventListener('scroll', handleScroll)
  }
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }
})
</script>

<template>
  <!-- EXACT SAME TEMPLATE AS BEFORE - NO CHANGES -->
  <main 
    v-if="currentConversation"
    class="flex-1 flex flex-col bg-[#141619] relative"
    :class="isMobile ? 'h-full' : 'rounded-r-2xl'"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <!-- Enhanced Chat Header -->
    <header class="flex items-center justify-between p-4 border-b border-white/10 bg-[#1A1A1A]" :class="isMobile ? '' : 'rounded-tr-2xl'">
      <div class="flex items-center">
        <!-- Mobile Back Button -->
        <button 
          v-if="isMobile"
          @click="emit('back')"
          class="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors mr-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        <div class="flex items-center gap-3">
            <!-- Profile Image & Info -->
        <div 
          class="relative cursor-pointer"
          :class="{ 'hover:opacity-80 transition-opacity': true }"
          @click="currentConversation.isGroup ? navigateToGroupInfo() : navigateToProfile()"
        >
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
        
        <div>
          <h2 
            class="font-medium text-white cursor-pointer hover:text-white/80 transition-colors"
            @click="currentConversation.isGroup ? navigateToGroupInfo() : navigateToProfile()"
          >
            {{ getConversationName(currentConversation) }}
          </h2>
          <p class="text-xs text-white/50">
            {{ getConversationStatus(currentConversation) }}
          </p>
        </div>
        </div>
      </div>

      <!-- Options Menu -->
      <div class="relative">
        <button 
          @click="currentConversation.isGroup ? (showGroupOptions = !showGroupOptions) : (showDirectMessageOptions = !showDirectMessageOptions)"
          class="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
          </svg>
        </button>

        <!-- Direct Message Options -->
        <div 
          v-if="showDirectMessageOptions && !currentConversation.isGroup"
          class="absolute right-0 top-full mt-2 w-48 bg-[#2C2F36] rounded-lg shadow-lg border border-white/10 py-2 z-10"
        >
          <div class="px-2">
            <button 
              @click="viewUserProfile"
              class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              View Profile
            </button>
            
            <button 
              @click="toggleMuteConversation"
              class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
            >
              <svg v-if="currentConversation.isMuted" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
              </svg>
              {{ currentConversation.isMuted ? 'Unmute' : 'Mute' }} Notifications
            </button>
            
            <button 
              @click="openSearchInConversation"
              class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              Search Messages
            </button>
            
            <button 
              @click="clearChatHistory"
              class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Clear Chat History
            </button>
            
            <div class="border-t border-white/10 my-2"></div>
            
            <button 
              @click="blockUser"
              class="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
              </svg>
              Block User
            </button>
          </div>
        </div>

        <!-- Group Options -->
        <div 
          v-if="showGroupOptions && currentConversation.isGroup"
          class="absolute right-0 top-full mt-2 w-48 bg-[#2C2F36] rounded-lg shadow-lg border border-white/10 py-2 z-10"
        >
          <div class="px-2">
            <button 
              @click="navigateToGroupInfo"
              class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Group Info
            </button>
            
            <template v-if="isGroupAdmin">
              <button 
                @click="console.log('Manage members')"
                class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                </svg>
                Manage Members
              </button>
            </template>
            
            <!-- Common Options -->
            <div class="border-t border-white/10 my-2"></div>
            
            <button 
              @click="toggleMuteGroup"
              class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
            >
              <svg v-if="currentConversation.isMuted" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
              </svg>
              {{ currentConversation.isMuted ? 'Unmute' : 'Mute' }} Notifications
            </button>
            
            <button 
              @click="openSearchInConversation"
              class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              Search Messages
            </button>
            
            <div class="border-t border-white/10 my-2"></div>
            
            <button 
              @click="leaveGroup"
              class="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Leave Group
            </button>
            
            <template v-if="isGroupAdmin">
              <button 
                @click="deleteGroup"
                class="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-200 flex items-center gap-3"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Delete Group
              </button>
            </template>
          </div>
        </div>
      </div>
    </header>

    <!-- Messages Area -->
    <div 
      ref="messagesContainer"
      @scroll="handleScroll"
      :class="[
        'bg-[url(../assets/chat-background.png)] flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide',
        isDragging ? 'bg-[#055CFF]/10 border-2 border-dashed border-[#055CFF]' : ''
      ]"
    >
      <!-- Load More Button -->
      <div v-if="canLoadMore" class="text-center">
        <button 
          @click="loadMoreMessages"
          :disabled="messagesStore.loadingMore"
          class="px-4 py-2 text-sm text-[#055CFF] hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
        >
          {{ messagesStore.loadingMore ? 'Loading...' : 'Load more messages' }}
        </button>
      </div>

      <!-- Messages -->
      <div v-for="(message, index) in messages" :key="message.id">
        
        <!-- Date separator -->
        <div 
          v-if="index === 0 || formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp)" 
          class="w-full text-center my-4"
        >
          <span class="bg-[#2C2F36] px-3 py-1 rounded-full text-xs text-white/50">
            {{ formatDate(message.timestamp) }}
          </span>
        </div>
        
        <div class="flex" :class="message.senderId === authStore.currentUser?.id ? 'justify-end' : 'justify-start'">
          
          <!-- Incoming Message (from other users) -->
          <div v-if="message.senderId !== authStore.currentUser?.id" class="flex gap-2 items-end max-w-[70%]">
            <!-- Show avatar for group chats -->
            <img 
              v-if="currentConversation.isGroup" 
              :src="message.sender?.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'" 
              :alt="message.sender?.username"
              class="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            
            <div class="bg-[#2C2F36] px-3 py-2 rounded-tr-lg rounded-b-lg text-white">
              <!-- Show sender name in group chats -->
              <div v-if="currentConversation.isGroup" class="text-xs text-[#055CFF] mb-1">
                {{ message.sender?.firstName }} {{ message.sender?.lastName }}
              </div>
              
              <!-- Media content for incoming messages -->
              <div v-if="message.mediaUrls && message.mediaUrls.length > 0" class="mb-2 space-y-2">
                <div v-for="mediaUrl in message.mediaUrls" :key="mediaUrl" class="relative">
                  
                  <!-- Image -->
                  <div v-if="getFileType(mediaUrl) === 'image'" class="relative max-w-xs">
                    <img 
                      :src="mediaUrl" 
                      :alt="getFileName(mediaUrl)"
                      class="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      @click="console.log('Preview image:', mediaUrl)"
                    />
                  </div>
                  
                  <!-- Video -->
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
                  
                  <!-- Audio -->
                  <div v-else-if="getFileType(mediaUrl) === 'audio'" class="flex items-center gap-2 bg-[#3C3F46] p-2 rounded-lg max-w-xs">
                    <svg class="w-6 h-6 text-[#055CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                    <audio controls class="flex-1">
                      <source :src="mediaUrl" type="audio/mpeg">
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  
                  <!-- Other files -->
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
              <div class="text-[10px] text-white/70 mt-1 justify-self-end">{{ formatMessageTime(message.timestamp) }}</div>
            </div>
          </div>
          
          <!-- Outgoing Message (from current user) -->
          <div v-else class="flex gap-2 items-end max-w-[70%]">
            <div class="bg-[#2979FF] px-3 py-2 rounded-tl-lg rounded-b-lg text-white">
              <!-- Media content for outgoing messages (similar structure) -->
              <div v-if="message.mediaUrls && message.mediaUrls.length > 0" class="mb-2 space-y-2">
                <div v-for="mediaUrl in message.mediaUrls" :key="mediaUrl" class="relative">
                  
                  <!-- Image -->
                  <div v-if="getFileType(mediaUrl) === 'image'" class="relative max-w-xs">
                    <img 
                      :src="mediaUrl" 
                      :alt="getFileName(mediaUrl)"
                      class="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      @click="console.log('Preview image:', mediaUrl)"
                    />
                  </div>
                  
                  <!-- Video -->
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
                  
                  <!-- Audio -->
                  <div v-else-if="getFileType(mediaUrl) === 'audio'" class="flex items-center gap-2 bg-[#3C3F46] p-2 rounded-lg max-w-xs">
                    <svg class="w-6 h-6 text-[#055CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                    <audio controls class="flex-1">
                      <source :src="mediaUrl" type="audio/mpeg">
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  
                  <!-- Other files -->
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
              <div class="text-[10px] text-white/40 mt-1 justify-self-end">{{ formatMessageTime(message.timestamp) }}</div>
            </div>
            
            <!-- Message status for sender -->
            <div class="flex-shrink-0 self-end mb-1">
              <div v-if="message.status === 'sending'" class="w-4 h-4 border border-white/30 border-t-transparent rounded-full animate-spin"></div>
              <svg v-else-if="message.status === 'sent'" class="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <div v-else-if="message.status === 'delivered'" class="flex">
                <svg class="w-4 h-4 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <svg class="w-4 h-4 text-white/70 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div v-else-if="message.status === 'read'" class="flex">
                <svg class="w-4 h-4 text-[#055CFF]" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <svg class="w-4 h-4 text-[#055CFF] -ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="typingUsers.length > 0" class="flex justify-start">
        <div class="bg-[#2C2F36] px-3 py-2 rounded-tr-lg rounded-b-lg text-white flex items-center gap-2">
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-white/50 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-white/50 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-white/50 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
          <span class="text-xs text-white/70 ml-2">{{ typingUsers.join(', ') }} typing...</span>
        </div>
      </div>
    </div>

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

    <!-- Message Input -->
    <div class="p-3 border-t border-white/10 bg-[#1A1A1A]" :class="isMobile ? '' : 'rounded-br-2xl'">
      <div class="flex items-center gap-3">
        <div class="flex flex-row items-start grow bg-[#2a2a2a] rounded-lg px-4 py-3 gap-2">
            <button 
          @click="triggerFileUpload"
          class=" text-white/60 cursor-pointer"
          title="Attach files"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
        </button>
        
        <textarea
            v-model="messageInputValue"
            @input="handleInputChange"
            @keydown="handleKeyPress"
            placeholder="Type a message..."
            class="flex-1 relative w-full text-white text-sm placeholder-white/50 focus:outline-none resize-none scrollbar-hide"
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
  </main>

  <!-- Group Info Modal -->
  <GroupInfoModal 
    v-if="currentConversation && showGroupInfoModal"
    :show="showGroupInfoModal"
    :conversation="currentConversation"
    :is-admin="isGroupAdmin"
    @close="showGroupInfoModal = false"
    @member-removed="console.log('Member removed')"
    @conversation-updated="console.log('Conversation updated')"
  />
  
  <!-- Show placeholder when no conversation selected -->
  <div 
    v-else-if="!currentConversation" 
    class="flex-1 flex items-center justify-center bg-[#141619] text-white/50"
    :class="isMobile ? 'h-full' : 'rounded-r-2xl'"
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