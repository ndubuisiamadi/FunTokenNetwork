<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { getAvatarUrl } from '@/utils/avatar'
import { messagesAPI } from '@/services/api'

const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['user-selected', 'friend-selected'])

const router = useRouter()
const usersStore = useUsersStore()
const authStore = useAuthStore()

const activeTab = ref('friends')
const searchQuery = ref('')

// Computed
const receivedRequests = computed(() => usersStore.receivedRequests)
const sentRequests = computed(() => usersStore.sentRequests)
const friends = computed(() => usersStore.friends)
const searchResults = computed(() => usersStore.searchResults)
const allUsers = computed(() => usersStore.allUsers)

// Add message function for friends
const startConversation = async (friend) => {
  try {
    console.log('Creating conversation with friend:', friend.id)
    
    const response = await messagesAPI.createConversation({
      participantIds: [friend.id],
      isGroup: false
    })
    
    console.log('Conversation response:', response)
    
    if (response.data.conversation) {
      // Navigate to messages with the conversation ID
      router.push(`/messages?conversation=${response.data.conversation.id}`)
    } else {
      console.error('No conversation in response:', response.data)
      alert('Error starting conversation. Please try again.')
    }
  } catch (error) {
    console.error('Error creating conversation:', error)
    console.error('Error response:', error.response?.data)
    alert('Error starting conversation. Please try again.')
  }
}

// Add click handlers for request users
const handleRequestUserClick = (user) => {
  if (props.isMobile) {
    router.push(`/user-profile/${user.id}`)
  } else {
    emit('user-selected', user)
  }
}

// Get user IDs to exclude from discover tab
const excludedUserIds = computed(() => {
  const excludedIds = new Set()
  
  // Add current user ID
  if (authStore.user?.id) {
    excludedIds.add(authStore.user.id)
  }
  
  // Add friend IDs
  friends.value.forEach(friend => {
    excludedIds.add(friend.id)
  })
  
  // Add user IDs from received requests (people who sent requests to current user)
  receivedRequests.value.forEach(request => {
    if (request.sender?.id) {
      excludedIds.add(request.sender.id)
    }
    // Also add the senderId directly in case sender object is missing
    if (request.senderId) {
      excludedIds.add(request.senderId)
    }
  })
  
  // Add user IDs from sent requests (people current user sent requests to)
  sentRequests.value.forEach(request => {
    if (request.receiver?.id) {
      excludedIds.add(request.receiver.id)
    }
    // Also add the receiverId directly in case receiver object is missing
    if (request.receiverId) {
      excludedIds.add(request.receiverId)
    }
  })
  
  return excludedIds
})

// Filter users for discover tab
const discoverUsers = computed(() => {
  const baseUsers = searchQuery.value ? searchResults.value : allUsers.value
  
  // Filter out excluded users
  return baseUsers.filter(user => !excludedUserIds.value.has(user.id))
})

const displayUsers = computed(() => {
  if (activeTab.value === 'discover') {
    return discoverUsers.value
  }
  return []
})

