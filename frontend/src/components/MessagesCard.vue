<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import { getAvatarUrl, getMediaUrl } from '@/utils/avatar'

const messagesStore = useMessagesStore()
const authStore = useAuthStore()

// Helper function to format time
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  if (isToday) {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  } else {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()
    
    if (isYesterday) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }
}

// Helper function to get conversation display name
const getConversationName = (conversation) => {
  if (conversation.isGroup) {
    return conversation.name || 'Group Chat'
  }
  
  const otherParticipant = conversation.otherParticipant
  if (otherParticipant) {
    if (otherParticipant.firstName || otherParticipant.lastName) {
      return `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim()
    }
    return otherParticipant.username
  }
  
  return 'Unknown'
}

// Helper function to get conversation avatar
const getConversationAvatar = (conversation) => {
  if (conversation.isGroup) {
    // Use your avatar utility with proper fallback
    return getAvatarUrl(conversation.avatarUrl)
  }
  
  const otherParticipant = conversation.otherParticipant
  if (otherParticipant?.avatarUrl) {
    // Use your avatar utility
    return getAvatarUrl(otherParticipant.avatarUrl)
  }
  
  // If no avatar, fall back to your default (this will return userPlaceholderImage)
  return getAvatarUrl(null)
}

// Helper function to format last message
const formatLastMessage = (conversation) => {
  if (!conversation.lastMessageData) {
    return 'No messages yet'
  }
  
  const message = conversation.lastMessageData
  
  // Handle media messages
  if (message.mediaUrls && message.mediaUrls.length > 0) {
    return '📎 Media message'
  }
  
  // Handle text messages
  if (message.content) {
    return message.content.length > 30 
      ? message.content.substring(0, 30) + '...'
      : message.content
  }
  
  return 'No content'
}

// Get recent conversations (limit to 4 for the card)
const recentConversations = computed(() => {
  return messagesStore.conversations.slice(0, 4)
})

// Load conversations on mount if not already loaded
onMounted(async () => {
  if (messagesStore.conversations.length === 0) {
    await messagesStore.fetchConversations()
  }
})
</script>

<template>
    <div class="bg-[#212121] bg-[url(@/assets/messages-card-bg.png)] bg-cover text-white p-5 rounded-[18px] shadow-[0_4px_0px_#055CFF]">
        <div class="flex justify-between items-center mb-5">
            <div class="flex items-center gap-2 text-lg font-medium">
            <img src="@/components/icons/chatsteardrop.svg" alt="Check" class="size-6" />
            <span>Messages</span>
            </div>
            <RouterLink to="/messages" class="text-xs text-white/80 hover:underline">View All</RouterLink>
        </div>

        <div class="space-y-3">
            <!-- Show loading state -->
            <div v-if="messagesStore.loading" class="space-y-3">
                <div v-for="i in 4" :key="i" class="flex items-center gap-2 animate-pulse">
                    <div class="size-8 rounded-full bg-white/20"></div>
                    <div class="flex-1">
                        <div class="h-3 bg-white/20 rounded mb-1"></div>
                        <div class="h-2 bg-white/20 rounded w-2/3"></div>
                    </div>
                </div>
            </div>

            <!-- Show conversations -->
            <RouterLink 
                v-for="conversation in recentConversations" 
                :key="conversation.id"
                to="/messages" 
                class="flex items-center gap-2 hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors"
            >
                <img 
                    :src="getConversationAvatar(conversation)" 
                    :alt="getConversationName(conversation)" 
                    class="size-8 rounded-full" 
                />
                <div class="w-full">
                    <div class="flex justify-between w-full">
                        <p class="text-xs truncate">{{ getConversationName(conversation) }}</p>
                        <p class="text-xs opacity-50">{{ formatTime(conversation.lastMessageTime) }}</p>
                    </div>
                    <div class="flex justify-between items-center">
                        <p class="text-[11px] opacity-50 truncate">{{ formatLastMessage(conversation) }}</p>
                        <div 
                            v-if="conversation.unreadCount > 0"
                            class="flex text-[10px] bg-[#055CFF] size-[14px] justify-center items-center text-center rounded-full"
                        >
                            {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
                        </div>
                    </div>
                </div>
            </RouterLink>

            <!-- Show empty state if no conversations -->
            <div v-if="!messagesStore.loading && recentConversations.length === 0" class="text-center py-4">
                <p class="text-xs opacity-50">No conversations yet</p>
                <RouterLink to="/messages" class="text-xs text-[#055CFF] hover:underline">
                    Start a conversation
                </RouterLink>
            </div>
        </div>
    </div>
</template>