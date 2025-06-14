<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CreatePostBox from '@/components/CreatePostBox.vue'
import FeedPostCard from '@/components/FeedPostCard.vue'
import CommunityProfile from '@/components/CommunityProfile.vue'
import CommunityMobileHeader from '@/components/CommunityMobileHeader.vue'
import CommunityEditModal from '@/components/CommunityEditModal.vue'
import { useCommunitiesStore } from '@/stores/communities'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const communitiesStore = useCommunitiesStore()
const authStore = useAuthStore()

// Get community ID from route
const communityId = computed(() => route.params.id || route.params.communityId)

// Reactive state
const showEditModal = ref(false)
const activeTab = ref('Admin')
const showFullProfile = ref(false) // For mobile modal

// Load community data on mount and route change
onMounted(() => {
  loadCommunityData()
})

// Watch for route changes (if navigating between communities)
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadCommunityData()
  }
})

// Clear community data when leaving
onUnmounted(() => {
  communitiesStore.clearCurrentCommunity()
})

// Computed properties
const community = computed(() => communitiesStore.currentCommunity)
const posts = computed(() => communitiesStore.communityPosts)
const members = computed(() => communitiesStore.communityMembers)
const loading = computed(() => communitiesStore.loadingCommunity)
const postsLoading = computed(() => communitiesStore.loadingPosts)
const membersLoading = computed(() => communitiesStore.loadingMembers)
const error = computed(() => communitiesStore.error)
const hasMorePosts = computed(() => communitiesStore.hasMorePosts)

const canManageCommunity = computed(() => {
  return community.value?.userRole === 'owner' || community.value?.userRole === 'admin'
})

const isOwner = computed(() => {
  return community.value?.userRole === 'owner'
})

// Actions
const loadCommunityData = async () => {
  if (!communityId.value) {
    router.push('/communities')
    return
  }

  // Fetch community details
  const result = await communitiesStore.fetchCommunity(communityId.value)
  
  if (!result.success) {
    console.error('Failed to load community:', result.error)
    return
  }

  // Fetch community posts and members
  await Promise.all([
    communitiesStore.fetchCommunityPosts(communityId.value),
    communitiesStore.fetchCommunityMembers(communityId.value)
  ])
}

const toggleMembership = async () => {
  if (!community.value) return

  if (community.value.isMember) {
    if (community.value.userRole === 'owner') {
      alert('Community owners cannot leave. Delete the community or transfer ownership first.')
      return
    }
    await communitiesStore.leaveCommunity(community.value.id)
  } else {
    await communitiesStore.joinCommunity(community.value.id)
  }
}

const handleCommunityUpdated = (updatedCommunity) => {
  showEditModal.value = false
}

const handlePostCreated = (newPost) => {
  communitiesStore.communityPosts.unshift(newPost)
}
</script>

