<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import { useCommunitiesStore } from '@/stores/communities'
import CreatePostBox from '@/components/CreatePostBox.vue'
import FeedPostCard from '@/components/FeedPostCard.vue'
import ProfileContent from '@/components/ProfileContent.vue'
import { usersAPI, friendsAPI, messagesAPI, communitiesAPI } from '@/services/api'
import { getMediaUrl, getAvatarUrl } from '@/utils/media'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const usersStore = useUsersStore()
const communitiesStore = useCommunitiesStore()

// Reactive state
const profileUser = ref(null)
const userPosts = ref([])
const userCommunities = ref([])
const loading = ref(true)
const postsLoading = ref(false)
const communitiesLoading = ref(false)
const error = ref(null)
const postsError = ref(null)
const actionLoading = ref(false)

// Pagination for posts
const postsPage = ref(1)
const hasMorePosts = ref(true)
const postsPerPage = 10

// Tab state for other users' profiles
const activeTab = ref('recent')

// Helper function to calculate level from gumballs
const calculateLevel = (gumballs) => {
  if (gumballs >= 50000) return 'Grandmaster'
  if (gumballs >= 20000) return 'Master'
  if (gumballs >= 5000) return 'Expert'
  if (gumballs >= 1000) return 'Apprentice'
  return 'Novice'
}

// Helper function to get level color
const getLevelColor = (level) => {
  const colors = {
    'Novice': '#9CA3AF',
    'Apprentice': '#059669',
    'Expert': '#0284C7',
    'Master': '#7C3AED',
    'Grandmaster': '#DC2626'
  }
  return colors[level] || '#9CA3AF'
}

// Computed properties
const userId = computed(() => route.params.userId || authStore.currentUser?.id)
const isOwnProfile = computed(() => !route.params.userId || route.params.userId === authStore.currentUser?.id)

const userFullName = computed(() => {
  if (!profileUser.value) return ''
  return `${profileUser.value.firstName || ''} ${profileUser.value.lastName || ''}`.trim()
})

const displayName = computed(() => {
  return userFullName.value || profileUser.value?.username || 'Unknown User'
})

const friendshipStatus = computed(() => profileUser.value?.friendshipStatus || 'none')

// Format user stats
const formattedStats = computed(() => {
  if (!profileUser.value) return { friends: 0, communities: 0, posts: 0 }
  
  const friends = profileUser.value.friendsCount || 
                 (profileUser.value._count ? 
                  (profileUser.value._count.friendships1 || 0) + (profileUser.value._count.friendships2 || 0) : 0)
  
  const communities = profileUser.value.communitiesCount || 
                     (profileUser.value._count ? profileUser.value._count.communities || 0 : 0)
  
  const posts = profileUser.value.postsCount || 
               (profileUser.value._count ? profileUser.value._count.posts || 0 : 0)
  
  return { friends, communities, posts }
})

