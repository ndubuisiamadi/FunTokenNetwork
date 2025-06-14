<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useMessagesStore } from '@/stores/messages'
import { useCommunitiesStore } from '@/stores/communities'
import FriendsSidebar from '@/components/FriendsSidebar.vue'
import ProfileContent from '@/components/ProfileContent.vue'
import { messagesAPI } from '@/services/api'
import { useAuthStore } from '@/stores/auth' 

const router = useRouter()
const usersStore = useUsersStore()
const messagesStore = useMessagesStore()
const communitiesStore = useCommunitiesStore()
const authStore = useAuthStore() 

// Mobile responsive state
const isMobile = ref(false)
const selectedUser = ref(null)
const actionLoading = ref(false)
const userCommunities = ref([])
const communitiesLoading = ref(false)

// Add computed property for pending request ID
const pendingRequestId = computed(() => {
  if (!selectedUser.value) return null
  
  // Check if there's a received request from this user
  const receivedRequest = usersStore.receivedRequests.find(
    req => req.sender?.id === selectedUser.value.id
  )
  
  return receivedRequest?.id || null
})

// Add methods for handling friend requests
const acceptFriendRequest = async (requestId) => {
  if (!requestId) return
  
  actionLoading.value = true
  const result = await usersStore.respondToFriendRequest(requestId, 'accept')
  actionLoading.value = false
  
  if (result.success) {
    // Update the selected user's friendship status
    selectedUser.value.friendshipStatus = 'friends'
    
    // Refresh data to update lists
    await Promise.all([
      usersStore.getFriends(),
      usersStore.getFriendRequests()
    ])
  }
}

const declineFriendRequest = async (requestId) => {
  if (!requestId) return
  
  actionLoading.value = true
  const result = await usersStore.respondToFriendRequest(requestId, 'decline')
  actionLoading.value = false
  
  if (result.success) {
    // Update the selected user's friendship status
    selectedUser.value.friendshipStatus = 'none'
    
    // Refresh data to update lists
    await usersStore.getFriendRequests()
  }
}

// Computed properties for ProfileContent
const isOwnProfile = computed(() => false) // Always false in friends view

const userLevel = computed(() => {
  if (!selectedUser.value) return { gumballs: 0, level: 1, levelColor: '#666', isTopPlayer: false }
  
  const gumballs = selectedUser.value.gumballs || 0
  const level = selectedUser.value.level || calculateLevel(gumballs)
  
  return {
    gumballs: gumballs,
    level: level,
    levelColor: getLevelColor(level),
    isTopPlayer: gumballs >= 1000
  }
})

const formattedStats = computed(() => {
  if (!selectedUser.value) return { friends: 0, communities: 0, posts: 0 }
  
  const friends = selectedUser.value.friendsCount || 
                 (selectedUser.value._count ? 
                  (selectedUser.value._count.friendships1 || 0) + (selectedUser.value._count.friendships2 || 0) : 0)
  
  const communities = selectedUser.value.communitiesCount || 
                     (selectedUser.value._count ? selectedUser.value._count.communities || 0 : 0)
  
  const posts = selectedUser.value.postsCount || 
               (selectedUser.value._count ? selectedUser.value._count.posts || 0 : 0)
  
  return { friends, communities, posts }
})

