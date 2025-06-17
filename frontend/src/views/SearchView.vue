<template>
  <div class="h-full overflow-hidden flex flex-col">
    <!-- Search Results Header -->
    <div class="flex-shrink-0 mb-4">
      <div class="flex items-center justify-between">
        <!-- <span class="text-xl text-white font-bold">
          Search Results
          <span v-if="searchStore.query" class="text-base text-white/70">
            for "{{ searchStore.query }}"
          </span>
        </span> -->
        <div v-if="searchStore.hasResults" class="text-sm text-white/60">
          {{ searchStore.totalCount }} results found
        </div>
      </div>
    </div>

    <!-- Search Content -->
    <div v-if="searchStore.isSearching" class="flex-1 overflow-hidden flex flex-col">
      <!-- Loading State -->
      <div v-if="searchStore.loading && !searchStore.hasResults" class="flex items-center justify-center h-32">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#055CFF]"></div>
      </div>

      <!-- No Results -->
      <div v-else-if="!searchStore.hasResults && !searchStore.loading" class="text-center py-12">
        <svg class="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="text-lg font-semibold mb-2">No results found</h3>
        <p class="text-white/60">Try adjusting your search terms</p>
      </div>

      <!-- Results with Tabs -->
      <div v-else class="flex-1 overflow-hidden flex flex-col">
        <!-- Tab Navigation -->
        <div class="flex-shrink-0 mb-4">
          <div class="flex space-x-1 bg-white/5 rounded-lg p-1">
            <button
              v-for="tab in availableTabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="[
                'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                activeTab === tab.key
                  ? 'bg-[#055CFF] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              ]"
            >
              <component :is="tab.icon" class="w-4 h-4" />
              {{ tab.label }}
              <span class="text-xs opacity-70">({{ tab.count }})</span>
            </button>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="flex-1 overflow-y-auto scrollbar-hide">
          <!-- Users Tab -->
<div v-if="activeTab === 'users'" class="space-y-2">
  <div v-if="searchStore.results.users.length === 0" class="text-center py-8 text-white/50">
    <svg class="w-12 h-12 mx-auto mb-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>
    <p class="text-sm">No users found</p>
  </div>
  
  <div 
    v-for="user in searchStore.results.users" 
    :key="user.id"
    @click="navigateToProfile(user.id)"
    class="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
  >
    <img 
      :src="getUserAvatar(user)" 
      :alt="user.username"
      class="w-12 h-12 rounded-full object-cover"
    />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <p class="font-medium text-white truncate">
          {{ user.firstName }} {{ user.lastName }}
        </p>
        <!-- Friend status badge (if you want to show it) -->
        <span v-if="user.friendshipStatus === 'friends'" class="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
          Friend
        </span>
      </div>
      <p class="text-sm text-white/60 truncate">@{{ user.username }}</p>
      <p v-if="user.points" class="text-xs text-white/40">{{ user.points }} points</p>
    </div>
    <div class="flex items-center gap-2">
      <div v-if="user.level" class="text-xs px-2 py-1 rounded-full bg-white/10">
        {{ user.level }}
      </div>
    </div>
  </div>
</div>

          <!-- Communities Tab -->
<div v-if="activeTab === 'communities'" class="space-y-2">
  <div v-if="searchStore.results.communities.length === 0" class="text-center py-8 text-white/50">
    <svg class="w-12 h-12 mx-auto mb-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
    </svg>
    <p class="text-sm">No communities found</p>
  </div>
  
  <div 
    v-for="community in searchStore.results.communities" 
    :key="community.id"
    @click="navigateToCommunity(community.id)"
    class="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
  >
    <img 
      :src="getCommunityAvatar(community)" 
      :alt="community.name"
      class="w-12 h-12 rounded-full object-cover"
    />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <p class="font-medium text-white truncate">{{ community.name }}</p>
        <!-- Member badge -->
        <span v-if="community.isMember" class="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
          Member
        </span>
      </div>
      <p class="text-sm text-white/60 truncate">
        {{ getMemberCountText(community.memberCount) }}
      </p>
      <p v-if="community.description" class="text-xs text-white/40 truncate">
        {{ community.description }}
      </p>
    </div>
    <button
      @click.stop="toggleCommunityMembership(community)"
      :disabled="joiningCommunityId === community.id"
      class="px-3 py-1.5 text-xs rounded-full transition-colors flex-shrink-0"
      :class="community.isMember 
        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
        : 'bg-[#055CFF]/20 text-[#055CFF] hover:bg-[#055CFF]/30'"
    >
      {{ joiningCommunityId === community.id ? 'Loading...' : (community.isMember ? 'Leave' : 'Join') }}
    </button>
  </div>
</div>

          <!-- Posts Tab -->
          <div v-if="activeTab === 'posts'" class="space-y-3">
            <div v-if="searchStore.results.posts.length === 0" class="text-center py-8 text-white/50">
              <svg class="w-12 h-12 mx-auto mb-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
              </svg>
              <p class="text-sm">No posts found</p>
            </div>
            
            <div 
              v-for="post in searchStore.results.posts" 
              :key="post.id"
              class="p-4 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
            >
              <!-- Post Header -->
              <div class="flex items-center gap-3 mb-3">
                <img 
                  :src="getUserAvatar(post.author)" 
                  :alt="post.author.username"
                  class="w-10 h-10 rounded-full object-cover"
                />
                <div class="flex-1">
                  <p class="font-medium text-white text-sm">
                    {{ post.author.firstName }} {{ post.author.lastName }}
                  </p>
                  <p class="text-xs text-white/60">
                    @{{ post.author.username }} • {{ formatDate(post.createdAt) }}
                  </p>
                </div>
              </div>
              
              <!-- Post Content -->
              <div class="mb-3">
                <p class="text-sm text-white line-clamp-3">{{ post.content }}</p>
              </div>
              
              <!-- Post Media (if any) -->
              <div v-if="post.mediaUrl && post.mediaUrl.length > 0" class="mb-3">
                <img 
                  :src="getMediaUrl(post.mediaUrl[0])" 
                  :alt="'Post media'"
                  class="w-full h-40 object-cover rounded-lg"
                />
              </div>
              
              <!-- Post Stats -->
              <div class="flex items-center gap-4 text-xs text-white/60">
                <span class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>
                  </svg>
                  {{ post.likesCount || 0 }}
                </span>
                <span v-if="post.community" class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                  {{ post.community.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State (not searching) -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <svg class="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="text-lg font-semibold mb-2">Start searching</h3>
        <p class="text-white/60">Use the search bar above to find posts, users, and communities</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import { useCommunitiesStore } from '@/stores/communities'
import { getMediaUrl } from '@/utils/avatar'
import userPlaceholderImage from '@/assets/user-placeholder-image.jpg'

const router = useRouter()
const route = useRoute()
const searchStore = useSearchStore()
const communitiesStore = useCommunitiesStore()

const joiningCommunityId = ref(null)
const activeTab = ref('users') // Default to users tab

// Tab configuration with icons
const UsersIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>
  `
}

const CommunitiesIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
    </svg>
  `
}

const PostsIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
    </svg>
  `
}

// Computed property for available tabs (only show tabs that have results)
const availableTabs = computed(() => {
  const tabs = []
  
  if (searchStore.results.users.length > 0) {
    tabs.push({
      key: 'users',
      label: 'Users',
      count: searchStore.results.users.length,
      icon: UsersIcon
    })
  }
  
  if (searchStore.results.communities.length > 0) {
    tabs.push({
      key: 'communities',
      label: 'Communities',
      count: searchStore.results.communities.length,
      icon: CommunitiesIcon
    })
  }
  
  if (searchStore.results.posts.length > 0) {
    tabs.push({
      key: 'posts',
      label: 'Posts',
      count: searchStore.results.posts.length,
      icon: PostsIcon
    })
  }
  
  return tabs
})

// Auto-select first available tab when results change
watch(availableTabs, (newTabs) => {
  if (newTabs.length > 0 && !newTabs.some(tab => tab.key === activeTab.value)) {
    activeTab.value = newTabs[0].key
  }
}, { immediate: true })

// Helper functions
const getUserAvatar = (user) => {
  return user.avatarUrl ? getMediaUrl(user.avatarUrl) : userPlaceholderImage
}

const getCommunityAvatar = (community) => {
  return community.avatarUrl 
    ? getMediaUrl(community.avatarUrl)
    : 'https://random-image-pepebigotes.vercel.app/api/random-image'
}

const getMemberCountText = (count) => {
  if (count === 1) return '1 member'
  if (count < 1000) return `${count} members`
  return `${(count / 1000).toFixed(1)}k+ members`
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInHours < 48) return 'Yesterday'
  return date.toLocaleDateString()
}

// Navigation functions
const navigateToProfile = (userId) => {
  router.push(`/user-profile/${userId}`)
}

const navigateToCommunity = (communityId) => {
  router.push(`/community/${communityId}`)
}

// Community actions
const toggleCommunityMembership = async (community) => {
  joiningCommunityId.value = community.id
  
  try {
    if (community.isMember) {
      await communitiesStore.leaveCommunity(community.id)
    } else {
      await communitiesStore.joinCommunity(community.id)
    }
    
    // Update the community in search results
    community.isMember = !community.isMember
    if (!community.isMember) {
      community.memberCount = Math.max(0, (community.memberCount || 1) - 1)
    } else {
      community.memberCount = (community.memberCount || 0) + 1
    }
  } catch (error) {
    console.error('Failed to toggle community membership:', error)
  } finally {
    joiningCommunityId.value = null
  }
}

// Handle URL query parameter
onMounted(() => {
  const query = route.query.q
  if (query) {
    searchStore.search(query)
  }
})

// Watch for query parameter changes
watch(() => route.query.q, (newQuery) => {
  if (newQuery) {
    searchStore.search(newQuery)
  } else {
    searchStore.clearResults()
  }
})
</script>