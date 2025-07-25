<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import { friendsAPI, uploadAPI } from '@/services/api'
import { useRouter } from 'vue-router'
import { getConversationStatusDisplay, shouldShowMessageStatus } from '@/utils/messageStatus'

const router = useRouter()

const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['conversationSelected', 'newConversation'])

const messagesStore = useMessagesStore()
const authStore = useAuthStore()

// Refs
const searchInput = ref('')
const newConversationModal = ref(false)
const conversationType = ref('direct')
const selectedUsers = ref([])
const groupName = ref('')
const friendsSearchQuery = ref('')
const loadingFriends = ref(false)
const creatingConversation = ref(false)
const availableFriends = ref([])
const groupAvatarPreview = ref('')
const groupAvatarFile = ref(null)
const avatarInput = ref(null)
const uploadingAvatar = ref(false)

// Simple computed properties
const conversations = computed(() => {
  let filtered = messagesStore.selectedChatType === 'direct' 
    ? messagesStore.conversations.filter(c => !c.isGroup)
    : messagesStore.conversations.filter(c => c.isGroup)

  if (messagesStore.searchQuery.trim()) {
    const query = messagesStore.searchQuery.toLowerCase()
    filtered = filtered.filter(conv => {
      const name = getConversationName(conv)
      return name?.toLowerCase().includes(query)
    })
  }
  
  return filtered
})

const currentConversation = computed(() => messagesStore.currentConversation)

const directUnreadCount = computed(() => {
  return messagesStore.directChatsWithUnread || 0
})

const groupUnreadCount = computed(() => {
  return messagesStore.groupChatsWithUnread || 0
})

const filteredFriends = computed(() => {
  if (!friendsSearchQuery.value.trim()) {
    return availableFriends.value
  }
  
  const query = friendsSearchQuery.value.toLowerCase()
  return availableFriends.value.filter(friend => 
    (friend.firstName || '').toLowerCase().includes(query) ||
    (friend.lastName || '').toLowerCase().includes(query) ||
    friend.username.toLowerCase().includes(query)
  )
})

const canCreateConversation = computed(() => {
  if (conversationType.value === 'direct') {
    return selectedUsers.value.length === 1
  } else {
    return selectedUsers.value.length >= 1 && groupName.value.trim().length > 0
  }
})

// Helper functions
const formatUnreadCount = (count) => {
  return count > 99 ? '99+' : count.toString()
}

const formatTime = (date) => {
  try {
    if (!date) return ''
    
    const messageDate = new Date(date)
    const now = new Date()
    
    if (isNaN(messageDate.getTime())) {
      return 'Unknown Time'
    }
    
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting time:', error, 'Date:', date)
    return 'Unknown Time'
  }
}

const selectConversation = async (conversation) => {
  try {
    const result = await messagesStore.selectConversation(conversation.id)
    
    if (result.success) {
      emit('conversationSelected', conversation)
      
      if (props.isMobile) {
        setTimeout(() => {
          emit('conversationSelected', conversation)
        }, 100)
      }
    }
  } catch (error) {
    console.error('❌ ConversationSidebar: Error selecting conversation:', error)
  }
}

const createConversation = async () => {
  if (!canCreateConversation.value || creatingConversation.value) return

  creatingConversation.value = true
  let groupAvatarUrl = null

  try {
    if (groupAvatarFile.value) {
      uploadingAvatar.value = true
      
      try {
        const uploadResponse = await uploadAPI.uploadAvatar(groupAvatarFile.value)
        groupAvatarUrl = uploadResponse.data.url
      } catch (uploadError) {
        console.error('Avatar upload failed:', uploadError)
        alert('Failed to upload group avatar. Creating group without avatar.')
      } finally {
        uploadingAvatar.value = false
      }
    }
    
    const isGroup = conversationType.value === 'group'
    const participantIds = selectedUsers.value.map(user => user.id)
    
    const result = await messagesStore.createConversation(
      participantIds,
      isGroup,
      isGroup ? groupName.value.trim() : null,
      groupAvatarUrl
    )
    
    if (result.success) {
      closeNewConversationModal()
      emit('newConversation', result.conversation)
    } else {
      alert('Failed to create conversation: ' + result.error)
    }
  } catch (error) {
    console.error('Error creating conversation:', error)
    alert('Error creating conversation: ' + (error.message || 'Unknown error'))
  } finally {
    creatingConversation.value = false
    uploadingAvatar.value = false
  }
}

