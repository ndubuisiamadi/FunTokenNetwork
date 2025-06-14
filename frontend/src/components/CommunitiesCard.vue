<!-- src/components/CommunitiesCard.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useCommunitiesStore } from '@/stores/communities'
import { getMediaUrl } from '@/utils/media'

const communitiesStore = useCommunitiesStore()

// Get user's communities on mount
onMounted(async () => {
  await communitiesStore.fetchUserCommunities('', 1, 3) // Limit to 3 for the card
})

// Computed properties
const userCommunities = computed(() => communitiesStore.userCommunities.slice(0, 3))
const loading = computed(() => communitiesStore.loading)
const error = computed(() => communitiesStore.error)

// Helper function for community avatar
const getCommunityAvatar = (community) => {
  return community.avatarUrl 
    ? getMediaUrl(community.avatarUrl)
    : 'https://random-image-pepebigotes.vercel.app/api/random-image'
}

// Helper function for posts count text
const getPostsText = (community) => {
  const count = community.postsToday || 0
  if (count === 0) return 'No posts today'
  if (count === 1) return '1 post today'
  return `${count}+ posts today`
}
</script>

<template>
  <div class="bg-[#212121] bg-[url(@/assets/communities-card-bg.png)] bg-cover text-white p-5 rounded-[18px] shadow-[0_4px_0px_#B72828] relative">
    <div class="flex justify-between items-center mb-5">
      <div class="flex items-center gap-2 text-lg font-medium">
        <img src="@/components/icons/usersfour.svg" alt="Communities" class="size-6" />
        <span>Communities</span>
      </div>
      <RouterLink to="/communities">
        <button class="text-xs text-white/80 hover:underline">View All</button>
      </RouterLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-5">
      <div v-for="i in 3" :key="i" class="flex items-center gap-2 animate-pulse">
        <div class="size-8 rounded-full bg-white/20"></div>
        <div class="flex-1">
          <div class="h-3 bg-white/20 rounded mb-1"></div>
          <div class="h-2 bg-white/20 rounded w-3/4"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-4">
      <p class="text-xs text-red-400">{{ error }}</p>
      <button 
        @click="communitiesStore.fetchUserCommunities('', 1, 3)"
        class="text-xs text-white/80 hover:underline mt-2"
      >
        Try Again
      </button>
    </div>

    <!-- Communities List -->
    <div v-else-if="userCommunities.length > 0" class="space-y-5">
      <RouterLink 
        v-for="community in userCommunities" 
        :key="community.id"
        :to="`/community/${community.id}`" 
        class="flex items-center gap-2 hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors"
      >
        <img 
          :src="getCommunityAvatar(community)" 
          :alt="community.name" 
          class="size-8 rounded-full object-cover" 
        />
        <div class="flex-1 min-w-0">
          <p class="text-xs truncate" :title="community.name">
            {{ community.name }}
          </p>
          <p class="text-xs opacity-50">
            {{ getPostsText(community) }}
          </p>
        </div>
        
        <!-- Role Badge -->
        <div 
          v-if="community.userRole === 'owner'" 
          class="px-1.5 py-0.5 bg-yellow-600/30 text-yellow-400 text-[10px] rounded"
        >
          Owner
        </div>
        <div 
          v-else-if="community.userRole === 'admin'" 
          class="px-1.5 py-0.5 bg-blue-600/30 text-blue-400 text-[10px] rounded"
        >
          Admin
        </div>
      </RouterLink>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-4">
      <img src="@/components/icons/usersfour.svg" alt="No communities" class="size-8 mx-auto mb-2 opacity-50" />
      <p class="text-xs opacity-60 mb-3">You haven't joined any communities yet</p>
      <RouterLink to="/communities">
        <button class="text-xs bg-[#055CFF] hover:bg-[#044ACC] px-3 py-1.5 rounded-full transition-colors">
          Explore Communities
        </button>
      </RouterLink>
    </div>
  </div>
</template>