const joinDate = computed(() => {
  if (!selectedUser.value?.createdAt) return 'Unknown'
  const date = new Date(selectedUser.value.createdAt)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`
  } else {
    return `${Math.floor(diffDays / 30)} months ago`
  }
})

const birthDate = computed(() => {
  if (!selectedUser.value?.birthDate) return null
  const date = new Date(selectedUser.value.birthDate)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const friendshipStatus = computed(() => {
  if (!selectedUser.value) return 'none'
  
  // Check if user is in friends list
  const isFriend = usersStore.friends.some(friend => friend.id === selectedUser.value.id)
  if (isFriend) return 'friends'
  
  // Check if user is in sent requests (we sent them a request)
  const sentRequest = usersStore.sentRequests.some(req => 
    req.receiverId === selectedUser.value.id || req.receiver?.id === selectedUser.value.id
  )
  if (sentRequest) return 'sent'
  
  // Check if user is in received requests (they sent us a request)
  const receivedRequest = usersStore.receivedRequests.some(req => 
    req.senderId === selectedUser.value.id || req.sender?.id === selectedUser.value.id
  )
  if (receivedRequest) return 'received'
  
  // Check the user's own friendshipStatus property as fallback
  return selectedUser.value.friendshipStatus || 'none'
})

// Helper functions
const calculateLevel = (gumballs) => {
  return Math.floor(gumballs / 100) + 1
}

const getLevelColor = (level) => {
  if (level >= 10) return '#FFD700' // Gold
  if (level >= 5) return '#C0C0C0'  // Silver
  return '#CD7F32' // Bronze
}

// Methods
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024 // lg breakpoint
}

const handleUserSelected = async (user) => {
  selectedUser.value = user
  await fetchUserCommunities(user.id)
}

const handleFriendSelected = async (friend) => {
  selectedUser.value = friend
  await fetchUserCommunities(friend.id)
}

const fetchUserCommunities = async (userId) => {
  communitiesLoading.value = true
  try {
    // For privacy, we might not want to show other users' communities
    // Or we could fetch public communities only
    userCommunities.value = []
  } catch (err) {
    console.error('Error fetching user communities:', err)
    userCommunities.value = []
  } finally {
    communitiesLoading.value = false
  }
}

const sendFriendRequest = async () => {
  if (!selectedUser.value) return
  
  actionLoading.value = true
  const result = await usersStore.sendFriendRequest(selectedUser.value.id)
  actionLoading.value = false
  
  if (result.success) {
    // Update the selected user's friendship status
    selectedUser.value.friendshipStatus = 'request_sent'
  }
}

const removeFriend = async () => {
  if (!selectedUser.value) return
  
  actionLoading.value = true
  const result = await usersStore.removeFriend(selectedUser.value.id)
  actionLoading.value = false
  
  if (result.success) {
    selectedUser.value.friendshipStatus = 'none'
  }
}

const blockUser = async () => {
  if (!selectedUser.value) return
  
  if (confirm('Are you sure you want to block this user?')) {
    actionLoading.value = true
    // Implement block functionality when available
    actionLoading.value = false
  }
}

const startConversation = async () => {
  if (!selectedUser.value) return
  
  try {
    console.log('Creating conversation with user:', selectedUser.value.id)
    
    const response = await messagesAPI.createConversation({
      participantIds: [selectedUser.value.id],
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

// Lifecycle
onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // Set current user in users store for proper filtering
  if (authStore.user) {
    usersStore.setCurrentUser(authStore.user)
  }
  
  // Load initial data for FriendsSidebar
  try {
    await Promise.all([
      usersStore.getFriends(),
      usersStore.getFriendRequests()
    ])
  } catch (error) {
    console.error('Error loading friends data:', error)
  }
})


onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <!-- Mobile Layout -->
  <div v-if="isMobile" class="h-full text-white">
    <FriendsSidebar 
      :is-mobile="true"
      @user-selected="handleUserSelected"
      @friend-selected="handleFriendSelected"
    />
  </div>

  <!-- Desktop Layout -->
  <div v-else class="flex h-full text-white gap-6">
    <!-- Sidebar -->
    <div class="w-80">
      <FriendsSidebar 
        :is-mobile="false"
        @user-selected="handleUserSelected"
        @friend-selected="handleFriendSelected"
      />
    </div>

    <!-- Main Content Area - Use existing ProfileContent component -->
    <div class="flex-1">
      <div v-if="!selectedUser" class="h-full bg-[#212121] rounded-2xl flex items-center justify-center">
        <div class="text-center text-white/50">
          <svg class="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <p class="text-lg font-medium mb-2">Select a friend to view profile</p>
          <p class="text-sm">Choose someone from your friends list to see their profile</p>
        </div>
      </div>

      <ProfileContent
        v-else
        :profile-user="selectedUser"
        :is-own-profile="isOwnProfile"
        :user-level="userLevel"
        :formatted-stats="formattedStats"
        :join-date="joinDate"
        :birth-date="birthDate"
        :user-communities="userCommunities"
        :communities-loading="communitiesLoading"
        :action-loading="actionLoading"
        :friendship-status="friendshipStatus"
        @send-friend-request="sendFriendRequest"
        @remove-friend="removeFriend"
        @block-user="blockUser"
        @start-conversation="startConversation"
      />
    </div>
  </div>
</template>