const handleSearch = (query) => {
  messagesStore.setSearchQuery(query)
}

const clearSearch = () => {
  searchInput.value = ''
  messagesStore.setSearchQuery('')
}

const openNewConversationModal = async () => {
  newConversationModal.value = true
  selectedUsers.value = []
  groupName.value = ''
  friendsSearchQuery.value = ''
  conversationType.value = 'direct'
  removeGroupAvatar()
  
  await loadFriends()
}

const closeNewConversationModal = () => {
  newConversationModal.value = false
  selectedUsers.value = []
  groupName.value = ''
  friendsSearchQuery.value = ''
  conversationType.value = 'direct'
  removeGroupAvatar()
}

const loadFriends = async () => {
  loadingFriends.value = true
  
  try {
    const response = await friendsAPI.getFriends()
    availableFriends.value = response.data.friends || []
  } catch (error) {
    console.error('Failed to load friends:', error)
    availableFriends.value = []
  } finally {
    loadingFriends.value = false
  }
}

const toggleUserSelection = (user) => {
  const index = selectedUsers.value.findIndex(u => u.id === user.id)
  
  if (conversationType.value === 'direct') {
    selectedUsers.value = index === -1 ? [user] : []
  } else {
    if (index === -1) {
      selectedUsers.value.push(user)
    } else {
      selectedUsers.value.splice(index, 1)
    }
  }
}

const isUserSelected = (user) => {
  return selectedUsers.value.some(u => u.id === user.id)
}

const triggerAvatarUpload = () => {
  avatarInput.value?.click()
}

const handleAvatarUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('Image size must be less than 5MB')
    return
  }

  groupAvatarFile.value = file
  groupAvatarPreview.value = URL.createObjectURL(file)
}

const removeGroupAvatar = () => {
  groupAvatarFile.value = null
  groupAvatarPreview.value = ''
  if (avatarInput.value) {
    avatarInput.value.value = ''
  }
}

// Conversation helper functions
const getConversationPreview = (conversation) => {
  if (!conversation.lastMessage && (!conversation.lastMessageData?.mediaUrls || conversation.lastMessageData.mediaUrls.length === 0)) {
    return 'No messages yet'
  }

  const lastMessage = conversation.lastMessageData || {}

  if (lastMessage.mediaUrls && lastMessage.mediaUrls.length > 0) {
    if (lastMessage.content && lastMessage.content.trim()) {
      return lastMessage.content.trim()
    } else {
      return '📎 Media'
    }
  }

  return conversation.lastMessage || 'No messages yet'
}

const isOnline = (conversation) => {
  if (!conversation || conversation.isGroup) return false
  if (!conversation.otherParticipant?.id) return false
  
  // 🔥 USE REAL-TIME ONLINE STATUS from messages store
  return messagesStore.isUserOnline(conversation.otherParticipant.id)
}

const getConversationName = (conversation) => {
  if (!conversation) return 'Unknown Conversation'
  
  if (conversation.isGroup) {
    return conversation.name || 'Group Chat'
  }
  
  const other = conversation.otherParticipant
  if (!other) return 'Unknown User'
  
  return `${other.firstName || ''} ${other.lastName || ''}`.trim() || other.username || 'Unknown User'
}

