<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { computed, onMounted, onUnmounted, watch, ref } from 'vue' // FIXED: Added onUnmounted
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

// Force reactivity tracking
const forceReactivity = ref(0)

const isNotLoggedIn = (routePath) => {
  return route.path === routePath
}

// ENHANCED: Reactive unread count with forced updates
const totalUnreadCount = computed(() => {
  // Force reactivity by including multiple reactive sources
  const _ = forceReactivity.value
  const __ = messagesStore.lastUpdate
  
  if (!messagesStore.conversations || messagesStore.conversations.length === 0) {
    return 0
  }
  
  const count = messagesStore.conversations.reduce((total, conversation) => {
    return total + (conversation.unreadCount || 0)
  }, 0)
  
  return count
})

// Computed property to format the count (99+ for large numbers)
const formattedUnreadCount = computed(() => {
  const count = totalUnreadCount.value
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

// Periodic refresh interval
let badgeRefreshInterval = null

// Initialize and set up watchers
onMounted(async () => {
  console.log('🚀 NavigationBar: Component mounted')
  
  if (authStore.isLoggedIn) {
    // Initialize messages store if not already done
    if (messagesStore.conversations.length === 0 && !messagesStore.loading) {
      console.log('📱 NavigationBar: Initializing messages store for unread counts')
      try {
        await messagesStore.fetchConversations()
      } catch (error) {
        console.error('❌ NavigationBar: Failed to initialize messages for badge:', error)
      }
    }

    // Set up periodic refresh as fallback
    badgeRefreshInterval = setInterval(() => {
      forceReactivity.value++
    }, 5000) // Refresh every 5 seconds
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (badgeRefreshInterval) {
    clearInterval(badgeRefreshInterval)
  }
})

// Watch for conversation changes
watch(() => messagesStore.conversations, (newConversations) => {
  if (newConversations) {
    const totalUnread = newConversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0)
    console.log('🔄 NavigationBar: Conversations updated, new unread count:', totalUnread)
    forceReactivity.value++
  }
}, { deep: true })

// Watch for store updates
watch(() => messagesStore.lastUpdate, (newValue) => {
  if (newValue) {
    console.log('🔄 NavigationBar: Store update detected, refreshing badge')
    forceReactivity.value++
  }
})

// Watch for auth changes
watch(() => authStore.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn && messagesStore.conversations.length === 0) {
    messagesStore.fetchConversations()
  }
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
            <!-- Home -->
            <RouterLink to="/"
            :class="[isNotLoggedIn('/') ? 
            'bg-linear-to-tr from-[#9E03FF] to-[#082CFC] backdrop-blur-xl' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#9E03FF] to-[#082CFC] backdrop-blur-xl', 'rounded-full']"
            >
                <img v-if="!isNotLoggedIn('/')" class="size-9 p-2" src="@/components/icons/home-line.svg">
                <img v-if="isNotLoggedIn('/')" class="size-9 p-2" src="@/components/icons/home-filled.svg">
            </RouterLink>

            <!-- Earnings -->
            <RouterLink to="/earnings"
            :class="[isNotLoggedIn('/earnings') ? 
            'bg-linear-to-tr from-[#00B043] to-[#195E00] backdrop-blur-xl' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#00B043] to-[#195E00] backdrop-blur-xl', 'rounded-full']"
            >
                <img v-if="!isNotLoggedIn('/earnings')" class="size-9 p-2" src="@/components/icons/gumballs-lined.svg">
                <img v-if="isNotLoggedIn('/earnings')" class="size-9 p-2" src="@/components/icons/gumballs-filled.svg">
            </RouterLink>

            <!-- ENHANCED: Messages with real-time badge -->
            <RouterLink to="/messages" 
            :class="[isNotLoggedIn('/messages') ? 
            'bg-linear-to-tr from-[#055DFF] to-[#00BFFF]' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#055DFF] to-[#00BFFF] backdrop-blur-xl', 'rounded-full']"
            class="relative">
                <img v-if="!isNotLoggedIn('/messages')" class="size-9 p-2" src="@/components/icons/message-line.svg">
                <img v-if="isNotLoggedIn('/messages')" class="size-9 p-2" src="@/components/icons/message-filled.svg">
                <!-- ENHANCED: Counter Badge with forced reactivity -->
                <div 
                  v-if="totalUnreadCount > 0"
                  class="absolute -top-1 -right-1 bg-[#055CFF] text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium transition-all duration-200"
                  :key="`desktop-badge-${totalUnreadCount}-${forceReactivity}`"
                >
                  {{ formattedUnreadCount }}
                </div>
            </RouterLink>

            <!-- Communities -->
            <RouterLink to="/communities"
            :class="[isNotLoggedIn('/communities') ? 
            'bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] backdrop-blur-xl' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] backdrop-blur-xl', 'rounded-full']"
            class="relative"
            >
                <img v-if="!isNotLoggedIn('/communities')" class="size-9 p-2" src="@/components/icons/community-line.svg">
                <img v-if="isNotLoggedIn('/communities')" class="size-9 p-2" src="@/components/icons/community-filled.svg">
            </RouterLink>

            <!-- Friends -->
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

            <!-- Leaderboard -->
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
                <!-- Home -->
                <RouterLink to="/" 
                class="flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/') ? 'bg-linear-to-tr from-[#9E03FF] to-[#082CFC] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/')" class="size-6" src="@/components/icons/home-line.svg">
                    <img v-if="isNotLoggedIn('/')" class="size-6" src="@/components/icons/home-filled.svg">
                </RouterLink>
                
                <!-- Earnings -->
                <RouterLink to="/earnings" 
                class="flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/earnings') ? 'bg-linear-to-tr from-[#00B043] to-[#195E00] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/earnings')" class="size-6" src="@/components/icons/gumballs-lined.svg">
                    <img v-if="isNotLoggedIn('/earnings')" class="size-6" src="@/components/icons/gumballs-filled.svg">
                </RouterLink>
                
                <!-- ENHANCED: Messages with real-time mobile badge -->
                <RouterLink to="/messages" 
                class="relative flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/messages') ? 'bg-linear-to-tr from-[#055DFF] to-[#00BFFF] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/messages')" class="size-6" src="@/components/icons/message-line.svg">
                    <img v-if="isNotLoggedIn('/messages')" class="size-6" src="@/components/icons/message-filled.svg">
                    <!-- ENHANCED: Counter Badge with forced reactivity -->
                    <div 
                      v-if="totalUnreadCount > 0"
                      class="absolute -top-1 right-1 bg-[#055CFF] text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 font-medium text-[10px] transition-all duration-200"
                      :key="`mobile-badge-${totalUnreadCount}-${forceReactivity}`"
                    >
                      {{ formattedUnreadCount }}
                    </div>
                </RouterLink>
                
                <!-- Communities -->
                <RouterLink to="/communities" 
                class="flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/communities') ? 'bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/communities')" class="size-6" src="@/components/icons/community-line.svg">
                    <img v-if="isNotLoggedIn('/communities')" class="size-6" src="@/components/icons/community-filled.svg">
                </RouterLink>
                
                <!-- Friends -->
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

                <!-- Leaderboard -->
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