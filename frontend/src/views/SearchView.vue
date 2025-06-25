<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
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
const activeTab = ref('users')
const tabContainer = ref(null) // ✅ Add ref for scroll container
const isLoadingMore = ref(false) // ✅ Add loading more state

// ✅ Available tabs with counts
const availableTabs = computed(() => {
  const tabs = []
  
  if (searchStore.results.users.length > 0) {
    tabs.push({
      key: 'users',
      label: `Users (${searchStore.results.users.length})`,
      icon: 'users'
    })
  }
  
  if (searchStore.results.communities.length > 0) {
    tabs.push({
      key: 'communities',
      label: `Communities (${searchStore.results.communities.length})`,
      icon: 'communities'
    })
  }
  
  if (searchStore.results.posts.length > 0) {
    tabs.push({
      key: 'posts',
      label: `Posts (${searchStore.results.posts.length})`,
      icon: 'posts'
    })
  }
  
  if (tabs.length > 0 && !tabs.find(tab => tab.key === activeTab.value)) {
    activeTab.value = tabs[0].key
  }
  
  return tabs
})

// ✅ Infinite scroll handler
const handleScroll = async (e) => {
  const element = e.target
  const threshold = 200 // Load more when 200px from bottom
  
  if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
    await loadMoreResults()
  }
}

// ✅ Load more results for current active tab
const loadMoreResults = async () => {
  if (isLoadingMore.value || !searchStore.hasMore[activeTab.value] || searchStore.loading) {
    return
  }

  isLoadingMore.value = true
  
  try {
    console.log(`Loading more ${activeTab.value} results...`)
    const result = await searchStore.loadMore(activeTab.value)
    
    if (result.success) {
      console.log(`Loaded more ${activeTab.value} results`)
    } else {
      console.error(`Failed to load more ${activeTab.value}:`, result.error)
    }
  } catch (error) {
    console.error(`Error loading more ${activeTab.value}:`, error)
  } finally {
    isLoadingMore.value = false
  }
}

// ✅ Set up scroll listener
onMounted(() => {
  const query = route.query.q
  if (query && query.trim()) {
    console.log('SearchView mounted with query:', query)
    searchStore.search(query.trim())
  }
})

// ✅ Watch for scroll container changes
watch(tabContainer, (newContainer) => {
  if (newContainer) {
    newContainer.addEventListener('scroll', handleScroll)
  }
})

// ✅ Cleanup scroll listener
onUnmounted(() => {
  if (tabContainer.value) {
    tabContainer.value.removeEventListener('scroll', handleScroll)
  }
})

// Watch for query parameter changes
watch(() => route.query.q, async (newQuery) => {
  console.log('Search query changed to:', newQuery)
  if (newQuery && newQuery.trim()) {
    await searchStore.search(newQuery.trim())
  } else {
    searchStore.clearResults()
  }
})

// Helper functions (same as before)
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

const navigateToProfile = (userId) => {
  router.push(`/user-profile/${userId}`)
}

const navigateToCommunity = (communityId) => {
  router.push(`/community/${communityId}`)
}

