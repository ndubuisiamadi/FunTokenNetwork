<!-- src/components/ProfileContent.vue -->
<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { getMediaUrl, getAvatarUrl } from '@/utils/media'

const props = defineProps({
  profileUser: Object,
  isOwnProfile: Boolean,
  userLevel: Object,
  formattedStats: Object,
  joinDate: String,
  birthDate: String,
  userCommunities: Array,
  communitiesLoading: Boolean,
  actionLoading: Boolean,
  friendshipStatus: String
})

const emit = defineEmits([
  'edit-profile',
  'send-friend-request', 
  'remove-friend',
  'block-user',
  'start-conversation'
])

// User avatar and banner
const userAvatarUrl = computed(() => {
  return getAvatarUrl(props.profileUser?.avatarUrl)
})

const userBannerUrl = computed(() => {
  return props.profileUser?.bannerUrl 
    ? getMediaUrl(props.profileUser.bannerUrl)
    : 'https://random-image-pepebigotes.vercel.app/api/random-image'
})

const userFullName = computed(() => {
  if (!props.profileUser) return ''
  return `${props.profileUser.firstName || ''} ${props.profileUser.lastName || ''}`.trim()
})

const displayName = computed(() => {
  return userFullName.value || props.profileUser?.username || 'Unknown User'
})

// Communities data
const displayedCommunities = computed(() => {
  return props.userCommunities.slice(0, 5)
})

// Helper methods
const getCommunityAvatar = (community) => {
  return community.avatarUrl 
    ? getMediaUrl(community.avatarUrl)
    : 'https://randomuser.me/api/portraits/men/32.jpg'
}

const getRoleText = (role) => {
  return role?.charAt(0).toUpperCase() + role?.slice(1) || 'Member'
}
</script>

<template>
  <div class="md:flex-2 bg-[#212121] h-full overflow-y-auto scrollbar-hide pb-10 rounded-2xl">
    <!-- Header with banner and profile info -->
    <div class="relative flex w-full">
      <img 
        :src="userBannerUrl" 
        class="w-full h-64 object-cover" 
        alt="Background"
      />
      
      <div class="absolute -bottom-16 px-6 flex items-end gap-4 w-full">
        <img 
          :src="userAvatarUrl" 
          class="size-32 rounded-full border-4 border-[#212121] object-cover" 
          alt="Profile"
        />
        
        <div class="flex items-center justify-between grow pb-2">
          <div>
            <h2 class="text-xl font-bold">{{ displayName }}</h2>
            <div class="flex items-center gap-1 text-white/70">
  <p class="text-xs">@{{ profileUser.username }}</p>
</div>
          </div>
          
          <!-- Action buttons based on profile type -->
<div class="flex items-center space-x-2">
  <!-- Own profile buttons -->
  <template v-if="isOwnProfile">
    <button 
      @click="$emit('edit-profile')"
      class="bg-black px-4 py-2 rounded-full border-2 border-[#055CFF] hover:bg-[#055CFF] text-sm transition-colors"
    >
      Edit Profile
    </button>
  </template>
  
  <!-- Other user's profile buttons -->
  <template v-else>
    <!-- Add Friend button -->
    <button 
      v-if="friendshipStatus === 'none'"
      @click="$emit('send-friend-request')"
      :disabled="actionLoading"
      class="bg-[#055CFF] px-4 py-2 rounded-full border-2 border-black hover:bg-[#0550e5] text-sm transition-colors disabled:opacity-50"
    >
      {{ actionLoading ? 'Sending...' : 'Add Friend' }}
    </button>
    
    <!-- Request Sent status -->
    <button 
      v-else-if="friendshipStatus === 'sent' || friendshipStatus === 'request_sent'"
      disabled
      class="bg-gray-600 px-4 py-2 rounded-full text-sm opacity-60 cursor-not-allowed"
    >
      Request Sent
    </button>
    
    <!-- Request Received status -->
    <button 
      v-else-if="friendshipStatus === 'received' || friendshipStatus === 'request_received'"
      disabled
      class="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full border-2 border-blue-500/30 text-sm cursor-not-allowed"
    >
      Request Received
    </button>
    
    <!-- Friends - show Message button -->
    <template v-else-if="friendshipStatus === 'friends'">
      <button 
        @click="$emit('start-conversation')"
        class="bg-[#055CFF] px-4 py-2 rounded-full border-2 border-black hover:bg-[#0550e5] text-sm transition-colors"
      >
        Message
      </button>
      
      <button 
        @click="$emit('remove-friend')"
        :disabled="actionLoading"
        class="bg-black p-2 rounded-full hover:bg-gray-800 transition-colors"
        title="Remove Friend"
      >
        <img src="@/components/icons/userminus.svg" alt="Remove Friend" />
      </button>
      
      <button 
        @click="$emit('block-user')"
        :disabled="actionLoading"
        class="bg-black p-2 rounded-full hover:bg-gray-800 transition-colors"
        title="Block User"
      >
        <img src="@/components/icons/prohibit.svg" alt="Block User" />
      </button>
    </template>
  </template>