// Format join date
const joinDate = computed(() => {
  if (!profileUser.value?.createdAt) return 'Unknown'
  const date = new Date(profileUser.value.createdAt)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`
  } else {
    return `${Math.floor(diffDays / 30)} months ago`
  }
})

// Format birthdate
const birthDate = computed(() => {
  if (!profileUser.value?.birthDate) return null
  const date = new Date(profileUser.value.birthDate)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

// User level info
const userLevel = computed(() => {
  const gumballs = profileUser.value?.gumballs || 0
  const level = profileUser.value?.level || calculateLevel(gumballs)
  
  return {
    gumballs: gumballs,
    level: level,
    levelColor: getLevelColor(level),
    isTopPlayer: gumballs >= 1000
  }
})

// Post filtering based on tabs
const filteredPosts = computed(() => {
  return userPosts.value
})

// Watch for route changes
watch(() => route.params.userId, (newUserId) => {
  if (newUserId !== userId.value) {
    fetchUserProfile()
  }
})

// Methods
const fetchUserProfile = async () => {
  loading.value = true
  error.value = null
  
  try {
    const result = await usersStore.getUserById(userId.value)
    if (result.success) {
      profileUser.value = result.user
      
      if (isOwnProfile.value) {
        authStore.user = result.user
        localStorage.setItem('authUser', JSON.stringify(result.user))
      }
    } else {
      throw new Error(result.error || 'Failed to load user profile')
    }
    
    await Promise.all([
      fetchUserPosts(),
      fetchUserCommunities()
    ])
    
  } catch (err) {
    console.error('Error fetching user profile:', err)
    error.value = err.message || 'Failed to load user profile'
    
    if (err.response?.status === 404) {
      router.push('/friends')
    }
  } finally {
    loading.value = false
  }
}

const fetchUserPosts = async () => {
  if (!profileUser.value?.id) return
  
  postsLoading.value = true
  postsError.value = null
  
  try {
    const response = await usersAPI.getUserPosts(profileUser.value.id, 1, postsPerPage)
    userPosts.value = response.data.posts || []
    hasMorePosts.value = response.data.pagination?.hasMore || false
  } catch (err) {
    console.error('Error fetching user posts:', err)
    postsError.value = 'Failed to load posts'
    userPosts.value = []
  } finally {
    postsLoading.value = false
  }
}

const fetchUserCommunities = async () => {
  if (!profileUser.value?.id) return
  
  communitiesLoading.value = true
  
  try {
    if (isOwnProfile.value) {
      await communitiesStore.fetchUserCommunities('', 1, 5)
      userCommunities.value = communitiesStore.userCommunities
    } else {
      userCommunities.value = []
    }
  } catch (err) {
    console.error('Error fetching user communities:', err)
    userCommunities.value = []
  } finally {
    communitiesLoading.value = false
  }
}

const refreshProfileData = async () => {
  try {
    const result = await usersStore.getUserById(userId.value)
    if (result.success) {
      profileUser.value = result.user
      
      if (isOwnProfile.value) {
        authStore.user = result.user
        localStorage.setItem('authUser', JSON.stringify(result.user))
      }
    }
  } catch (err) {
    console.error('Error refreshing profile data:', err)
  }
}

// Action methods
const sendFriendRequest = async () => {
  if (!profileUser.value?.id || actionLoading.value) return
  
  actionLoading.value = true
  try {
    const result = await usersStore.sendFriendRequest(profileUser.value.id)
    if (result.success) {
      profileUser.value.friendshipStatus = 'sent'
      // Make sure the requests are refreshed
      await usersStore.getFriendRequests()
    }
  } catch (err) {
    console.error('Error sending friend request:', err)
  } finally {
    actionLoading.value = false
  }
}

const pendingRequestId = computed(() => {
  if (!profileUser.value) return null
  
  // Check if there's a received request from this user
  const receivedRequest = usersStore.receivedRequests.find(
    req => req.sender?.id === profileUser.value.id
  )
  
  return receivedRequest?.id || null
})

// Add the missing action methods
const acceptFriendRequest = async () => {
  if (!pendingRequestId.value) return
  
  actionLoading.value = true
  try {
    const result = await usersStore.respondToFriendRequest(pendingRequestId.value, 'accept')
    if (result.success) {
      profileUser.value.friendshipStatus = 'friends'
      await Promise.all([
        usersStore.getFriends(),
        usersStore.getFriendRequests()
      ])
    }
  } catch (err) {
    console.error('Error accepting friend request:', err)
  } finally {
    actionLoading.value = false
  }
}

const declineFriendRequest = async () => {
  if (!pendingRequestId.value) return
  
  actionLoading.value = true
  try {
    const result = await usersStore.respondToFriendRequest(pendingRequestId.value, 'decline')
    if (result.success) {
      profileUser.value.friendshipStatus = 'none'
      await Promise.all([
        usersStore.getFriends(),
        usersStore.getFriendRequests()
      ])
    }
  } catch (err) {
    console.error('Error declining friend request:', err)
  } finally {
    actionLoading.value = false
  }
}

const cancelFriendRequest = async () => {
  if (!profileUser.value?.id || actionLoading.value) return
  
  actionLoading.value = true
  try {
    const result = await usersStore.cancelFriendRequest(profileUser.value.id)
    if (result.success) {
      profileUser.value.friendshipStatus = 'none'
      await Promise.all([
        usersStore.getFriends(),
        usersStore.getFriendRequests()
      ])
    }
  } catch (err) {
    console.error('Error cancelling friend request:', err)
  } finally {
    actionLoading.value = false
  }
}

const removeFriend = async () => {
  if (!profileUser.value?.id || actionLoading.value) return
  
  actionLoading.value = true
  try {
    console.log('Remove friend functionality needs to be implemented')
    profileUser.value.friendshipStatus = 'none'
    if (profileUser.value.friendsCount > 0) {
      profileUser.value.friendsCount -= 1
    }
  } catch (err) {
    console.error('Error removing friend:', err)
  } finally {
    actionLoading.value = false
  }
}

const blockUser = async () => {
  if (!profileUser.value?.id || actionLoading.value) return
  
  actionLoading.value = true
  try {
    console.log('Block user functionality needs to be implemented')
    profileUser.value.friendshipStatus = 'blocked'
  } catch (err) {
    console.error('Error blocking user:', err)
  } finally {
    actionLoading.value = false
  }
}

const startConversation = async () => {
  if (!profileUser.value?.id) return
  
  try {
    const response = await messagesAPI.createConversation({
      participantIds: [profileUser.value.id],
      isGroup: false
    })
    
    if (response.data.conversation) {
      router.push(`/messages?conversation=${response.data.conversation.id}`)
    }
  } catch (err) {
    console.error('Error starting conversation:', err)
  }
}

const editProfile = () => {
  router.push('/profile/edit')
}

const setActiveTab = (tab) => {
  activeTab.value = tab
}

const handlePostCreated = async () => {
  await fetchUserPosts()
  await refreshProfileData()
  await fetchUserCommunities()
}

onMounted(async () => {
  // Make sure currentUser is set
  if (authStore.user && !usersStore.currentUser) {
    usersStore.setCurrentUser(authStore.user)
  }
  
  await fetchUserProfile()
  
  // Load friend request data for proper status checking
  await Promise.all([
    usersStore.getFriends(),
    usersStore.getFriendRequests()
  ])
})
</script>

<template>
  <!-- Mobile Layout -->
  <div class="flex flex-col h-full overflow-y-auto p-2 text-white md:hidden">
    <!-- Mobile Profile Content -->
    <div v-if="loading" class="bg-[#212121] rounded-2xl p-4 mb-4">
      <div class="animate-pulse">
        <div class="h-32 bg-white/10 rounded mb-4"></div>
        <div class="space-y-3">
          <div class="h-5 bg-white/20 rounded w-1/2"></div>
          <div class="h-4 bg-white/10 rounded w-1/3"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="bg-[#212121] rounded-2xl p-4 mb-4 text-center">
      <p class="text-red-400">{{ error }}</p>
      <button 
        @click="fetchUserProfile"
        class="mt-4 px-4 py-2 bg-[#055CFF] rounded-full hover:bg-[#0550e5] transition-colors"
      >
        Try Again
      </button>
    </div>

    <!-- Mobile Profile Header -->
    <div v-else-if="profileUser" class="bg-[#212121] rounded-2xl mb-4 overflow-hidden">
      <!-- Banner -->
      <div class="relative h-32 w-full z-10">
        <img 
          :src="profileUser?.bannerUrl ? getMediaUrl(profileUser.bannerUrl) : 'https://random-image-pepebigotes.vercel.app/api/random-image'" 
          class="w-full h-full object-cover" 
          alt="Profile Banner"
        />
        <!-- Action buttons overlay -->
        <div class="absolute top-3 right-3">
          <template v-if="isOwnProfile">
            <button 
              @click="editProfile"
              class="bg-black/70 px-3 py-1.5 rounded-full border border-[#055CFF] text-xs backdrop-blur-sm"
            >
              Edit Profile
            </button>
          </template>
          
          <template v-else>
  <!-- Add Friend button -->
  <button 
    v-if="friendshipStatus === 'none'"
    @click="sendFriendRequest"
    :disabled="actionLoading"
    class="bg-[#055CFF]/90 px-3 py-1.5 rounded-full text-xs backdrop-blur-sm disabled:opacity-50"
  >
    {{ actionLoading ? 'Sending...' : 'Add Friend' }}
  </button>
  
  <!-- Request Sent - show Cancel button for sender -->
  <button 
    v-else-if="friendshipStatus === 'sent' || friendshipStatus === 'request_sent'"
    @click="cancelFriendRequest"
    :disabled="actionLoading"
    class="bg-red-600/90 px-3 py-1.5 rounded-full text-xs backdrop-blur-sm disabled:opacity-50"
  >
    {{ actionLoading ? 'Cancelling...' : 'Cancel Request' }}
  </button>
  
  <!-- Request Received - show Accept/Decline buttons for receiver -->
  <template v-else-if="friendshipStatus === 'received' || friendshipStatus === 'request_received'">
    <div class="flex gap-2">
      <button 
        @click="acceptFriendRequest"
        :disabled="actionLoading"
        class="bg-green-600/90 px-3 py-1.5 rounded-full text-xs backdrop-blur-sm disabled:opacity-50"
      >
        {{ actionLoading ? 'Accepting...' : 'Accept' }}
      </button>
      
      <button 
        @click="declineFriendRequest"
        :disabled="actionLoading"
        class="bg-red-600/90 px-3 py-1.5 rounded-full text-xs backdrop-blur-sm disabled:opacity-50"
      >
        {{ actionLoading ? 'Declining...' : 'Decline' }}
      </button>
    </div>
  </template>
  
  <!-- Friends - show Message button -->
  <template v-else-if="friendshipStatus === 'friends'">
    <button 
      @click="startConversation"
      class="bg-[#055CFF]/90 px-3 py-1.5 rounded-full text-xs backdrop-blur-sm"
    >
      Message
    </button>
  </template>
</template>
        </div>
      </div>

      <!-- Profile Info -->
      <div class="p-4 ">
        <!-- Avatar and Name Row -->
        <div class="flex items-start gap-3 -mt-8 mb-3">
          <img 
            :src="getAvatarUrl(profileUser?.avatarUrl)" 
            class="size-16 rounded-full border-3 border-[#212121] bg-[#212121] object-cover z-20" 
            alt="Profile"
          />
          <div class="flex-1 pt-6">
            <h2 class="text-lg font-bold leading-tight">{{ displayName }}</h2>
            <div class="flex items-center gap-1 text-white/70">
  <p class="text-xs">@{{ profileUser.username }}</p>
</div>
          </div>
        </div>

        <!-- Gumballs/Level -->
        <div class="flex items-center gap-2 mb-3">
          <div class="rounded-full size-6 p-1" :style="{ backgroundColor: userLevel.levelColor }" >
                <img v-if="userLevel.level == 'Novice'" src="@/components/icons/sprout.svg" alt="" />
                <img v-if="userLevel.level == 'Apprentice'" src="@/components/icons/medal-star.svg" alt="" />
                <img v-if="userLevel.level == 'Expert'" src="@/components/icons/diamond.svg" alt="" />
                <img v-if="userLevel.level == 'Master'" src="@/components/icons/trophy.svg" alt="" />
                <img v-if="userLevel.level == 'Grandmaster'" src="@/components/icons/crown.svg" alt="" />
              </div>
          <div>
            <span class="font-bold text-base">{{ userLevel.gumballs.toLocaleString() }}</span>
            <span class="text-xs ml-2" :style="{ color: userLevel.levelColor }">
              {{ userLevel.level }}{{ userLevel.isTopPlayer ? ' (Top Player)' : '' }}
            </span>
          </div>
        </div>

        <!-- Bio -->
        <div v-if="profileUser.bio" class="mb-3">
          <p class="text-sm text-white/90">{{ profileUser.bio }}</p>
        </div>

        <!-- Stats Row -->
        <div class="flex justify-around py-3 border-t border-white/10">
          <div class="text-center">
            <p class="text-xl font-[Cherry_Bomb_One] text-shadow-[0_2px_0px_#055CFF]">
              {{ formattedStats.friends }}
            </p>
            <p class="text-xs font-[Cherry_Bomb_One] text-white/70">Friends</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-[Cherry_Bomb_One] text-shadow-[0_2px_0px_#055CFF]">
              {{ formattedStats.communities }}
            </p>
            <p class="text-xs font-[Cherry_Bomb_One] text-white/70">Communities</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-[Cherry_Bomb_One] text-shadow-[0_2px_0px_#055CFF]">
              {{ formattedStats.posts }}
            </p>
            <p class="text-xs font-[Cherry_Bomb_One] text-white/70">Posts</p>
          </div>
        </div>

        <!-- Join date -->
        <div class="flex items-center gap-2 text-xs text-white/50 pt-2">
          <img class="size-3" src="@/components/icons/clock-user.svg" alt="" />
          <span>Joined {{ joinDate }}</span>
        </div>
      </div>
    </div>

    <!-- Posts Section with proper scrolling -->
    <div class="flex flex-col gap-4 flex-1 min-h-0">
      <!-- Create Post or Tabs -->
      <div class="flex-shrink-0">
        <CreatePostBox 
          v-if="isOwnProfile" 
          @post-created="handlePostCreated"
        />
        
        <div v-else class=" md:bg-[#212121] rounded-xl p-3">
          <div class="flex gap-4">
            <button 
              :class="['text-sm py-1 cursor-pointer transition-colors', activeTab === 'recent' ? 'text-white border-b-2 border-[#055CFF]' : 'text-white/60']"
              @click="setActiveTab('recent')"
            >
              Recent (20)
            </button>
            <button 
              :class="['text-sm py-1 cursor-pointer transition-colors', activeTab === 'popular' ? 'text-white border-b-2 border-[#055CFF]' : 'text-white/60']"
              @click="setActiveTab('popular')"
            >
              Popular
            </button>
            <button 
              :class="['text-sm py-1 cursor-pointer transition-colors', activeTab === 'favourites' ? 'text-white border-b-2 border-[#055CFF]' : 'text-white/60']"
              @click="setActiveTab('favourites')"
            >
              Favourites
            </button>
          </div>
        </div>
      </div>
      
      <!-- Scrollable Posts List -->
      <div class="flex-1">
        <div class="flex flex-col gap-4">
          <div v-if="postsLoading" class="space-y-4">
            <div v-for="i in 3" :key="i" class="bg-[#212121] rounded-2xl p-4 animate-pulse">
              <div class="h-4 bg-white/20 rounded mb-2"></div>
              <div class="h-32 bg-white/10 rounded"></div>
            </div>
          </div>
          
          <FeedPostCard 
            v-for="post in filteredPosts" 
            :key="post.id"
            :post="post"
          />
          
          <div v-if="!postsLoading && filteredPosts.length === 0" class="text-center text-white/60 py-8 bg-[#212121] rounded-2xl">
            <p>{{ isOwnProfile ? 'You haven\'t posted anything yet.' : 'No posts to show.' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Desktop Layout - Keep exactly the same -->
  <div class="hidden md:flex h-full text-white gap-6">
    <!-- Sidebar -->
    <div class="flex flex-1 flex-col gap-[20px]">
      
      <!-- Create Post Box for own profile -->
      <CreatePostBox 
        v-if="isOwnProfile" 
        @post-created="handlePostCreated"
      />
      
      <!-- Tabs for other users' profiles -->
      <div v-else class="flex gap-2 items-center">
        <span 
          :class="['text-sm px-2 pb-1 cursor-pointer', activeTab === 'recent' ? 'border-b-2 truncate' : '']"
          @click="setActiveTab('recent')"
        >
          Recent (20)
        </span>
        <span 
          :class="['text-sm px-2 pb-1 cursor-pointer', activeTab === 'popular' ? 'border-b-2' : '']"
          @click="setActiveTab('popular')"
        >
          Popular
        </span>
        <span 
          :class="['text-sm px-2 pb-2 cursor-pointer', activeTab === 'favourites' ? 'border-b-2' : '']"
          @click="setActiveTab('favourites')"
        >
          Favourites
        </span>
      </div>
      
      <!-- Posts list -->
      <div class="flex flex-col overflow-y-auto scrollbar-hide gap-[20px]">
        <!-- Loading state for posts -->
        <div v-if="postsLoading" class="space-y-4">
          <div v-for="i in 3" :key="i" class="bg-[#212121] rounded-2xl p-4 animate-pulse">
            <div class="h-4 bg-white/20 rounded mb-2"></div>
            <div class="h-32 bg-white/10 rounded"></div>
          </div>
        </div>
        
        <!-- Posts -->
        <FeedPostCard 
          v-for="post in filteredPosts" 
          :key="post.id"
          :post="post"
        />
        
        <!-- No posts message -->
        <div v-if="!postsLoading && filteredPosts.length === 0" class="text-center text-white/60 py-8">
          <p>{{ isOwnProfile ? 'You haven\'t posted anything yet.' : 'No posts to show.' }}</p>
        </div>
      </div>
    </div>

    <!-- Profile Content -->
    <ProfileContent 
      v-if="profileUser"
      :profile-user="profileUser"
      :is-own-profile="isOwnProfile"
      :user-level="userLevel"
      :formatted-stats="formattedStats"
      :join-date="joinDate"
      :birth-date="birthDate"
      :user-communities="userCommunities"
      :communities-loading="communitiesLoading"
      :action-loading="actionLoading"
      :friendship-status="friendshipStatus"
      @edit-profile="editProfile"
      @send-friend-request="sendFriendRequest"
      @accept-friend-request="() => acceptFriendRequest(pendingRequestId)"
      @decline-friend-request="() => declineFriendRequest(pendingRequestId)"
      @cancel-friend-request="cancelFriendRequest"
      @remove-friend="removeFriend"
      @block-user="blockUser"
      @start-conversation="startConversation"
    />
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.text-shadow-\[0_4px_0px_\#055CFF\] {
  text-shadow: 0 4px 0px #055CFF;
}
</style>