const toggleCommunityMembership = async (community) => {
  joiningCommunityId.value = community.id
  
  try {
    if (community.isMember) {
      await communitiesStore.leaveCommunity(community.id)
    } else {
      await communitiesStore.joinCommunity(community.id)
    }
    
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
</script>

<template>
  <div class="h-full overflow-hidden flex flex-col">
    <!-- Search Results Header -->
    <div class="flex-shrink-0 mb-4">
      <div class="flex items-center justify-between">
        <div v-if="searchStore.hasResults" class="text-sm text-white/60">
          {{ searchStore.totalCount }} results found
          <span v-if="searchStore.query" class="text-white/40">
            for "{{ searchStore.query }}"
          </span>
        </div>
      </div>
    </div>

    <!-- Search Content -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- Loading State -->
      <div v-if="searchStore.loading" class="flex items-center justify-center h-32">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#055CFF]"></div>
        <span class="ml-3 text-white/60">Searching...</span>
      </div>

      <!-- No Search Started -->
      <div v-else-if="!searchStore.isSearching" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <svg class="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 class="text-lg font-semibold mb-2">Start searching</h3>
          <p class="text-white/60">Use the search bar above to find posts, users, and communities</p>
        </div>
      </div>

      <!-- No Results Found -->
      <div v-else-if="!searchStore.hasResults && !searchStore.loading" class="text-center py-12">
        <svg class="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="text-lg font-semibold mb-2">No results found</h3>
        <p class="text-white/60">Try adjusting your search terms</p>
      </div>

      <!-- Search Results with Tabs -->
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
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- ✅ Tab Content with Infinite Scroll -->
        <div 
          ref="tabContainer"
          class="flex-1 overflow-y-auto scrollbar-hide"
        >
          <!-- Users Tab -->
          <div v-if="activeTab === 'users'" class="space-y-3">
            <div 
              v-for="user in searchStore.results.users" 
              :key="user.id"
              class="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              @click="navigateToProfile(user.id)"
            >
              <div class="flex items-center gap-3">
                <img 
                  :src="getUserAvatar(user)" 
                  :alt="user.username"
                  class="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p class="font-medium text-white">
                    {{ user.firstName }} {{ user.lastName }}
                  </p>
                  <p class="text-sm text-white/60">@{{ user.username }}</p>
                  <p class="text-xs text-white/40">{{ user.level || 'Novice' }}</p>
                </div>
              </div>
            </div>

            <!-- ✅ Loading More Indicator for Users -->
            <div v-if="isLoadingMore && activeTab === 'users'" class="flex items-center justify-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#055CFF]"></div>
              <span class="ml-2 text-white/60 text-sm">Loading more users...</span>
            </div>

            <!-- ✅ Manual Load More Button (fallback) -->
            <div v-if="searchStore.hasMore.users && !isLoadingMore && searchStore.results.users.length > 5" class="text-center py-4">
              <button 
                @click="loadMoreResults"
                class="bg-[#212121] hover:bg-[#2a2a2a] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border border-white/10"
              >
                Load More Users
              </button>
            </div>
          </div>

          <!-- Communities Tab -->
          <div v-if="activeTab === 'communities'" class="space-y-3">
            <div 
              v-for="community in searchStore.results.communities" 
              :key="community.id"
              class="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 cursor-pointer" @click="navigateToCommunity(community.id)">
                  <img 
                    :src="getCommunityAvatar(community)" 
                    :alt="community.name"
                    class="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p class="font-medium text-white">{{ community.name }}</p>
                    <p class="text-sm text-white/60">{{ getMemberCountText(community.memberCount) }}</p>
                    <p v-if="community.description" class="text-xs text-white/40 line-clamp-1">
                      {{ community.description }}
                    </p>
                  </div>
                </div>
                
                <button
                  @click="toggleCommunityMembership(community)"
                  :disabled="joiningCommunityId === community.id"
                  :class="[
                    'px-4 py-2 text-sm font-medium rounded-full transition-colors',
                    community.isMember 
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                      : 'bg-[#055CFF]/20 text-[#055CFF] hover:bg-[#055CFF]/30'
                  ]"
                >
                  {{ joiningCommunityId === community.id ? 'Loading...' : (community.isMember ? 'Leave' : 'Join') }}
                </button>
              </div>
            </div>

            <!-- ✅ Loading More Indicator for Communities -->
            <div v-if="isLoadingMore && activeTab === 'communities'" class="flex items-center justify-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#055CFF]"></div>
              <span class="ml-2 text-white/60 text-sm">Loading more communities...</span>
            </div>

            <!-- ✅ Manual Load More Button for Communities -->
            <div v-if="searchStore.hasMore.communities && !isLoadingMore && searchStore.results.communities.length > 5" class="text-center py-4">
              <button 
                @click="loadMoreResults"
                class="bg-[#212121] hover:bg-[#2a2a2a] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border border-white/10"
              >
                Load More Communities
              </button>
            </div>
          </div>

          <!-- Posts Tab -->
          <div v-if="activeTab === 'posts'" class="space-y-3">
            <div 
              v-for="post in searchStore.results.posts" 
              :key="post.id"
              class="p-4 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
            >
              <!-- Post Header -->
              <div class="flex items-center gap-3 mb-3">
                <img 
                  :src="getUserAvatar(post.author || post.user)" 
                  :alt="post.author?.username || post.user?.username"
                  class="w-10 h-10 rounded-full object-cover"
                />
                <div class="flex-1">
                  <p class="font-medium text-white text-sm">
                    {{ (post.author || post.user)?.firstName }} {{ (post.author || post.user)?.lastName }}
                  </p>
                  <p class="text-xs text-white/60">
                    @{{ (post.author || post.user)?.username }} • {{ formatDate(post.createdAt) }}
                  </p>
                </div>
              </div>
              
              <!-- Post Content -->
              <div class="text-white/90 text-sm line-clamp-3 mb-3">
                {{ post.content }}
              </div>
              
              <!-- Post Stats -->
              <div class="flex items-center gap-4 text-xs text-white/50">
                <span>{{ post.likesCount || 0 }} likes</span>
                <span v-if="post.community">in {{ post.community.name }}</span>
              </div>
            </div>

            <!-- ✅ Loading More Indicator for Posts -->
            <div v-if="isLoadingMore && activeTab === 'posts'" class="flex items-center justify-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#055CFF]"></div>
              <span class="ml-2 text-white/60 text-sm">Loading more posts...</span>
            </div>

            <!-- ✅ Manual Load More Button for Posts -->
            <div v-if="searchStore.hasMore.posts && !isLoadingMore && searchStore.results.posts.length > 5" class="text-center py-4">
              <button 
                @click="loadMoreResults"
                class="bg-[#212121] hover:bg-[#2a2a2a] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border border-white/10"
              >
                Load More Posts
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>