const getConversationAvatar = (conversation) => {
  if (!conversation) return 'https://randomuser.me/api/portraits/men/32.jpg'
  
  if (conversation.isGroup) {
    return conversation.avatarUrl || 
           'https://ui-avatars.com/api/?name=' + encodeURIComponent(conversation.name || 'Group') + '&background=055CFF&color=fff&size=40'
  }
  
  return conversation.otherParticipant?.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'
}

const getConversationUnreadCount = (conversation) => {
  if (!conversation) return 0
  return conversation.unreadCount || 0
}

// SIMPLIFIED: Get status display for conversation preview
const getConversationStatus = (conversation) => {
  const currentUserId = authStore.currentUser?.id
  return getConversationStatusDisplay(conversation.lastMessageData, currentUserId)
}

// SIMPLIFIED: Check if status should be shown for last message
const shouldShowLastMessageStatus = (conversation) => {
  const currentUserId = authStore.currentUser?.id
  return shouldShowMessageStatus(conversation.lastMessageData, currentUserId)
}

const handleConversationClick = async (conversation) => {
  if (props.isMobile) {
    router.push(`/chat/${conversation.id}`)
  } else {
    await selectConversation(conversation)
  }
}

onMounted(() => {
  // Load conversations if needed
  if (authStore.isLoggedIn && messagesStore.conversations.length === 0) {
    messagesStore.fetchConversations().catch(console.error)
  }
})
</script>