// Methods
const searchUsers = async () => {
  if (searchQuery.value.trim().length >= 2) {
    await usersStore.searchUsers(searchQuery.value.trim())
  } else if (searchQuery.value.trim().length === 0) {
    usersStore.clearSearch()
    await usersStore.getAllUsers()
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  usersStore.clearSearch()
  usersStore.getAllUsers()
}

const sendFriendRequest = async (userId) => {
  const result = await usersStore.sendFriendRequest(userId)
  if (result.success) {
    console.log('Friend request sent successfully')
    // The user will now be filtered out from discover since they'll be in sent requests
  }
}

const respondToRequest = async (requestId, action) => {
  const result = await usersStore.respondToFriendRequest(requestId, action)
  if (result.success) {
    console.log(`Friend request ${action}ed successfully`)
  }
}

const handleUserClick = (user) => {
  if (props.isMobile) {
    router.push(`/user-profile/${user.id}`)
  } else {
    emit('user-selected', user)
  }
}

const handleFriendClick = (friend) => {
  if (props.isMobile) {
    router.push(`/user-profile/${friend.id}`)
  } else {
    emit('friend-selected', friend)
  }
}

const changeTab = (tab) => {
  console.log('Changing tab to:', tab)
  console.log('Current data:', {
    friends: friends.value.length,
    receivedRequests: receivedRequests.value.length,
    sentRequests: sentRequests.value.length,
    allUsers: allUsers.value.length,
    excludedUsers: excludedUserIds.value.size,
    discoverUsers: discoverUsers.value.length
  })
  
  activeTab.value = tab
  
  if (tab === 'discover' && allUsers.value.length === 0) {
    console.log('Loading users for discover tab...')
    usersStore.getAllUsers()
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

// Lifecycle
onMounted(async () => {
  try {
    if (authStore.user && !usersStore.currentUser) {
      usersStore.setCurrentUser(authStore.user)
    }
    
    await Promise.all([
      usersStore.getFriends(),
      usersStore.getFriendRequests()
    ])
    
    console.log('Friends data loaded:', {
      friends: usersStore.friends.length,
      receivedRequests: usersStore.receivedRequests.length,
      sentRequests: usersStore.sentRequests.length
    })
  } catch (error) {
    console.error('Error loading friends data in sidebar:', error)
  }
})
</script>

<template>
  <div :class="[
    'flex flex-col rounded-2xl h-full',
    isMobile ? 'bg-transparent' : 'bg-[#212121] pt-4 px-4'
  ]">
    
    <!-- Tabs -->
    <div class="flex justify-between gap-2 items-center mb-4 overflow-x-auto">
      <button 
        @click="changeTab('friends')"
        :class="[
          'text-sm px-2 pb-2 truncate transition-colors whitespace-nowrap',
          activeTab === 'friends' ? 'border-b-2 border-[#FA7D7D] text-[#FA7D7D]' : 'hover:text-white/80'
        ]"
      >
        Friends
        <span v-if="friends.length > 0" class="ml-1 text-xs opacity-70">({{ friends.length }})</span>
      </button>
      
      <button 
        @click="changeTab('requests')"
        :class="[
          'text-sm px-2 pb-2 truncate transition-colors whitespace-nowrap relative',
          activeTab === 'requests' ? 'border-b-2 border-[#FA7D7D] text-[#FA7D7D]' : 'hover:text-white/80'
        ]"
      >
        Requests
        <span v-if="receivedRequests.length > 0" class="ml-1 text-xs opacity-70">
          ({{ receivedRequests.length }})
        </span>
      </button>
      
      <button 
        @click="changeTab('discover')"
        :class="[
          'text-sm px-2 pb-2 truncate transition-colors whitespace-nowrap',
          activeTab === 'discover' ? 'border-b-2 border-[#FA7D7D] text-[#FA7D7D]' : 'hover:text-white/80'
        ]"
      >
        Discover
      </button>
    </div>

    <!-- Content based on active tab -->
    <div class="flex-1 overflow-y-auto scrollbar-hide">
      
      <!-- Friends Tab -->
      <div v-if="activeTab === 'friends'" class="space-y-2">
        <div v-if="friends.length === 0" class="text-center py-8 text-white/50">
          <svg class="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <p class="text-sm">No friends yet</p>
          <p class="text-xs text-white/40">Add some friends to get started</p>
        </div>

        <div
          v-for="friend in friends"
          :key="friend.id"
          class="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
        >
          <!-- Clickable user info area -->
          <button
            @click="handleFriendClick(friend)"
            class="flex items-center gap-3 flex-1 text-left"
          >
            <img 
              :src="getAvatarUrl(friend.avatarUrl)" 
              alt="" 
              class="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p class="text-sm font-medium">{{ friend.firstName }} {{ friend.lastName }}</p>
              <div class="flex items-center gap-2 text-xs text-white/50">
                <span>@{{ friend.username }}</span>
                <div v-if="friend.isOnline" class="w-2 h-2 bg-green-400 rounded-full"></div>
                <span v-else>{{ getRelativeTime(friend.lastSeen) }}</span>
              </div>
            </div>
          </button>
          
          <!-- Message button -->
          <button
            @click="startConversation(friend)"
            class="p-2 bg-[#055CFF] rounded-full hover:bg-[#0550e5] transition-colors ml-2"
            title="Send message"
          >
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Requests Tab -->
      <div v-else-if="activeTab === 'requests'" class="space-y-4">
        
        <!-- Received Requests -->
        <div v-if="receivedRequests.length > 0">
          <h4 class="text-sm font-medium text-white/70 mb-3">Received Requests</h4>
          <div class="space-y-2">
            <div
              v-for="request in receivedRequests"
              :key="request.id"
              class="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg"
            >
              <!-- Clickable user info area -->
              <button
                @click="handleRequestUserClick(request.sender)"
                class="flex items-center gap-3 flex-1 text-left"
              >
                <img 
                  :src="getAvatarUrl(request.sender?.avatarUrl)"
                  alt=""
                  class="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p class="text-sm font-medium">
                    {{ request.sender?.firstName || 'Unknown' }} {{ request.sender?.lastName || 'User' }}
                  </p>
                  <p class="text-xs text-white/50">@{{ request.sender?.username || 'unknown' }}</p>
                </div>
              </button>
              
              <!-- Action buttons -->
              <div class="flex gap-1 ml-2">
                <button 
                  @click="respondToRequest(request.id, 'accept')"
                  class="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                >
                  ✓
                </button>
                <button 
                  @click="respondToRequest(request.id, 'decline')"
                  class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                >
                  ✗
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sent Requests -->
        <div v-if="sentRequests.length > 0">
          <h4 class="text-sm font-medium text-white/70 mb-3">Sent Requests</h4>
          <div class="space-y-2">
            <div
              v-for="request in sentRequests"
              :key="request.id"
              class="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg"
            >
              <!-- Clickable user info area -->
              <button
                @click="handleRequestUserClick(request.receiver)"
                class="flex items-center gap-3 flex-1 text-left"
              >
                <img 
                  :src="getAvatarUrl(request.receiver?.avatarUrl)"
                  alt=""
                  class="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p class="text-sm font-medium">
                    {{ request.receiver?.firstName || 'Unknown' }} {{ request.receiver?.lastName || 'User' }}
                  </p>
                  <p class="text-xs text-white/50">@{{ request.receiver?.username || 'unknown' }}</p>
                </div>
              </button>
              
              <!-- Status badge -->
              <span class="text-xs text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded ml-2">
                Pending
              </span>
            </div>
          </div>
        </div>

        <div v-if="receivedRequests.length === 0 && sentRequests.length === 0" class="text-center py-8 text-white/50">
          <svg class="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <p class="text-sm">No friend requests</p>
        </div>
      </div>

      <!-- Discover Tab -->
      <div v-else-if="activeTab === 'discover'" class="space-y-4">
        
        <!-- Search -->
        <div class="relative">
          <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            v-model="searchQuery"
            @input="searchUsers"
            type="text"
            placeholder="Search for new people..."
            :class="[
              'w-full border border-white/20 rounded-lg pl-10 pr-10 py-2 text-white placeholder-white/50 focus:outline-none focus:border-[#055CFF] text-sm',
              isMobile ? 'bg-[#212121]' : 'bg-[#2C2F36]'
            ]"
          />
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Users List -->
        <div class="space-y-2">
          <div v-if="usersStore.loading" class="text-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#055CFF] mx-auto"></div>
          </div>

          <div v-else-if="displayUsers.length === 0 && !usersStore.loading" class="text-center py-8 text-white/50">
            <svg class="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <p class="text-sm">
              {{ searchQuery ? 'No new people found' : 'No new people to discover' }}
            </p>
            <p class="text-xs text-white/40">
              {{ searchQuery ? 'Try a different search term' : 'You\'ve connected with everyone!' }}
            </p>
          </div>

          <div
            v-for="user in displayUsers"
            :key="user.id"
            class="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            <!-- Clickable user info area -->
            <button
              @click="handleUserClick(user)"
              class="flex items-center gap-3 flex-1 text-left"
            >
              <img 
                :src="getAvatarUrl(user.avatarUrl)"
                alt=""
                class="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p class="text-sm font-medium">{{ user.firstName }} {{ user.lastName }}</p>
                <p class="text-xs text-white/50">@{{ user.username }}</p>
              </div>
            </button>
            
            <!-- Friend request button for desktop -->
            <button 
              v-if="!isMobile"
              @click.stop="sendFriendRequest(user.id)"
              class="px-3 py-1 bg-[#055CFF] text-white text-xs rounded-lg hover:bg-[#0550e5] ml-2"
            >
              Add Friend
            </button>
          </div>

          <!-- Load More Button -->
          <div v-if="usersStore.hasMore && displayUsers.length > 0" class="text-center mt-4">
            <button 
              @click="usersStore.loadMore()"
              :disabled="usersStore.loading"
              class="px-4 py-2 bg-[#055CFF] text-white text-sm rounded-lg hover:bg-[#0550e5] transition-colors disabled:opacity-50"
            >
              {{ usersStore.loading ? 'Loading...' : 'Load More' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>