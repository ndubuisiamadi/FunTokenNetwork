// src/components/NavigationBar.vue - FIXED REACTIVITY VERSION
<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth' 

// Accept the class prop
defineProps({
  class: {
    type: String,
    default: ''
  }
})

const route = useRoute()
const messagesStore = useMessagesStore()
const usersStore = useUsersStore()
const authStore = useAuthStore()

const isNotLoggedIn = (routePath) => {
  return route.path === routePath
}

// 🔥 ENHANCED: More reactive unread count
const totalUnreadCount = computed(() => {
  // Depend on the store's unread count trigger
  const _ = messagesStore.unreadCountUpdateTrigger
  
  if (!messagesStore.conversations || messagesStore.conversations.length === 0) {
    return 0
  }
  
  const count = messagesStore.conversations.reduce((total, conversation) => {
    return total + (conversation.unreadCount || 0)
  }, 0)
  
  console.log('📊 NavigationBar: Total unread count computed:', count, {
    conversationsCount: messagesStore.conversations.length,
    unreadTrigger: messagesStore.unreadCountUpdateTrigger
  })
  
  return count
})

// 🔥 FIXED: Use conversation count instead of message count
const totalUnreadChats = computed(() => {
  if (!authStore.isLoggedIn) return 0
  
  // Use the new getter that counts conversations, not messages
  return messagesStore.totalChatsWithUnread || 0
})

// Computed property to format the count (99+ for large numbers)
const formattedUnreadCount = computed(() => {
  const count = totalUnreadChats.value
  return count > 99 ? '99+' : count.toString()
})

// Computed properties for friend requests
const totalFriendRequestsCount = computed(() => {
  return usersStore.receivedRequests?.length || 0
})

const formattedFriendRequestsCount = computed(() => {
  const count = totalFriendRequestsCount.value
  return count > 99 ? '99+' : count.toString()
})

// 🔥 REDUCED: Much less frequent periodic check since store is now more reliable
let periodicCheckInterval = null

const startPeriodicCheck = () => {
  periodicCheckInterval = setInterval(() => {
    if (authStore.isLoggedIn && messagesStore.conversations.length > 0) {
      console.log('🔄 NavigationBar: Periodic check for unread chats (every 5 minutes)')
      // Only refresh if we suspect there might be an issue
      messagesStore.refreshUnreadCounts?.()
    }
  }, 300000) // 🔥 CHANGED: Every 5 minutes instead of 30 seconds
}

const stopPeriodicCheck = () => {
  if (periodicCheckInterval) {
    clearInterval(periodicCheckInterval)
    periodicCheckInterval = null
  }
}

onMounted(async () => {
  console.log('📱 NavigationBar: Component mounted')
  
  // Initialize messages store for unread counts if user is logged in
  if (authStore.isLoggedIn && messagesStore.conversations.length === 0) {
    console.log('📱 NavigationBar: Initializing messages store for unread counts')
    try {
      await messagesStore.fetchConversations()
    } catch (error) {
      console.error('❌ NavigationBar: Failed to initialize messages for badge:', error)
    }
  }
  
  // Start periodic checks (much less frequent now)
  startPeriodicCheck()
})

// 🔥 SIMPLIFIED: Basic watchers
watch(() => authStore.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    startPeriodicCheck()
    // Trigger initial load after a delay
    setTimeout(() => {
      if (messagesStore.conversations.length === 0) {
        messagesStore.fetchConversations()
      }
    }, 1000)
  } else {
    stopPeriodicCheck()
  }
})

// 🔥 DEBUG: Watch for actual data changes
watch(() => messagesStore.totalChatsWithUnread, (newCount, oldCount) => {
  if (newCount !== oldCount) {
    console.log('🔄 NavigationBar: Unread chats count changed:', { from: oldCount, to: newCount })
  }
})

onUnmounted(() => {
  stopPeriodicCheck()
})
</script>