<template>
  <aside class="w-full md:w-80 bg-[#262624] md:bg-[#030712]/20 flex flex-col" :class="isMobile ? 'h-full' : 'rounded-l-2xl'">
    <!-- Header -->
    <div class="px-3 pb-3 md:p-4 border-b border-white/10">
      <!-- Mobile Header -->
      <div v-if="isMobile" class="flex items-center justify-between my-2">
        <h1 class="text-[1.8em]! font-semibold text-[#00BFFF]">
          {{ messagesStore.selectedChatType === 'direct' ? 'Chats' : 'Groups' }}
        </h1>
        
        <!-- Chat Type Tabs -->
        <div class="flex bg-[#2C2F36] rounded-full p-1">
          <button
            @click="messagesStore.selectedChatType = 'direct'"
            :class="[
              'flex-1 size-10 p-3 rounded-full text-sm font-medium transition-all duration-200 relative cursor-pointer',
              messagesStore.selectedChatType === 'direct'
                ? 'bg-linear-to-tr from-[#055DFF] to-[#00BFFF] text-white shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            ]"
          >
            <div class="flex items-center justify-center gap-2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              
              <div 
                v-if="directUnreadCount > 0"
                class="bg-white text-[#055CFF] text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold ml-1"
              >
                {{ formatUnreadCount(directUnreadCount) }}
              </div>
            </div>
          </button>
          
          <button
            @click="messagesStore.selectedChatType = 'group'"
            :class="[
              'flex-1 size-10 p-3 rounded-full text-sm font-medium transition-all duration-200 relative cursor-pointer',
              messagesStore.selectedChatType === 'group'
                ? 'bg-linear-to-tr from-[#055DFF] to-[#00BFFF] text-white shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            ]"
          >
            <div class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              
              <div 
                v-if="groupUnreadCount > 0"
                class="bg-white text-[#055CFF] text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold ml-1"
              >
                {{ formatUnreadCount(groupUnreadCount) }}
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Desktop Header -->
      <div v-if="!isMobile" class="flex items-center justify-between mb-4">
        <h1 class="!text-3xl font-semibold text-[#00BFFF]">
          {{ messagesStore.selectedChatType === 'direct' ? 'Chats' : 'Groups' }}
        </h1>

        <div class="flex gap-2 items-center">
          <!-- Desktop Chat Type Tabs -->
          <div class="flex bg-[#2C2F36] rounded-full p-1">
            <button
              @click="messagesStore.selectedChatType = 'direct'"
              :class="[
                'flex-1 py-1.5 px-2 rounded-full text-sm font-medium transition-all duration-200 relative cursor-pointer',
                messagesStore.selectedChatType === 'direct'
                  ? 'bg-linear-to-tr from-[#055DFF] to-[#00BFFF] text-white shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              ]"
            >
              <div class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                
                <div 
                  v-if="directUnreadCount > 0"
                  class="bg-white text-[#055CFF] text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold ml-1"
                >
                  {{ formatUnreadCount(directUnreadCount) }}
                </div>
              </div>
            </button>
            
            <button
              @click="messagesStore.selectedChatType = 'group'"
              :class="[
                'flex-1 py-1.5 px-2 rounded-full text-sm font-medium transition-all duration-200 relative cursor-pointer',
                messagesStore.selectedChatType === 'group'
                  ? 'bg-linear-to-tr from-[#055DFF] to-[#00BFFF] text-white shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              ]"
            >
              <div class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                
                <div 
                  v-if="groupUnreadCount > 0"
                  class="bg-white text-[#055CFF] text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold ml-1"
                >
                  {{ formatUnreadCount(groupUnreadCount) }}
                </div>
              </div>
            </button>
          </div>
          
          <button 
            @click="openNewConversationModal"
            class="w-8 h-8 bg-linear-to-tr from-[#055DFF] to-[#00BFFF] hover:bg-[#0550e5] rounded-full flex items-center justify-center transition-colors cursor-pointer" 
            title="New chat"
          >
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Search -->
      <div class="relative">
        <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          v-model="searchInput"
          @input="handleSearch(searchInput)"
          type="text"
          placeholder="Search conversations..."
          class="w-full bg-[#2a2a2a] rounded-md pl-10 pr-8 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#055CFF] text-white placeholder-white/50"
        >
        <button 
          v-if="searchInput"
          @click="clearSearch"
          class="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Mobile New Chat Button -->
      <button 
        v-if="isMobile"
        @click="openNewConversationModal"
        class="size-12 p-2 bg-linear-to-tr from-[#055DFF] to-[#00BFFF] hover:bg-[#0550e5] rounded-full flex items-center justify-center transition-colors cursor-pointer absolute right-6 bottom-20" 
        title="New chat"
      >
        <svg class="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
      </button>
    </div>
    
    <!-- Loading State -->
    <div v-if="messagesStore.loading && conversations.length === 0" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-3 text-white/60">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#055CFF]"></div>
        <span>Loading conversations...</span>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="conversations.length === 0" class="flex-1 flex items-center justify-center p-4">
      <div class="text-center text-white/50">
        <svg class="w-12 h-12 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <p class="text-sm font-medium mb-2">
          {{ messagesStore.selectedChatType === 'direct' ? 'No direct chats yet' : 'No group chats yet' }}
        </p>
        <p class="text-xs">
          {{ messagesStore.selectedChatType === 'direct' ? 'Start a conversation with a friend' : 'Create your first group chat' }}
        </p>
      </div>
    </div>
    
    <!-- Conversations List -->
    <div v-else class="flex-1 overflow-y-auto scrollbar-hide">
      <ul class="divide-y divide-white/5">
        <li 
          v-for="conversation in conversations" 
          :key="conversation.id"
          @click="handleConversationClick(conversation)"
          :class="[
            'flex items-center gap-3 py-4 px-3 hover:bg-[#2C2F36] cursor-pointer transition-colors',
            currentConversation?.id === conversation.id ? 'md:bg-[#2C2F36]' : ''
          ]"
        >
          <div class="relative flex-shrink-0">
            <img 
              :src="getConversationAvatar(conversation)" 
              :alt="getConversationName(conversation)"
              class="w-12 h-12 rounded-full object-cover"
            />
            <div 
              v-if="!conversation.isGroup && conversation.otherParticipant && isOnline(conversation)"
              class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1A1A]"
            ></div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <h3 class="font-medium text-sm text-white truncate">
                {{ getConversationName(conversation) }}
              </h3>
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-white/50">
                  {{ formatTime(conversation.lastMessageTime) }}
                </span>
              </div>
            </div>
            
            <div class="flex justify-between gap-3 items-center">
              <p class="text-xs text-white/60 truncate">
                {{ getConversationPreview(conversation) }}
              </p>
              
              <!-- SIMPLIFIED: Message Status for Last Message -->
              <div v-if="shouldShowLastMessageStatus(conversation)" class="flex-shrink-0">
                <template v-if="getConversationStatus(conversation)">
                  <div :class="getConversationStatus(conversation).color" :title="getConversationStatus(conversation).tooltip">
                    
                    <!-- Loading -->
                    <div 
                      v-if="getConversationStatus(conversation).icon === 'clock'"
                      class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"
                    ></div>
                    
                    <!-- Error -->
                    <svg 
                      v-else-if="getConversationStatus(conversation).icon === 'error'"
                      class="w-3 h-3" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    
                    <!-- Single tick -->
                    <svg 
                      v-else-if="getConversationStatus(conversation).ticks === 1"
                      class="w-3 h-3" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    
                    <!-- Double ticks -->
                    <div 
                      v-else-if="getConversationStatus(conversation).ticks === 2"
                      class="flex"
                    >
                      <svg class="w-3 h-3" :class="getConversationStatus(conversation).color" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                      <svg class="w-3 h-3 -ml-1" :class="getConversationStatus(conversation).color" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                    
                  </div>
                </template>
              </div>
              
              <!-- Unread Count Badge -->
              <div 
                v-if="getConversationUnreadCount(conversation) > 0"
                class="bg-[#055CFF] text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold transition-all duration-200"
              >
                {{ formatUnreadCount(getConversationUnreadCount(conversation)) }}
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- New Conversation Modal -->
    <div 
      v-if="newConversationModal" 
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click="closeNewConversationModal"
    >
      <div 
        @click.stop
        class="bg-[#1A1A1A] rounded-2xl w-full max-w-lg h-[600px] flex flex-col overflow-hidden"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-3 border-b border-white/10">
          <h3 class="text-xl font-semibold text-white">New Conversation</h3>
          <button 
            @click="closeNewConversationModal"
            class="text-white/50 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        <!-- Modal Content -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-6 space-y-6">
            <!-- Conversation Type Selector -->
            <div class="flex gap-2">
              <button
                @click="conversationType = 'direct'"
                :class="[
                  'flex-1 flex p-2 justify-center items-center gap-2 rounded-lg text-xs font-medium transition-colors',
                  conversationType === 'direct' 
                    ? 'bg-[#055CFF] text-white' 
                    : 'bg-[#2C2F36] text-white/70 hover:text-white hover:bg-[#3C3F46]'
                ]"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Direct Chat
              </button>
              <button
                @click="conversationType = 'group'"
                :class="[
                  'flex-1 flex p-2 justify-center items-center gap-2 py-3 px-4 rounded-lg text-xs font-medium transition-colors',
                  conversationType === 'group' 
                    ? 'bg-[#055CFF] text-white' 
                    : 'bg-[#2C2F36] text-white/70 hover:text-white hover:bg-[#3C3F46]'
                ]"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                Group Chat
              </button>
            </div>

            <!-- Group Settings -->
            <div v-if="conversationType === 'group'" class="space-y-4">
              <div class="bg-[#2C2F36] rounded-xl p-4 space-y-4">
                <h4 class="text-sm font-medium text-white/90">Group Details</h4>
                
                <div class="flex items-center gap-4">
                  <div class="relative flex-shrink-0">
                    <div 
                      @click="triggerAvatarUpload"
                      class="w-16 h-16 rounded-full bg-[#1A1A1A] border-2 border-dashed border-white/30 hover:border-[#055CFF] flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden group"
                    >
                      <img 
                        v-if="groupAvatarPreview"
                        :src="groupAvatarPreview"
                        alt="Group avatar"
                        class="w-full h-full object-cover"
                      />
                      <svg v-else class="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    
                    <button 
                      v-if="groupAvatarPreview"
                      @click="removeGroupAvatar"
                      class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                    >
                      <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                    
                    <input
                      ref="avatarInput"
                      type="file"
                      accept="image/*"
                      @change="handleAvatarUpload"
                      class="hidden"
                    />
                  </div>
                  
                  <div class="flex-1">
                    <label class="block text-sm font-medium text-white/90 mb-2">Group Name</label>
                    <input
                      v-model="groupName"
                      type="text"
                      placeholder="Enter group name..."
                      maxlength="50"
                      class="w-full bg-[#1A1A1A] border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-[#055CFF] text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Friends Selection -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium text-white/90">
                  {{ conversationType === 'direct' ? 'Select Friend' : 'Add Members' }}
                </h4>
                <span v-if="conversationType === 'group'" class="text-xs text-white/50">
                  {{ selectedUsers.length }} selected
                </span>
              </div>
              
              <div class="relative">
                <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  v-model="friendsSearchQuery"
                  type="text"
                  placeholder="Search friends..."
                  class="w-full bg-[#2C2F36] border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-[#055CFF] text-xs"
                />
              </div>

              <div v-if="loadingFriends" class="flex items-center justify-center py-8">
                <div class="flex items-center gap-3 text-white/60">
                  <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-[#055CFF]"></div>
                  <span class="text-sm">Loading friends...</span>
                </div>
              </div>

              <div v-else-if="availableFriends.length === 0" class="text-center py-8">
                <svg class="w-12 h-12 mx-auto opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <p class="text-sm text-white/60 mb-2">No friends yet</p>
                <p class="text-xs text-white/40">Add some friends first to start conversations</p>
              </div>

              <div v-else class="max-h-48 overflow-y-auto space-y-2">
                <div v-for="friend in filteredFriends" :key="friend.id">
                  <div 
                    @click="toggleUserSelection(friend)"
                    :class="[
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
                      isUserSelected(friend)
                        ? 'bg-[#055CFF]/20 border border-[#055CFF] shadow-lg' 
                        : 'hover:bg-[#2C2F36] border border-transparent'
                    ]"
                  >
                    <div class="relative">
                      <img 
                        :src="friend.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'" 
                        class="w-10 h-10 rounded-full"
                      >
                      <div 
                        v-if="friend.isOnline"
                        class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1A1A]"
                      ></div>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                      <p class="text-white font-medium truncate">{{ friend.firstName || friend.username }}</p>
                      <p class="text-white/50 text-sm truncate">
                        {{ friend.isOnline ? 'Online' : `@${friend.username}` }}
                      </p>
                    </div>
                    
                    <div class="flex-shrink-0">
                      <div v-if="isUserSelected(friend)" class="text-[#055CFF]">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                      </div>
                      <div v-else class="w-5 h-5 border-2 border-white/30 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="border-t border-white/10 p-6">
          <div class="flex gap-3">
            <button 
              @click="closeNewConversationModal"
              class="flex-1 p-2 bg-[#2C2F36] text-white rounded-lg hover:bg-[#3C3F46] transition-colors font-medium"
            >
              Cancel
            </button>
            <button 
              @click="createConversation"
              :disabled="!canCreateConversation || uploadingAvatar"
              :class="[
                'flex-1 p-2 rounded-lg font-medium transition-all duration-200',
                canCreateConversation && !uploadingAvatar
                  ? 'bg-[#055CFF] text-white hover:bg-[#0550e5]' 
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              ]"
            >
              {{ creatingConversation ? 'Creating...' : (conversationType === 'direct' ? 'Start Chat' : 'Create Group') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>