</div>
        </div>
      </div>
    </div>

    <!-- Profile details -->
    <div class="mt-20 px-6 flex gap-10">
      <!-- Left column -->
      <div class="flex flex-col flex-1">
        <div class="mt-4 flex flex-col space-y-6 text-sm text-gray-300">
          <!-- User level/score -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="rounded-full size-10 p-2" :style="{ backgroundColor: userLevel.levelColor }" >
                <img v-if="userLevel.level == 'Novice'" src="@/components/icons/sprout.svg" alt="" />
                <img v-if="userLevel.level == 'Apprentice'" src="@/components/icons/medal-star.svg" alt="" />
                <img v-if="userLevel.level == 'Expert'" src="@/components/icons/diamond.svg" alt="" />
                <img v-if="userLevel.level == 'Master'" src="@/components/icons/trophy.svg" alt="" />
                <img v-if="userLevel.level == 'Grandmaster'" src="@/components/icons/crown.svg" alt="" />
              </div>
              <div>
                <p class="font-bold text-xl">{{ userLevel.gumballs.toLocaleString() }}</p>
                <p class="text-xs" :style="{ color: userLevel.levelColor }">
                  {{ userLevel.level }}{{ userLevel.isTopPlayer ? ' (Top Player)' : '' }}
                </p>
              </div>
            </div>
            
            <!-- Connect wallet button (own profile only) -->
            <div v-if="isOwnProfile" class="relative group w-fit">
              <button
                class="bg-[#055CFF] px-4 py-2 rounded-full border-2 border-black text-xs text-white opacity-60 cursor-not-allowed"
                disabled
              >
                Connect Wallet
              </button>
              <div
                class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-center text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              >
                Coming soon
              </div>
            </div>
          </div>
          
          <!-- Join date and birth date -->
          <div class="space-y-1">
            <div class="text-sm font-semibold flex items-center gap-2">
              <img class="size-5" src="@/components/icons/clockuser.svg" alt="" />
              <span>Joined {{ joinDate }}</span>
            </div>
            <div v-if="birthDate" class="text-sm font-semibold flex items-center gap-2">
              <img class="size-5" src="@/components/icons/calendardots.svg" alt="" />
              <span>{{ birthDate }}</span>
            </div>
          </div>
        </div>

        <!-- Bio -->
        <p v-if="profileUser.bio" class="mt-4 text-sm">
          {{ profileUser.bio }}
        </p>
        <p v-else-if="isOwnProfile" class="mt-4 text-sm text-white/60 italic">
          Add a bio to tell others about yourself.
        </p>

        <!-- Stats -->
        <div class="mt-4 pr-10 flex justify-between text-center">
          <div>
            <p class="text-3xl font-[Cherry_Bomb_One] text-shadow-[0_4px_0px_#055CFF]">
              {{ formattedStats.friends }}
            </p>
            <p class="text-sm font-[Cherry_Bomb_One]">Friends</p>
          </div>
          <div>
            <p class="text-3xl font-[Cherry_Bomb_One] text-shadow-[0_4px_0px_#055CFF]">
              {{ formattedStats.communities }}
            </p>
            <p class="text-sm font-[Cherry_Bomb_One]">Communities</p>
          </div>
          <div>
            <p class="text-3xl font-[Cherry_Bomb_One] text-shadow-[0_4px_0px_#055CFF]">
              {{ formattedStats.posts }}
            </p>
            <p class="text-sm font-[Cherry_Bomb_One]">Posts</p>
          </div>
        </div>
      </div>

      <!-- Right column - Communities -->
      <div class="mt-6 flex-1">
        <h2 class="text-lg font-bold mb-4">Communities</h2>
        
        <!-- Loading communities -->
        <div v-if="communitiesLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="flex items-center space-x-3 animate-pulse">
            <div class="size-8 rounded-full bg-white/20"></div>
            <div class="flex-1">
              <div class="h-3 bg-white/20 rounded mb-1"></div>
              <div class="h-2 bg-white/10 rounded w-1/2"></div>
            </div>
          </div>
        </div>
        
        <!-- Communities list -->
        <div v-else-if="displayedCommunities.length > 0" class="space-y-3">
          <div 
            v-for="community in displayedCommunities" 
            :key="community.id"
            class="flex items-center space-x-3"
          >
            <img 
              :src="getCommunityAvatar(community)" 
              class="size-8 rounded-full object-cover"
              alt="Community"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm truncate">{{ community.name }}</p>
              <p class="text-xs opacity-60">{{ getRoleText(community.userRole) }}</p>
            </div>
          </div>
          
          <!-- View all communities link -->
          <RouterLink 
            v-if="formattedStats.communities > 5"
            to="/communities"
            class="text-xs text-[#055CFF] hover:underline"
          >
            View all {{ formattedStats.communities }} communities
          </RouterLink>
        </div>
        
        <!-- No communities -->
        <div v-else class="text-center text-white/60 py-4">
          <p class="text-sm">
            {{ isOwnProfile ? 'You haven\'t joined any communities yet.' : 'Community list is private.' }}
          </p>
          <RouterLink 
            v-if="isOwnProfile"
            to="/communities"
            class="text-xs text-[#055CFF] hover:underline mt-2 inline-block"
          >
            Explore Communities
          </RouterLink>
        </div>
      </div>
    </div>
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