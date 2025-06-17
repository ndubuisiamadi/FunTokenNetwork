<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'
import { useMessagesStore } from '@/stores/messages'

// Accept the class prop
defineProps({
  class: {
    type: String,
    default: ''
  }
})

const route = useRoute()
const messagesStore = useMessagesStore()

const isNotLoggedIn = (routePath) => {
  return route.path === routePath
}

// Computed property for total unread messages count
const totalUnreadCount = computed(() => {
  if (!messagesStore.conversations) return 0
  
  return messagesStore.conversations.reduce((total, conversation) => {
    return total + (conversation.unreadCount || 0)
  }, 0)
})

// Computed property to format the count (99+ for large numbers)
const formattedUnreadCount = computed(() => {
  const count = totalUnreadCount.value
  return count > 99 ? '99+' : count.toString()
})
</script>

<template>
    <!-- Desktop Navigation (Vertical Sidebar) -->
    <nav class="hidden sm:flex flex-col gap-16 items-center rounded-2xl
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
            <RouterLink to="/tasks"
            :class="[isNotLoggedIn('/tasks') ? 
            'bg-linear-to-tr from-[#00B043] to-[#195E00] backdrop-blur-xl' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#00B043] to-[#195E00] backdrop-blur-xl', 'rounded-full']"
            >
                <img v-if="!isNotLoggedIn('/tasks')" class="size-9 p-2" src="@/components/icons/check-line.svg">
                <img v-if="isNotLoggedIn('/tasks')" class="size-9 p-2" src="@/components/icons/check-filled.svg">
            </RouterLink>
            <RouterLink to="/messages" 
            :class="[isNotLoggedIn('/messages') ? 
            'bg-linear-to-tr from-[#055DFF] to-[#00BFFF]' : 
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#055DFF] to-[#00BFFF] backdrop-blur-xl', 'rounded-full']"
            class="relative">
                <img v-if="!isNotLoggedIn('/messages')" class="size-9 p-2" src="@/components/icons/message-line.svg">
                <img v-if="isNotLoggedIn('/messages')" class="size-9 p-2" src="@/components/icons/message-filled.svg">
                <!-- Counter Badge -->
                <div 
                  v-if="totalUnreadCount > 0"
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
            'bg-transparent', 'size-9', 'hover:bg-linear-to-tr from-[#7A0000] to-[#FA7D7D] backdrop-blur-xl', 'rounded-full']">
                <img v-if="!isNotLoggedIn('/friends')" class="size-9 p-2" src="@/components/icons/friends-line.svg">
                <img v-if="isNotLoggedIn('/friends')" class="size-9 p-2" src="@/components/icons/friends-filled.svg">
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
    <nav class="fixed sm:hidden bottom-0 left-0 right-0 z-50 rounded-t-2xl
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
                
                <RouterLink to="/tasks" 
                class="flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/tasks') ? 'bg-linear-to-tr from-[#00B043] to-[#195E00] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/tasks')" class="size-6" src="@/components/icons/check-line.svg">
                    <img v-if="isNotLoggedIn('/tasks')" class="size-6" src="@/components/icons/check-filled.svg">
                </RouterLink>
                
                <RouterLink to="/messages" 
                class="relative flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/messages') ? 'bg-linear-to-tr from-[#055DFF] to-[#00BFFF] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/messages')" class="size-6" src="@/components/icons/message-line.svg">
                    <img v-if="isNotLoggedIn('/messages')" class="size-6" src="@/components/icons/message-filled.svg">
                    <!-- Counter Badge -->
                    <div 
                      v-if="totalUnreadCount > 0"
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
                class="flex flex-col items-center rounded-full transition-colors duration-200" 
                :class="[isNotLoggedIn('/friends') ? 'bg-linear-to-tr from-[#7A0000] to-[#FA7D7D] backdrop-blur-xl p-3' : 'hover:bg-white/10 p-3']">
                    <img v-if="!isNotLoggedIn('/friends')" class="size-6" src="@/components/icons/friends-line.svg">
                    <img v-if="isNotLoggedIn('/friends')" class="size-6" src="@/components/icons/friends-filled.svg">
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