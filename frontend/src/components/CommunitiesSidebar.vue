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
const activeFilter = ref('all')

// Computed properties
const userCommunitiesByFilter = computed(() => {
  if (activeFilter.value === 'all') {
    return communitiesStore.userCommunities
  }
  return communitiesStore.userCommunities.filter(community => {
    if (activeFilter.value === 'owned') {
      return community.userRole === 'owner'
    }
    if (activeFilter.value === 'admin') {
      return community.userRole === 'admin'
    }
    if (activeFilter.value === 'member') {
      return community.userRole === 'member'
    }
    return true
  })
})

const loading = computed(() => communitiesStore.loading)

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

const setFilter = (filter) => {
  activeFilter.value = filter
}

const handleCommunityClick = (community) => {
  if (props.isMobile) {
    emit('community-selected', community)
  }
}

// Load user communities on mount
onMounted(async () => {
  if (communitiesStore.userCommunities.length === 0) {
    await communitiesStore.fetchUserCommunities()
  }
})
</script>

<template>
  <div class="md:bg-[#212121] md:pt-4 md:px-4 flex flex-col rounded-2xl h-full">
    <!-- Filter Tabs -->
    <div class="flex justify-between gap-2 items-center mb-4 overflow-x-auto">
      <button 
        @click="setFilter('all')"
        :class="[
          'text-sm px-2 pb-2 truncate transition-colors whitespace-nowrap',
          activeFilter === 'all' ? 'border-b-2 border-[#055CFF] text-[#055CFF]' : 'hover:text-white/80'
        ]"
      >
        All ({{ communitiesStore.userCommunities.length }})
      </button>
      <button 
        @click="setFilter('owned')"
        :class="[
          'text-sm px-2 pb-2 transition-colors whitespace-nowrap',
          activeFilter === 'owned' ? 'border-b-2 border-[#055CFF] text-[#055CFF]' : 'hover:text-white/80'
        ]"
      >
        Owned
      </button>
      <button 
        @click="setFilter('admin')"
        :class="[
          'text-sm px-2 pb-2 transition-colors whitespace-nowrap',
          activeFilter === 'admin' ? 'border-b-2 border-[#055CFF] text-[#055CFF]' : 'hover:text-white/80'
        ]"
      >
        Admin
      </button>
      <button 
        @click="setFilter('member')"
        :class="[
          'text-sm px-2 pb-2 transition-colors whitespace-nowrap',
          activeFilter === 'member' ? 'border-b-2 border-[#055CFF] text-[#055CFF]' : 'hover:text-white/80'
        ]"
      >
        Member
      </button>
    </div>

    <!-- User's Communities List -->
    <div class="flex-1 overflow-auto scrollbar-hide">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="flex items-center space-x-2 p-2 animate-pulse">
          <div class="size-8 rounded-full bg-white/20"></div>
          <div class="flex-1">
            <div class="h-3 bg-white/20 rounded w-3/4 mb-1"></div>
            <div class="h-2 bg-white/20 rounded w-1/2"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="userCommunitiesByFilter.length === 0" class="text-center py-8">
        <p class="text-sm opacity-60">No communities found</p>
      </div>

      <!-- Communities List -->
      <div v-else class="space-y-3">
        <component
          :is="isMobile ? 'div' : 'RouterLink'"
          v-for="community in userCommunitiesByFilter" 
          :key="community.id"
          :to="!isMobile ? `/community/${community.id}` : undefined"
          @click="handleCommunityClick(community)"
          :class="[
            'flex items-center space-x-2 p-2 rounded-lg transition-colors',
            isMobile 
              ? 'hover:bg-white/5 cursor-pointer active:bg-white/10' 
              : 'hover:bg-white/5'
          ]"
        >
          <img 
            :src="getCommunityAvatar(community)" 
            :alt="community.name" 
            class="size-8 rounded-full object-cover"
          />
          <div class="flex-1 min-w-0">
            <p class="text-xs truncate" :title="community.name">{{ community.name }}</p>
            <p class="text-xs opacity-50">{{ getPostsText(community) }}</p>
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
        </component>
      </div>
    </div>
  </div>
</template>