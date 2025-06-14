<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import { uploadAPI } from '@/services/api'
import { getMediaUrl } from '@/utils/media'
import GroupInfoModal from '@/components/GroupInfoModal.vue'

const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['back'])

const router = useRouter()
const messagesStore = useMessagesStore()
const authStore = useAuthStore()

// Refs
const messageInputValue = ref('')
const messageInputElement = ref(null)
const messagesContainer = ref(null)
const fileInput = ref(null)
const selectedFiles = ref([])
const isDragging = ref(false)
const isAtBottom = ref(true)
const showScrollToBottom = ref(false)
const imageModal = ref(false)
const selectedImage = ref('')
const showDirectMessageOptions = ref(false)
const showGroupOptions = ref(false)
const showGroupManagement = ref(false)
const showGroupInfoModal = ref(false)

// Computed
const currentConversation = computed(() => messagesStore.currentConversation)
const messages = computed(() => messagesStore.currentMessages)
const isTyping = computed(() => messagesStore.isTypingInCurrent)
const typingUsers = computed(() => messagesStore.typingUsersNames)

const navigateToGroupInfo = () => {
  if (currentConversation.value?.isGroup) {
    showGroupOptions.value = false
    showGroupInfoModal.value = true
  }
}

const viewGroupInfo = () => {
  showGroupOptions.value = false
  showGroupInfoModal.value = true
}

const closeGroupInfoModal = () => {
  showGroupInfoModal.value = false
}

const handleEditGroup = () => {
  showGroupInfoModal.value = false
  console.log('Edit group functionality - to be implemented')
  // You can implement group editing here
}

const handleAddMembers = () => {
  showGroupInfoModal.value = false
  console.log('Add members functionality - to be implemented')
  // You can implement adding members here
}

const handleManageMembers = () => {
  showGroupInfoModal.value = false
  console.log('Manage members functionality - to be implemented')
  // You can implement member management here
}

const handleLeaveGroup = async () => {
  showGroupInfoModal.value = false
  
  try {
    const result = await messagesStore.leaveConversation(currentConversation.value.id)
    if (result.success) {
      console.log('Left group successfully')
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
    if (!date) return 'Unknown Date'
    
    const messageDate = new Date(date)
    if (isNaN(messageDate.getTime())) {
      return 'Unknown Date'
    }
    
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (messageDate.toDateString() === now.toDateString()) {
      return 'Today'
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return messageDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })
    }
  } catch (error) {
    console.error('Error formatting date:', error, 'Date:', date)
    return 'Unknown Date'
  }
}

// Navigation methods
const navigateToProfile = () => {
  if (currentConversation.value?.otherParticipant?.id && !currentConversation.value.isGroup) {
    const userId = currentConversation.value.otherParticipant.id
    console.log('Navigating to profile:', userId) // Debug log
    router.push(`/user-profile/${userId}`)
  }
}

const viewUserProfile = () => {
  showDirectMessageOptions.value = false
  navigateToProfile()
}


// Direct message options
// const viewUserProfile = () => {
//   showDirectMessageOptions.value = false
  
//   if (currentConversation.value?.otherParticipant?.id) {
//     const userId = currentConversation.value.otherParticipant.id
//     router.push(`/user-profile/${userId}`)
//   }
// }

const toggleMuteConversation = async () => {
  showDirectMessageOptions.value = false
  try {
    const result = await messagesStore.toggleMuteConversation(currentConversation.value.id)
    if (result.success) {
      console.log('Conversation mute status toggled')
    }
  } catch (error) {
    console.error('Failed to toggle mute status:', error)
  }
}

const openSearchInConversation = () => {
  showDirectMessageOptions.value = false
  console.log('Open search in conversation')
}

