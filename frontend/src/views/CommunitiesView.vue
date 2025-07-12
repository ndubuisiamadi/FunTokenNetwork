<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCommunitiesStore } from '@/stores/communities'
import CommunitiesSidebar from '@/components/CommunitiesSidebar.vue'
import ExploreCommunities from '@/components/ExploreCommunities.vue'
import CommunityCreateModal from '@/components/CommunityCreateModal.vue'

const router = useRouter()
const communitiesStore = useCommunitiesStore()

// Reactive data
const showCreateModal = ref(false)
const isMobile = ref(false)
const activeTab = ref('my-communities') // 'my-communities' or 'explore'

// Check if device is mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024 // lg breakpoint
}

// Mobile navigation
const navigateToCommunity = (community) => {
  router.push(`/community/${community.id}`)
}

// Tab switching for mobile
const setActiveTab = (tab) => {
  activeTab.value = tab
}

// Navigate to the newly created community
const handleCommunityCreated = (community) => {
  router.push(`/community/${community.id}`)
}

// Lifecycle
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="h-full text-white">
    <!-- Desktop Layout -->
    <div v-if="!isMobile" class="flex h-full gap-6">
      <!-- Sidebar - User's Communities -->
      <div class="w-80">
        <CommunitiesSidebar />
      </div>

      <!-- Main Content - Explore Communities -->
      <div class="flex-1">
        <ExploreCommunities />
      </div>

      <!-- Floating Action Button -->
      <button
        @click="showCreateModal = true"
        class="fixed bottom-6 right-6 size-14 bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] hover:bg-[#044ACC] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 group"
        title="Create Community"
      >
        <svg 
          class="w-6 h-6 transition-transform group-hover:rotate-90" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Mobile Layout -->
    <div v-else class="flex flex-col h-full">
      <!-- Mobile Tab Navigation -->
      <div class="flex bg-[#212121] rounded-2xl mb-4 p-1">
        <button
          @click="setActiveTab('my-communities')"
          :class="[
            'flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200',
            activeTab === 'my-communities'
              ? 'bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] text-white shadow-lg'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          ]"
        >
          <div class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            My Communities
          </div>
        </button>
        <button
          @click="setActiveTab('explore')"
          :class="[
            'flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200',
            activeTab === 'explore'
              ? 'bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] text-white shadow-lg'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          ]"
        >
          <div class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Explore
          </div>
        </button>
      </div>

      <!-- Mobile Content -->
      <div class="flex-1 overflow-hidden">
        <!-- My Communities Tab -->
        <div v-if="activeTab === 'my-communities'" class="h-full">
          <CommunitiesSidebar 
            :is-mobile="true" 
            @community-selected="navigateToCommunity" 
          />
        </div>

        <!-- Explore Tab -->
        <div v-if="activeTab === 'explore'" class="h-full">
          <ExploreCommunities 
            :is-mobile="true" 
            @community-selected="navigateToCommunity" 
          />
        </div>
      </div>

      <!-- Mobile Floating Action Button -->
      <button
        @click="showCreateModal = true"
        class="fixed bottom-20 right-6 size-12 p-2 bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] hover:bg-[#044ACC] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 group active:scale-95"
        title="Create Community"
      >
        <svg 
          class="transition-transform group-hover:rotate-90" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Create Community Modal -->
    <CommunityCreateModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @created="handleCommunityCreated"
    />
  </div>
</template>

<style scoped>
/* Custom styles for mobile transitions */
@media (max-width: 1023px) {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
</style>