<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import TasksCard from '@/components/TasksCard.vue'
import CreatePostBox from '@/components/CreatePostBox.vue'
import FeedPostCard from '@/components/FeedPostCard.vue'
import LeaderboardCard from '@/components/LeaderboardCard.vue'
import CommunitiesCard from '@/components/CommunitiesCard.vue'
import MessagesCard from '@/components/MessagesCard.vue'
import { usePostsStore } from '@/stores/posts'
import { useAuthStore } from '@/stores/auth'

const postsStore = usePostsStore()
const authStore = useAuthStore()

const feedContainer = ref(null)
const isLoadingMore = ref(false)
const showScrollToTop = ref(false)

// Load initial posts when component mounts
onMounted(async () => {
  console.log('HomeView mounted, loading initial posts...')
  
  // Clear any existing posts to ensure fresh load
  postsStore.clearPosts()
  
  // Load the first page of posts
  const result = await postsStore.fetchFeed(1, 10)
  if (!result.success) {
    console.error('Failed to load initial posts:', result.error)
  }

  // Set up scroll listener for infinite scroll and scroll-to-top button
  if (feedContainer.value) {
    feedContainer.value.addEventListener('scroll', handleScroll)
  }
  
  // Set up window scroll listener for scroll-to-top button (if using window scroll)
  window.addEventListener('scroll', handleWindowScroll)
})

onUnmounted(() => {
  // Clean up scroll listeners
  if (feedContainer.value) {
    feedContainer.value.removeEventListener('scroll', handleScroll)
  }
  window.removeEventListener('scroll', handleWindowScroll)
})

// Handle infinite scroll for loading more posts
const handleScroll = async (e) => {
  const element = e.target
  const threshold = 200 // Load more when 200px from bottom
  
  if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
    await loadMorePosts()
  }
}

// Handle window scroll for scroll-to-top button
const handleWindowScroll = () => {
  showScrollToTop.value = window.scrollY > 500
}

// Load more posts (pagination)
const loadMorePosts = async () => {
  if (isLoadingMore.value || !postsStore.hasMore || postsStore.loading) {
    return
  }

  isLoadingMore.value = true
  
  try {
    console.log('Loading more posts...')
    const result = await postsStore.loadMore()
    
    if (result.success) {
      console.log(`Loaded ${result.posts.length} more posts`)
    } else {
      console.error('Failed to load more posts:', result.error)
    }
  } catch (error) {
    console.error('Error loading more posts:', error)
  } finally {
    isLoadingMore.value = false
  }
}

// Refresh the feed
const refreshFeed = async () => {
  console.log('Refreshing feed...')
  postsStore.clearError()
  
  const result = await postsStore.refresh()
  if (result.success) {
    console.log('Feed refreshed successfully')
    // Scroll to top after refresh
    if (feedContainer.value) {
      feedContainer.value.scrollTop = 0
    }
  } else {
    console.error('Failed to refresh feed:', result.error)
  }
}

// Scroll to top
const scrollToTop = () => {
  if (feedContainer.value) {
    feedContainer.value.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Retry loading posts if there was an error
const retryLoad = () => {
  postsStore.clearError()
  refreshFeed()
}
</script>

<template>
  <!-- Outer wrapper ensures full screen height -->
  <div class="h-full grow flex gap-8">
    
    <!-- Scrollable Middle Column -->
    <div 
      ref="feedContainer"
      class="flex-2 overflow-y-auto flex flex-col gap-[20px] scrollbar-hide"
    >
      <!-- Create Post Box -->
      <CreatePostBox/>
      
      <!-- Loading State (Initial Load) -->
      <div v-if="postsStore.loading && postsStore.posts.length === 0" class="flex justify-center py-8">
        <div class="flex items-center gap-3 text-white/60">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#055CFF]"></div>
          <span>Loading posts...</span>
        </div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="postsStore.error && postsStore.posts.length === 0" class="bg-[#212121] rounded-2xl p-6 text-center">
        <div class="text-white/60 mb-4">
          <svg class="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-lg font-medium text-white mb-2">Failed to load posts</p>
          <p class="text-sm text-white/50 mb-4">{{ postsStore.error }}</p>
          <button 
            @click="retryLoad"
            class="bg-[#055CFF] hover:bg-[#0550e5] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="!postsStore.loading && postsStore.posts.length === 0" class="bg-[#212121] rounded-2xl p-6 text-center">
        <div class="text-white/60">
          <svg class="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <p class="text-lg font-medium text-white mb-2">No posts yet</p>
          <p class="text-sm text-white/50">Be the first to share something!</p>
        </div>
      </div>
      
      <!-- Posts List -->
      <template v-else>
        <div class="flex flex-col overflow-y-auto scrollbar-hide gap-[20px]">
          <FeedPostCard 
          v-for="post in postsStore.sortedPosts" 
          :key="post.id" 
          :post="post" 
        />

        <!-- Load More Indicator -->
      <div v-if="isLoadingMore" class="flex justify-center py-4">
        <div class="flex items-center gap-3 text-white/60">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-[#055CFF]"></div>
          <span class="text-sm">Loading more posts...</span>
        </div>
      </div>

      <!-- End of Feed Indicator -->
      <div v-if="!postsStore.hasMore && postsStore.posts.length > 0" class="text-center py-4">
        <p class="text-white/40 text-sm">You've reached the end! 🎉</p>
      </div>
       </div>
      </template>
      
      
      
      
      
      <!-- Manual Load More Button (fallback for infinite scroll) -->
      <div v-if="postsStore.hasMore && !isLoadingMore && postsStore.posts.length > 0" class="text-center py-4">
        <button 
          @click="loadMorePosts"
          class="bg-[#212121] hover:bg-[#2a2a2a] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border border-white/10"
        >
          Load More Posts
        </button>
      </div>
    </div>

    <!-- Left Column -->
    <div class="hidden md:flex flex-1 flex-col gap-4 w-[300px] pb-[4px] h-full">
      <TasksCard class="grow"/>
    </div>
    
    <!-- Right Column -->
    <div class="hidden lg:flex flex-1 flex-col gap-4 w-[300px] pb-[4px] h-full">
      <CommunitiesCard class="grow"/>
      <MessagesCard class="flex-2"/>
    </div>

    <!-- Floating Action Buttons -->
    <div class="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
      <!-- Refresh Button -->
      <!-- <button 
        @click="refreshFeed"
        :disabled="postsStore.loading"
        class="bg-[#055CFF] hover:bg-[#0550e5] text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Refresh feed"
      >
        <svg class="w-5 h-5" :class="{ 'animate-spin': postsStore.loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button> -->
      
      <!-- Scroll to Top Button -->
      <button 
        v-if="showScrollToTop"
        @click="scrollToTop"
        class="bg-[#212121] hover:bg-[#2a2a2a] text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 border border-white/10"
        title="Scroll to top"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
        </svg>
      </button>
    </div>
  </div>
</template>