const clearChatHistory = async () => {
  showDirectMessageOptions.value = false
  
  if (confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
    try {
      const result = await messagesStore.clearChatHistory(currentConversation.value.id)
      if (result.success) {
        console.log('Chat history cleared')
      }
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }
}

const blockUser = async () => {
  showDirectMessageOptions.value = false
  
  if (confirm('Are you sure you want to block this user? You will no longer receive messages from them.')) {
    try {
      const userId = currentConversation.value.otherParticipant?.id
      if (userId) {
        console.log('Block user:', userId)
      }
    } catch (error) {
      console.error('Failed to block user:', error)
    }
  }
}

// Group options

const editGroupInfo = () => {
  showGroupOptions.value = false
  console.log('Edit group info')
  showGroupManagement.value = true
}

const addGroupMembers = () => {
  showGroupOptions.value = false
  console.log('Add group members')
}

const manageGroupMembers = () => {
  showGroupOptions.value = false
  console.log('Manage group members')
  showGroupManagement.value = true
}

const toggleMuteGroup = async () => {
  showGroupOptions.value = false
  try {
    const result = await messagesStore.toggleMuteConversation(currentConversation.value.id)
    if (result.success) {
      console.log('Group mute status toggled')
    }
  } catch (error) {
    console.error('Failed to toggle group mute status:', error)
  }
}

const searchInGroup = () => {
  showGroupOptions.value = false
  console.log('Search in group')
}

const clearGroupHistory = async () => {
  showGroupOptions.value = false
  
  if (confirm('Are you sure you want to clear all group chat history? This action cannot be undone.')) {
    try {
      const result = await messagesStore.clearChatHistory(currentConversation.value.id)
      if (result.success) {
        console.log('Group chat history cleared')
      }
    } catch (error) {
      console.error('Failed to clear group chat history:', error)
    }
  }
}

const leaveGroup = async () => {
  showGroupOptions.value = false
  
  if (confirm('Are you sure you want to leave this group? You will no longer receive messages from this group.')) {
    try {
      const result = await messagesStore.leaveConversation(currentConversation.value.id)
      if (result.success) {
        console.log('Left group successfully')
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
  showGroupOptions.value = false
  
  if (confirm('Are you sure you want to delete this group? This action cannot be undone and will remove the group for all members.')) {
    try {
      console.log('Delete group')
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
  }
}

// Message handling
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
    // Check if any media is video
    const hasVideo = mediaUrls.some(url => {
      const ext = getFileExtension(url)
      return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)
    })
    
    // Check if any media is audio
    const hasAudio = mediaUrls.some(url => {
      const ext = getFileExtension(url)
      return ['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext)
    })
    
    // Check if any media is image
    const hasImage = mediaUrls.some(url => {
      const ext = getFileExtension(url)
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
    })
    
    if (hasVideo) {
      messageType = 'video'
    } else if (hasImage) {
      messageType = 'image'
    } else if (hasAudio) {
      messageType = 'audio'
    } else {
      messageType = 'file'
    }
  }

  console.log('Sending message:', { content, mediaUrls, messageType }) // Debug log

  // Call the store method with the correct signature
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
      console.error('Upload failed:', error)
      alert(`Failed to upload ${file.name}`)
    }
  }
  
  event.target.value = ''
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

// Drag and drop
const handleDragEnter = (event) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (event) => {
  event.preventDefault()
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragging.value = false
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
}

const handleDrop = async (event) => {
  event.preventDefault()
  isDragging.value = false
  
  const files = Array.from(event.dataTransfer.files)
  if (files.length > 0) {
    const fakeEvent = { target: { files } }
    await handleFileSelect(fakeEvent)
  }
}

// Scrolling
const scrollToBottom = (smooth = false) => {
  if (!messagesContainer.value) return
  
  const container = messagesContainer.value
  const scrollOptions = {
    top: container.scrollHeight,
    behavior: smooth ? 'smooth' : 'instant'
  }
  container.scrollTo(scrollOptions)
}

const handleScroll = () => {
  if (!messagesContainer.value) return
  
  const container = messagesContainer.value
  const { scrollTop, scrollHeight, clientHeight } = container
  
  const threshold = 100
  isAtBottom.value = scrollTop + clientHeight >= scrollHeight - threshold
  showScrollToBottom.value = !isAtBottom.value && messages.value.length > 0
  
  if (scrollTop === 0 && canLoadMore.value && !messagesStore.loadingMore) {
    loadMoreMessages()
  }
}

const loadMoreMessages = async () => {
  if (!canLoadMore.value || messagesStore.loadingMore) return
  
  const container = messagesContainer.value
  const oldScrollHeight = container.scrollHeight
  
  await messagesStore.loadMoreMessages()
  
  await nextTick()
  const newScrollHeight = container.scrollHeight
  container.scrollTop = newScrollHeight - oldScrollHeight
}

// Media handling
const openImageModal = (imageUrl) => {
  selectedImage.value = imageUrl
  imageModal.value = true
}

const closeImageModal = () => {
  imageModal.value = false
  selectedImage.value = ''
}

const downloadFile = async (mediaUrl, filename) => {
  try {
    const fullUrl = getMediaUrl(mediaUrl)
    const response = await fetch(fullUrl)
    const blob = await response.blob()
    
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || getFileName(mediaUrl)
    document.body.appendChild(a)
    a.click()
    
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Download failed:', error)
    window.open(getMediaUrl(mediaUrl), '_blank')
  }
}

// Helper functions
const getFileExtension = (url) => {
  if (!url) return ''
  return url.split('.').pop().toLowerCase()
}

const getFileType = (url) => {
  if (!url) return 'file'
  
  const ext = getFileExtension(url)
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a']
  const documentExts = ['pdf', 'doc', 'docx', 'txt', 'rtf']
  
  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  if (documentExts.includes(ext)) return 'document'
  
  return 'file'
}

const getFileName = (url) => {
  if (!url) return 'Unknown file'
  const parts = url.split('/')
  return decodeURIComponent(parts[parts.length - 1])
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

const getConversationSubtitle = (conversation) => {
  if (conversation.isGroup) {
    const participantCount = conversation.participants?.length || 0
    return `${participantCount} members`
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
  // Close dropdowns if clicking outside of them
  const isClickInsideDropdown = event.target.closest('.relative')
  if (!isClickInsideDropdown) {
    showDirectMessageOptions.value = false
    showGroupOptions.value = false
  }
}

// Watchers
watch(messages, async (newMessages, oldMessages) => {
  if (newMessages.length > oldMessages.length && isAtBottom.value) {
    await nextTick()
    scrollToBottom(true)
  }
}, { deep: true })

// Lifecycle
onMounted(() => {
  if (typeof messageInputValue.value !== 'string') {
    messageInputValue.value = ''
  }

   document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  // Cleanup if needed
})
</script>

<template>
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
          <p class="text-xs text-white/50">{{ getConversationSubtitle(currentConversation) }}</p>
        </div>
        </div>
        
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Group Options (only for groups) -->
        <div v-if="currentConversation.isGroup" class="relative">
          <button 
            @click="showGroupOptions = !showGroupOptions"
            class="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Group Options"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
          </button>
          
          <!-- Group Options Dropdown -->
          <div 
            v-if="showGroupOptions"
            @click.stop
            class="absolute right-0 top-full mt-2 w-56 bg-[#2C2F36] rounded-lg shadow-xl border border-white/10 py-2 z-50"
          >
            <!-- Group Info -->
            <button 
              @click="viewGroupInfo"
              class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Group Info
            </button>
            
            <!-- Admin Options -->
            <template v-if="isGroupAdmin">
              <div class="border-t border-white/10 my-2"></div>
              
              <button 
                @click="editGroupInfo"
                class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Edit Group
              </button>
              
              <button 
                @click="addGroupMembers"
                class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Add Members
              </button>
              
              <button 
                @click="manageGroupMembers"
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
              </svg>
              {{ currentConversation.isMuted ? 'Unmute' : 'Mute' }} Group
            </button>
            
            <button 
              @click="searchInGroup"
              class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              Search Messages
            </button>
            
            <button 
              v-if="isGroupAdmin"
              @click="clearGroupHistory"
              class="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Clear Chat History
            </button>
            
            <div class="border-t border-white/10 my-2"></div>
            
            <button 
              v-if="!isGroupAdmin"
              @click="leaveGroup"
              class="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Leave Group
            </button>
            
            <button 
              v-if="isGroupAdmin"
              @click="deleteGroup"
              class="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-200 flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete Group
            </button>
          </div>
        </div>
        
        <!-- Direct Message Options (only for direct messages) -->
        <div v-if="!currentConversation.isGroup" class="relative">
          <button 
            @click="showDirectMessageOptions = !showDirectMessageOptions"
            class="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Chat Options"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
          </button>
          
          <!-- Direct Message Options Dropdown -->
          <div 
            v-if="showDirectMessageOptions"
            @click.stop
            class="absolute right-0 top-full mt-2 w-56 bg-[#2C2F36] rounded-lg shadow-xl border border-white/10 py-2 z-50"
          >
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
      </div>
    </header>

    <!-- Messages Area -->
    <div 
      ref="messagesContainer"
      @scroll="handleScroll"
      :class="[
        'flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide',
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
          <!-- Incoming Message (from others) -->
          <div v-if="message.senderId !== authStore.currentUser?.id" class="flex items-start gap-2 max-w-[70%]">
            <!-- <img 
              :src="message.sender?.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'" 
              :alt="message.sender?.firstName || message.sender?.username"
              class="w-8 h-8 rounded-full flex-shrink-0"
            /> -->
            <div class="bg-[#2C2F36] px-3 py-2 rounded-tr-lg rounded-b-lg">
              <!-- Show sender name in group chats -->
              <div v-if="currentConversation.isGroup && message.sender" class="text-[10px] text-blue-400 mb-1 font-medium">
                {{ message.sender.firstName || message.sender.username }}
              </div>
              
              <!-- Media content -->
              <div v-if="message.mediaUrls && message.mediaUrls.length > 0" class="mb-2 space-y-2">
                <div v-for="mediaUrl in message.mediaUrls" :key="mediaUrl" class="relative">
                  
                  <!-- Image -->
                  <div v-if="getFileType(mediaUrl) === 'image'" class="relative">
                    <img 
                      :src="getMediaUrl(mediaUrl)" 
                      alt="Shared image" 
                      class="max-w-xs rounded cursor-pointer aspect-square object-cover hover:opacity-90 transition-opacity"
                      @click="openImageModal(getMediaUrl(mediaUrl))"
                      @error="(e) => console.error('Failed to load image:', e.target.src)"
                    />
                    <button 
                      @click="downloadFile(mediaUrl, getFileName(mediaUrl))"
                      class="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white p-1.5 rounded-full transition-colors"
                      title="Download"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3"/>
                      </svg>
                    </button>
                  </div>
                  
                  <!-- Video -->
                  <div v-else-if="getFileType(mediaUrl) === 'video'" class="relative">
                    <video 
                      :src="getMediaUrl(mediaUrl)" 
                      controls 
                      class="max-w-xs rounded"
                      preload="metadata"
                      @error="(e) => console.error('Failed to load video:', e.target.src)"
                    >
                      Your browser does not support the video tag.
                    </video>
                    <button 
                      @click="downloadFile(mediaUrl, getFileName(mediaUrl))"
                      class="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
                      title="Download"
                    >
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3"/>
                      </svg>
                    </button>
                  </div>
                  
                  <!-- Audio -->
                  <div v-else-if="getFileType(mediaUrl) === 'audio'" class="flex items-center gap-3 bg-white/10 p-3 rounded-lg max-w-xs">
                    <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-white truncate">{{ getFileName(mediaUrl) }}</p>
                      <audio :src="getMediaUrl(mediaUrl)" controls class="w-full mt-1">
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  </div>
                  
                  <!-- Other Files -->
                  <div v-else 
                  @click="downloadFile(mediaUrl, getFileName(mediaUrl))" 
                  class="bg-white/10 p-3 rounded-lg flex items-center gap-3 max-w-xs cursor-pointer"
                  >
                    <svg class="w-5 h-5 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                    </svg>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-white truncate">{{ getFileName(mediaUrl) }}</p>
                      <p class="text-xs text-white/70">{{ getFileExtension(mediaUrl).toUpperCase() }} file</p>
                    </div>
                    <!-- <div class="flex gap-1 align-center">
                       <button 
                        @click="window.open(getMediaUrl(mediaUrl), '_blank')"
                        class="text-white/70 hover:text-blue-200 p-1 rounded transition-colors"
                        title="Open"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                      </button>
                      <button 
                        @click="downloadFile(mediaUrl, getFileName(mediaUrl))"
                        class="text-white/70 hover:text-green-200 rounded transition-colors"
                        title="Download"
                      >
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3"/>
                        </svg>
                      </button>
                    </div> -->
                  </div>
                </div>
              </div>
              
              <div v-if="message.content" style="white-space: pre-wrap" class="text-xs">{{ message.content }}</div>
              <div class="text-[10px] text-white/70 mt-1 justify-self-end">{{ formatMessageTime(message.timestamp) }}</div>
            </div>
          </div>
          
          <!-- Outgoing Message (from current user) -->
          <div v-else class="flex gap-2 items-end max-w-[70%]">
            <div class="bg-[#2979FF0A] px-3 py-2 rounded-tl-lg rounded-b-lg text-white">
              <!-- Media content for outgoing messages (similar structure) -->
              <div v-if="message.mediaUrls && message.mediaUrls.length > 0" class="mb-2 space-y-2">
                <div v-for="mediaUrl in message.mediaUrls" :key="mediaUrl" class="relative">
                  
                  <!-- Image -->
                  <div v-if="getFileType(mediaUrl) === 'image'" class="relative">
                    <img 
                      :src="getMediaUrl(mediaUrl)" 
                      alt="Shared image" 
                      class="max-w-xs rounded cursor-pointer aspect-square object-cover hover:opacity-90 transition-opacity"
                      @click="openImageModal(getMediaUrl(mediaUrl))"
                      @error="(e) => console.error('Failed to load image:', e.target.src)"
                    />
                    <button 
                      @click="downloadFile(mediaUrl, getFileName(mediaUrl))"
                      class="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
                      title="Download"
                    >
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3"/>
                      </svg>
                    </button>
                  </div>
                  
                  <!-- Video -->
                  <div v-else-if="getFileType(mediaUrl) === 'video'" class="relative">
                    <video 
                      :src="getMediaUrl(mediaUrl)" 
                      controls 
                      class="max-w-xs rounded"
                      preload="metadata"
                      @error="(e) => console.error('Failed to load video:', e.target.src)"
                    >
                      Your browser does not support the video tag.
                    </video>
                    <button 
                      @click="downloadFile(mediaUrl, getFileName(mediaUrl))"
                      class="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white p-1.5 rounded-full transition-colors"
                      title="Download"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3"/>
                      </svg>
                    </button>
                  </div>
                  
                  <!-- Audio -->
                  <div v-else-if="getFileType(mediaUrl) === 'audio'" class="flex items-center gap-3 bg-[#1a1a1a] p-3 rounded-lg max-w-xs">
                    <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-white truncate">{{ getFileName(mediaUrl) }}</p>
                      <audio :src="getMediaUrl(mediaUrl)" controls class="w-full mt-1">
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  </div>
                  
                  <!-- Other Files -->
                  <div v-else
                  @click="downloadFile(mediaUrl, getFileName(mediaUrl))"
                   class="bg-[#1a1a1a] p-3 rounded-lg cursor-pointer flex items-center gap-3 max-w-xs">
                    <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                    </svg>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-white truncate">{{ getFileName(mediaUrl) }}</p>
                      <p class="text-xs text-white/50">{{ getFileExtension(mediaUrl).toUpperCase() }} file</p>
                    </div>
                    <!-- <div class="flex gap-1">
                      <button 
                        @click="window.open(getMediaUrl(mediaUrl), '_blank')"
                        class="text-white/70 hover:text-blue-400 p-1 rounded transition-colors"
                        title="Open"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                      </button>
                      <button 
                        @click="downloadFile(mediaUrl, getFileName(mediaUrl))"
                        class="text-white/70 hover:text-green-400 p-1 rounded transition-colors"
                        title="Download"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3"/>
                        </svg>
                      </button>
                    </div> -->
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
                <svg class="w-4 h-4 text-white/70 -ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
              <svg v-else-if="message.status === 'read'" class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <svg v-else-if="message.status === 'failed'" class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="isTyping" class="flex items-start gap-2 max-w-[70%]">
        <div class="w-8 h-8 bg-white/10 rounded-full flex-shrink-0"></div>
        <div class="bg-[#2C2F36] px-3 py-2 rounded-lg">
          <div class="flex items-center gap-1">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-white/50 rounded-full animate-bounce"></div>
              <div class="w-2 h-2 bg-white/50 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-white/50 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
            <span class="text-xs text-white/70 ml-2">{{ typingUsers.join(', ') }} typing...</span>
          </div>
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
    <div class="p-3 border-t border-white/10 bg-[#2B3442]" :class="isMobile ? '' : 'rounded-br-2xl'">
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
              ? 'bg-[#055CFF] text-white hover:bg-[#0550e5]' 
              : 'bg-white/10 text-white/40 cursor-not-allowed'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Scroll to bottom button -->
    <button
      v-if="showScrollToBottom"
      @click="scrollToBottom(true)"
      class="absolute bottom-20 right-6 bg-[#055CFF] p-2 rounded-full shadow-lg hover:bg-[#0550e5] transition-colors z-10"
    >
      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
      </svg>
    </button>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
      @change="handleFileSelect"
      class="hidden"
    />
  </main>

  <!-- Empty State -->
  <main v-else class="flex-1 flex items-center justify-center bg-[#141619]" :class="isMobile ? 'h-full' : 'rounded-r-2xl'">
    <div class="text-center text-white/50">
      <svg class="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
      <p class="text-lg font-medium mb-2">Select a conversation</p>
      <p class="text-sm">Choose from your existing conversations or start a new one</p>
    </div>
  </main>

  <!-- Image Modal -->
  <div 
    v-if="imageModal" 
    @click="closeImageModal"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
  >
    <img 
      :src="selectedImage"
      alt="Expanded image"
      class="max-w-full max-h-full object-contain rounded-lg"
      @click.stop
    />
    <button 
      @click="closeImageModal"
      class="absolute top-4 right-4 text-white/70 hover:text-white text-2xl"
    >
      ×
    </button>
  </div>

  <!-- Group Info Modal -->
  <GroupInfoModal
    :show="showGroupInfoModal"
    :conversation="currentConversation"
    :is-admin="isGroupAdmin"
    @close="closeGroupInfoModal"
    @edit-group="handleEditGroup"
    @add-members="handleAddMembers"
    @manage-members="handleManageMembers"
    @leave-group="handleLeaveGroup"
  />
</template>