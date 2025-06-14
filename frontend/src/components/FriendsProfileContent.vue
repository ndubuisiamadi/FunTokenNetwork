<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useMessagesStore } from '@/stores/messages'
import { getAvatarUrl } from '@/utils/avatar'
import { getMediaUrl } from '@/utils/media'

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
})

const router = useRouter()
const usersStore = useUsersStore()
const messagesStore = useMessagesStore()

const actionLoading = ref(false)

// Computed
const friendshipStatus = computed(() => props.user?.friendshipStatus || 'none')

// Methods
const sendFriendRequest = async () => {
  if (!props.user) return
  
  actionLoading.value = true
  const result = await usersStore.sendFriendRequest(props.user.id)
  actionLoading.value = false
  
  if (result.success) {
    console.log('Friend request sent successfully')
  }
}

const startConversation = async () => {
  if (!props.user) return
  
  try {
    const response = await messagesAPI.createConversation({
      type: 'direct',
      participants: [props.user.id]
    })
    
    if (response.data.conversation) {
      router.push(`/messages?conversation=${response.data.conversation.id}`)
    }
  } catch (error) {
    console.error('Error creating conversation:', error)
  }
}

const getRelativeTime = (date) => {
  const now = new Date()
  const time = new Date(date)
  const diffInSeconds = Math.floor((now - time) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return time.toLocaleDateString()
}

const formatJoinDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  })
}
</script>

<template>
  <div class="h-full bg-[#212121] rounded-2xl overflow-hidden">
    
    <!-- No User Selected State -->
    <div v-if="!user" class="h-full flex items-center justify-center">
      <div class="text-center text-white/50">
        <svg class="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
        <p class="text-lg font-medium mb-2">Select a friend to view profile</p>
        <p class="text-sm">Choose someone from your friends list to see their profile</p>
      </div>
    </div>

    <!-- User Profile Content -->
    <div v-else class="h-full flex flex-col">
      
      <!-- Profile Header -->
      <div class="relative">
        <img 
          :src="user.bannerUrl ? getMediaUrl(user.bannerUrl) : 'https://random-image-pepebigotes.vercel.app/api/random-image'" 
          class="w-full h-64 object-cover" 
          alt="Banner"
        />
        
        <div class="absolute -bottom-16 px-6 flex items-end gap-4 w-full">
          <img 
            :src="getAvatarUrl(user.avatarUrl)" 
            class="size-32 rounded-full border-4 border-[#212121]" 
            alt="Profile"
          />
          <div class="flex items-center justify-between grow pb-4">
            <div>
              <h2 class="text-xl font-bold">{{ user.firstName }} {{ user.lastName }}</h2>
              <div class="flex items-center gap-2 text-sm text-white/70">
                <span>@{{ user.username }}</span>
                <div v-if="user.isOnline" class="w-2 h-2 bg-green-400 rounded-full"></div>
                <span v-else>Last seen {{ getRelativeTime(user.lastSeen) }}</span>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <!-- Action buttons based on friendship status -->
              <button 
                v-if="friendshipStatus === 'friends'"
                @click="startConversation"
                class="bg-[#055CFF] px-4 py-2 rounded-full border-2 border-black hover:bg-[#0550e5] text-sm"
              >
                Message
              </button>
              
              <button 
                v-else-if="friendshipStatus === 'none'"
                @click="sendFriendRequest"
                :disabled="actionLoading"
                class="bg-[#055CFF] px-4 py-2 rounded-full border-2 border-black hover:bg-[#0550e5] text-sm disabled:opacity-50"
              >
                {{ actionLoading ? 'Sending...' : 'Add Friend' }}
              </button>
              
              <span 
                v-else-if="friendshipStatus === 'request_sent'"
                class="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full border-2 border-yellow-500/30 text-sm"
              >
                Request Sent
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile Content -->
      <div class="mt-20 px-6 flex-1 overflow-y-auto">
        <div class="grid grid-cols-2 gap-8">
          
          <!-- Left Column -->
          <div class="space-y-6">
            <!-- Stats -->
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
                <div>
                  <p class="font-bold text-lg">{{ user.gumballs || 0 }}</p>
                  <p class="text-xs text-white/60">Rank #{{ user.globalRank || '?' }}</p>
                </div>
              </div>
            </div>

            <!-- Join Date -->
            <div class="space-y-2">
              <div class="text-sm flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>Joined {{ formatJoinDate(user.createdAt) }}</span>
              </div>
              
              <div v-if="user.location" class="text-sm flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>{{ user.location }}</span>
              </div>
            </div>

            <!-- Bio -->
            <div v-if="user.bio">
              <p class="text-sm">{{ user.bio }}</p>
            </div>

            <!-- Stats -->
            <div class="flex justify-between text-center">
              <div>
                <p class="text-2xl font-bold">{{ user.friendsCount || 0 }}</p>
                <p class="text-sm text-white/60">Friends</p>
              </div>
              <div>
                <p class="text-2xl font-bold">{{ user.communitiesCount || 0 }}</p>
                <p class="text-sm text-white/60">Communities</p>
              </div>
              <div>
                <p class="text-2xl font-bold">{{ user.postsCount || 0 }}</p>
                <p class="text-sm text-white/60">Posts</p>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="space-y-6">
            <!-- Mutual Friends -->
            <div>
              <h3 class="text-lg font-bold mb-4">Mutual Friends</h3>
              <div class="text-center py-8 text-white/50">
                <p class="text-sm">Feature coming soon</p>
              </div>
            </div>

            <!-- Activity -->
            <div>
              <h3 class="text-lg font-bold mb-4">Activity</h3>
              <div class="text-center py-8 text-white/50">
                <p class="text-sm">Recent activity will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>