<template>
    <!-- Desktop Navigation (Vertical Sidebar) -->
    <nav class="hidden h-3/4 my-3 ml-3 sm:flex flex-col gap-16 items-center rounded-2xl
    bg-[#030712]/20
    p-4 h-full min-h-0 flex-shrink-0" style="width: 80px;">
        <RouterLink to="/">
            <img class="size-10" src="@/assets/logo.png" alt="FunToken Logo">
        </RouterLink>
        
        <div class="flex flex-col gap-4">
            <RouterLink to="/"
            :class="[isNotLoggedIn('/') ? 
            'bg-linear-to-tr from-[#9E03FF] to-[#082CFC] backdrop-blur-xl' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#9E03FF] to-[#082CFC] backdrop-blur-xl', 'rounded-full']"
            >
                <img v-if="!isNotLoggedIn('/')" class="size-9 p-2" src="@/components/icons/home-line.svg">
                <img v-if="isNotLoggedIn('/')" class="size-9 p-2" src="@/components/icons/home-filled.svg">
            </RouterLink>
            <RouterLink to="/earnings"
            :class="[isNotLoggedIn('/earnings') ? 
            'bg-linear-to-tr from-[#00B043] to-[#195E00] backdrop-blur-xl' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#00B043] to-[#195E00] backdrop-blur-xl', 'rounded-full']"
            >
                <img v-if="!isNotLoggedIn('/earnings')" class="size-9 p-2" src="@/components/icons/gumballs-lined.svg">
                <img v-if="isNotLoggedIn('/earnings')" class="size-9 p-2" src="@/components/icons/gumballs-filled.svg">
            </RouterLink>
            <RouterLink to="/messages" 
            :class="[isNotLoggedIn('/messages') ? 
            'bg-linear-to-tr from-[#055DFF] to-[#00BFFF]' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#055DFF] to-[#00BFFF] backdrop-blur-xl', 'rounded-full']"
            class="relative">
                <img v-if="!isNotLoggedIn('/messages')" class="size-9 p-2" src="@/components/icons/message-line.svg">
                <img v-if="isNotLoggedIn('/messages')" class="size-9 p-2" src="@/components/icons/message-filled.svg">
                <!-- 🔥 ENHANCED: Counter Badge with key for reactivity -->
                <div 
                  v-if="totalUnreadChats > 0"
                  class="absolute -top-1 -right-1 bg-[#055CFF] text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium"
                >
                  {{ formattedUnreadCount }}
                </div>
            </RouterLink>
            <RouterLink to="/communities"
            :class="[isNotLoggedIn('/communities') ? 
            'bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] backdrop-blur-xl' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] backdrop-blur-xl', 'rounded-full']"
            class="relative"
            >
                <img v-if="!isNotLoggedIn('/communities')" class="size-9 p-2" src="@/components/icons/community-line.svg">
                <img v-if="isNotLoggedIn('/communities')" class="size-9 p-2" src="@/components/icons/community-filled.svg">
            </RouterLink>
            <RouterLink to="/friends"
            :class="[isNotLoggedIn('/friends') ? 
            'bg-linear-to-tr from-[#7A0000] to-[#FA7D7D] backdrop-blur-xl' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#7A0000] to-[#FA7D7D] backdrop-blur-xl', 'rounded-full']"
            class="relative">
                <img v-if="!isNotLoggedIn('/friends')" class="size-9 p-2" src="@/components/icons/friends-line.svg">
                <img v-if="isNotLoggedIn('/friends')" class="size-9 p-2" src="@/components/icons/friends-filled.svg">
                <!-- Friend Requests Counter Badge -->
                <div 
                  v-if="totalFriendRequestsCount > 0"
                  class="absolute -top-1 -right-1 bg-[#FA7D7D] text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium"
                >
                  {{ formattedFriendRequestsCount }}
                </div>
            </RouterLink>
            <RouterLink to="/leaderboard"
            :class="[isNotLoggedIn('/leaderboard') ? 
            'bg-linear-to-tr from-[#FCCA00] to-[#82681A] backdrop-blur-xl' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#FCCA00] to-[#82681A] backdrop-blur-xl', 'rounded-full']"
            >
                <img v-if="!isNotLoggedIn('/leaderboard')" class="size-9 p-2" src="@/components/icons/ranking-line.svg">
                <img v-if="isNotLoggedIn('/leaderboard')" class="size-9 p-2" src="@/components/icons/ranking-filled.svg">
            </RouterLink>
        </div>
    </nav>
    
    <!-- Mobile Navigation (Bottom Bar) -->
    <nav class="sm:hidden bottom-0 left-0 right-0 z-50 rounded-t-2xl
    bg-[#030712]/20 backdrop-blur-xl lg:border lg:border-white/20 lg:shadow-2xl
     border-t border-white/10 px-4 py-2 ">
        <div class="flex justify-center">
            <div class="flex justify-around items-center gap-2 max-w-sm w-full">
                <RouterLink to="/" 
                class="flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/') ? 'bg-linear-to-tr from-[#9E03FF] to-[#082CFC] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/')" class="size-6" src="@/components/icons/home-line.svg">
                    <img v-if="isNotLoggedIn('/')" class="size-6" src="@/components/icons/home-filled.svg">
                </RouterLink>
                
                <RouterLink to="/earnings" 
                class="flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/earnings') ? 'bg-linear-to-tr from-[#00B043] to-[#195E00] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/earnings')" class="size-6" src="@/components/icons/gumballs-lined.svg">
                    <img v-if="isNotLoggedIn('/earnings')" class="size-6" src="@/components/icons/gumballs-filled.svg">
                </RouterLink>
                
                <RouterLink to="/messages" 
                class="relative flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/messages') ? 'bg-linear-to-tr from-[#055DFF] to-[#00BFFF] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/messages')" class="size-6" src="@/components/icons/message-line.svg">
                    <img v-if="isNotLoggedIn('/messages')" class="size-6" src="@/components/icons/message-filled.svg">
                    <!-- 🔥 ENHANCED: Mobile Counter Badge with key for reactivity -->
                    <div 
                      v-if="totalUnreadChats > 0"
                      class="absolute -top-1 right-1 bg-[#055CFF] text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 font-medium text-[10px]"
                    >
                      {{ formattedUnreadCount }}
                    </div>
                </RouterLink>
                
                <RouterLink to="/communities" 
                class="flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/communities') ? 'bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/communities')" class="size-6" src="@/components/icons/community-line.svg">
                    <img v-if="isNotLoggedIn('/communities')" class="size-6" src="@/components/icons/community-filled.svg">
                </RouterLink>
                
                <RouterLink to="/friends" 
                class="relative flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/friends') ? 'bg-linear-to-tr from-[#7A0000] to-[#FA7D7D] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/friends')" class="size-6" src="@/components/icons/friends-line.svg">
                    <img v-if="isNotLoggedIn('/friends')" class="size-6" src="@/components/icons/friends-filled.svg">
                    <!-- Friend Requests Counter Badge -->
                    <div 
                      v-if="totalFriendRequestsCount > 0"
                      class="absolute -top-1 right-1 bg-[#FA7D7D] text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 font-medium text-[10px]"
                    >
                      {{ formattedFriendRequestsCount }}
                    </div>
                </RouterLink>

                <RouterLink to="/leaderboard" 
                class="flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/leaderboard') ? 'bg-linear-to-tr from-[#FCCA00] to-[#82681A] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/leaderboard')" class="size-6" src="@/components/icons/ranking-line.svg">
                    <img v-if="isNotLoggedIn('/leaderboard')" class="size-6" src="@/components/icons/ranking-filled.svg">
                </RouterLink>
            </div>
        </div>
    </nav>
</template>