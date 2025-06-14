<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCommunitiesStore } from '@/stores/communities'
import { getMediaUrl } from '@/utils/media'

const communitiesStore = useCommunitiesStore()

// Props for mobile responsive behavior
const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false
  }
})

// Emit events for mobile navigation
const emit = defineEmits(['community-selected'])

// Reactive data
const searchQuery = ref('')
const isSearching = ref(false)

// Computed properties
const displayedCommunities = computed(() => {
  return isSearching.value 
    ? communitiesStore.searchResults 
    : communitiesStore.allCommunities
})

const loading = computed(() => communitiesStore.loading)
const hasMore = computed(() => communitiesStore.hasMore)

// Helper functions
const getCommunityAvatar = (community) => {
  return community.avatarUrl 
    ? getMediaUrl(community.avatarUrl)
    : 'https://random-image-pepebigotes.vercel.app/api/random-image'
}

const getPostsText = (community) => {
  const count = community.postsThisWeek || 0
  if (count === 0) return 'No posts this week'
  if (count === 1) return '1 post this week'
  return `${count}+ posts this week`
}

const getMemberCountText = (count) => {
  if (count === 1) return '1 member'
  if (count < 1000) return `${count} members`
  return `${(count / 1000).toFixed(1)}k+ members`
}

// Search functionality
const searchCommunities = async () => {
  if (!searchQuery.value.trim()) {
    isSearching.value = false
    return
  }
  
  isSearching.value = true
  await communitiesStore.searchCommunities(searchQuery.value)
}

// Clear search
const clearSearch = () => {
  searchQuery.value = ''
  isSearching.value = false
  communitiesStore.clearSearch()
}

// Join/Leave community
const toggleCommunityMembership = async (community) => {
  if (community.isMember) {
    await communitiesStore.leaveCommunity(community.id)
  } else {
    await communitiesStore.joinCommunity(community.id)
  }
}

// Load more communities
const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  
  if (isSearching.value) {
    await communitiesStore.searchCommunities(
      searchQuery.value, 
      communitiesStore.currentPage + 1
    )
  } else {
    await communitiesStore.fetchAllCommunities(communitiesStore.currentPage + 1)
  }
}

const handleCommunityClick = (community) => {
  if (props.isMobile) {
    emit('community-selected', community)
  }
}

// Watch for search input changes
let searchTimeout
watch(searchQuery, (newValue) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (newValue.trim()) {
      searchCommunities()
    } else {
      clearSearch()
    }
  }, 300)
})

// Load communities on mount
onMounted(async () => {
  if (communitiesStore.allCommunities.length === 0) {
    await communitiesStore.fetchAllCommunities()
  }
})
</script>

<template>
  <div class="md:bg-[#212121] overflow-auto scrollbar-hide md:p-5 pt-2 rounded-2xl h-full">
    <!-- Header -->
    <div class="hidden md:flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <img src="@/components/icons/binoculars.svg" alt="Explore" />
        <h2 class="text-xl font-bold">
          {{ isSearching ? `Search Results (${displayedCommunities.length})` : 'Explore Communities' }}
        </h2>
      </div>
    </div>

    <!-- Search -->
    <div class="relative mb-6">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search communities..."
        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 pr-10 placeholder-white/50 focus:outline-none focus:border-[#055CFF] transition-colors"
      />
      <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="text-white/50 hover:text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <svg v-else class="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <!-- Communities List -->
    <div class="space-y-4">
      <!-- Loading State -->
      <div v-if="loading && communitiesStore.currentPage === 1" class="space-y-4">
        <div v-for="i in 5" :key="i" class="flex items-center justify-between py-4 border-b border-white/10 animate-pulse">
          <div class="flex items-center space-x-3">
            <div class="size-12 rounded-full bg-white/20"></div>
            <div>
              <div class="h-4 bg-white/20 rounded w-32 mb-1"></div>
              <div class="h-3 bg-white/20 rounded w-24"></div>
            </div>
          </div>
          <div class="h-8 bg-white/20 rounded w-16"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="displayedCommunities.length === 0" class="text-center py-12">
        <img src="@/components/icons/usersfour.svg" alt="No communities" class="size-16 mx-auto mb-4 opacity-50" />
        <h3 class="text-lg font-semibold mb-2">
          {{ isSearching ? 'No communities found' : 'No communities yet' }}
        </h3>
        <p class="text-sm opacity-60 mb-4">
          {{ isSearching ? 'Try a different search term' : 'Be the first to create a community!' }}
        </p>
      </div>

      <!-- Communities -->
      <div v-else>
        <component
          :is="isMobile ? 'div' : 'div'"
          v-for="community in displayedCommunities" 
          :key="community.id"
          :class="[
            'flex items-center justify-between py-4 border-b border-white/10 rounded-lg px-2 transition-colors',
            isMobile 
              ? 'hover:bg-white/5 cursor-pointer active:bg-white/10' 
              : 'hover:bg-white/5'
          ]"
          @click="handleCommunityClick(community)"
        >
          <div class="flex items-center space-x-3">
            <img 
              :src="getCommunityAvatar(community)" 
              :alt="community.name" 
              class="size-12 rounded-full object-cover"
            />
            <div>
              <component
                :is="isMobile ? 'h3' : 'RouterLink'"
                :to="!isMobile ? `/community/${community.id}` : undefined"
                :class="[
                  'text-sm font-medium transition-colors',
                  !isMobile && 'hover:text-[#055CFF]'
                ]"
              >
                {{ community.name }}
              </component>
              <p class="text-xs opacity-50">
                {{ getMemberCountText(community.memberCount) }} • {{ getPostsText(community) }}
              </p>
              <p v-if="community.description" class="text-xs opacity-70 mt-1 line-clamp-1">
                {{ community.description }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- Member Badge -->
            <div 
              v-if="community.isMember && community.userRole === 'owner'" 
              class="px-2 py-1 bg-yellow-600/30 text-yellow-400 text-xs rounded"
            >
              Owner
            </div>
            <div 
              v-else-if="community.isMember && community.userRole === 'admin'" 
              class="px-2 py-1 bg-blue-600/30 text-blue-400 text-xs rounded"
            >
              Admin
            </div>
            <div 
              v-else-if="community.isMember" 
              class="px-2 py-1 bg-green-600/30 text-green-400 text-xs rounded"
            >
              Joined
            </div>
            
            <!-- Action Button -->
            <button
              v-if="!isMobile"
              @click.stop="toggleCommunityMembership(community)"
              :disabled="communitiesStore.joining || communitiesStore.leaving"
              :class="[
                'px-4 py-2 rounded-full text-sm transition-colors',
                community.isMember 
                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                  : 'bg-[#055CFF] hover:bg-[#044ACC] text-white'
              ]"
            >
              {{ community.isMember ? 'Leave' : 'Join' }}
            </button>

            <!-- Mobile arrow indicator -->
            <svg 
              v-if="isMobile"
              class="w-4 h-4 opacity-50" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </component>
      </div>

      <!-- Load More Button -->
      <div v-if="hasMore && !loading" class="text-center py-4">
        <button
          @click="loadMore"
          class="bg-[#055CFF] hover:bg-[#044ACC] px-6 py-2 rounded-lg text-sm transition-colors"
        >
          Load More
        </button>
      </div>

      <!-- Loading More -->
      <div v-if="loading && communitiesStore.currentPage > 1" class="text-center py-4">
        <div class="inline-flex items-center gap-2">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-[#055CFF]"></div>
          <span class="text-sm">Loading more...</span>
        </div>
      </div>
    </div>
  </div>
</template>