<template>
  <div class="flex h-3/4 grow text-white gap-6">
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 bg-[#212121] rounded-2xl p-8 animate-pulse">
      <div class="h-64 bg-white/20 rounded mb-4"></div>
      <div class="h-8 bg-white/20 rounded w-3/4 mb-2"></div>
      <div class="h-4 bg-white/20 rounded w-1/2"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 bg-[#212121] rounded-2xl p-8 text-center">
      <h3 class="text-lg font-semibold mb-2">Community not found</h3>
      <p class="text-sm opacity-60">{{ error }}</p>
    </div>

    <!-- Main Content -->
    <template v-else-if="community">
      <!-- Mobile Layout -->
      <div class="lg:hidden flex flex-col w-full">
        <!-- Mobile Header -->
        <CommunityMobileHeader
          :community="community"
          :members="members"
          :can-manage-community="canManageCommunity"
          @toggle-membership="toggleMembership"
          @show-edit-modal="showEditModal = true"
          @show-full-profile="showFullProfile = true"
        />

        <!-- Mobile Feed -->
        <div class="flex flex-col gap-5">
          <CreatePostBox v-if="community.isMember" :community-id="community.id" @post-created="handlePostCreated"/>
          
          <!-- Posts Loading -->
          <div v-if="postsLoading && communitiesStore.postsPage === 1" class="space-y-5">
            <div v-for="i in 3" :key="i" class="bg-[#212121] rounded-2xl p-4 animate-pulse">
              <div class="flex items-center gap-3 mb-4">
                <div class="size-10 rounded-full bg-white/20"></div>
                <div>
                  <div class="h-4 bg-white/20 rounded w-24 mb-1"></div>
                  <div class="h-3 bg-white/20 rounded w-16"></div>
                </div>
              </div>
              <div class="h-20 bg-white/20 rounded mb-4"></div>
              <div class="flex gap-4">
                <div class="h-8 bg-white/20 rounded w-16"></div>
                <div class="h-8 bg-white/20 rounded w-16"></div>
              </div>
            </div>
          </div>
          
          <!-- Posts List -->
          <div v-else class="flex flex-col gap-5">
            <FeedPostCard v-for="post in posts" :key="post.id" :post="post"/>
            
            <!-- No Posts Message -->
            <div v-if="posts.length === 0" class="bg-[#212121] rounded-2xl p-8 text-center">
              <h3 class="text-lg font-semibold mb-2">No posts yet</h3>
              <p class="text-sm opacity-60">
                {{ community.isMember ? 'Be the first to share something!' : 'Join to see posts.' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Layout (unchanged) -->
      <div class="hidden lg:flex lg:gap-6 w-full">
        <!-- Sidebar -->
        <div class="flex flex-1 flex-col gap-[20px]">
          <CreatePostBox v-if="community.isMember" :community-id="community.id" @post-created="handlePostCreated"/>
          <div class="flex flex-col overflow-y-auto scrollbar-hide gap-[20px]">
            <FeedPostCard v-for="post in posts" :key="post.id" :post="post"/>
            
            <!-- No Posts Message -->
            <div v-if="posts.length === 0" class="bg-[#212121] rounded-2xl p-8 text-center">
              <h3 class="text-lg font-semibold mb-2">No posts yet</h3>
              <p class="text-sm opacity-60">
                {{ community.isMember ? 'Be the first to share something!' : 'Join to see posts.' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Profile Content -->
        <div class="flex-2">
          <CommunityProfile
            :community="community"
            :members="members"
            :posts="posts"
            :members-loading="membersLoading"
            :active-tab="activeTab"
            :can-manage-community="canManageCommunity"
            :is-owner="isOwner"
            @toggle-membership="toggleMembership"
            @show-edit-modal="showEditModal = true"
            @update:active-tab="activeTab = $event"
          />
        </div>
      </div>
    </template>

    <!-- Mobile Full Profile Modal -->
    <div
      v-if="showFullProfile"
      class="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
      @click="showFullProfile = false"
    >
      <div 
        class="bg-[#1a1a1a] rounded-t-2xl w-full max-h-[90vh] overflow-hidden"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-[#1a1a1a] z-10">
          <h2 class="text-lg font-bold">Community Profile</h2>
          <button
            @click="showFullProfile = false"
            class="text-white/70 hover:text-white transition-colors p-2"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Profile Content -->
        <div class="overflow-y-auto max-h-[calc(90vh-80px)]">
          <CommunityProfile
            :community="community"
            :members="members"
            :posts="posts"
            :members-loading="membersLoading"
            :active-tab="activeTab"
            :can-manage-community="canManageCommunity"
            :is-owner="isOwner"
            @toggle-membership="toggleMembership"
            @show-edit-modal="showEditModal = true; showFullProfile = false"
            @update:active-tab="activeTab = $event"
          />
        </div>
      </div>
    </div>

    <!-- Community Edit Modal -->
    <CommunityEditModal 
      :show="showEditModal"
      :community="community"
      @close="showEditModal = false"
      @updated="handleCommunityUpdated"
    />
  </div>
</template>