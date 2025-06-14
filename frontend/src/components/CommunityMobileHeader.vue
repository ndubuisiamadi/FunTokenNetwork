<!-- src/components/CommunityMobileHeader.vue -->
<script setup>
import { ref } from 'vue'
import { getMediaUrl } from '@/utils/media'

const props = defineProps({
  community: {
    type: Object,
    required: true
  },
  members: {
    type: Array,
    default: () => []
  },
  canManageCommunity: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-membership', 'show-edit-modal', 'show-full-profile'])

const showFullDetails = ref(false)

const getCommunityAvatar = (community) => {
  return community?.avatarUrl 
    ? getMediaUrl(community.avatarUrl)
    : 'https://randomuser.me/api/portraits/men/32.jpg'
}

const getUserAvatar = (user) => {
  return user?.avatarUrl 
    ? getMediaUrl(user.avatarUrl)
    : `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 30) + 1}.jpg`
}

const formatMemberCount = (count) => {
  if (!count) return '0'
  if (count === 1) return '1'
  if (count < 1000) return `${count}`
  return `${(count / 1000).toFixed(1)}k`
}
</script>

<template>
  <div class="bg-[#212121] rounded-2xl p-4 mb-5">
    <!-- Main community info -->
    <div class="flex items-center gap-3 mb-4">
      <img 
        :src="getCommunityAvatar(community)" 
        class="size-16 rounded-full object-cover" 
        alt="Community Avatar"
      >
      <div class="flex-1 min-w-0">
        <h2 class="text-lg font-bold truncate">{{ community.name }}</h2>
        <div class="flex items-center gap-2 text-sm opacity-75">
          <div class="flex -space-x-1">
            <img 
              v-for="(member, index) in members.slice(0, 3)" 
              :key="member.id"
              class="size-5 rounded-full border border-[#212121]" 
              :src="getUserAvatar(member.user)" 
              alt=""
            >
          </div>
          <span>{{ formatMemberCount(community.memberCount) }} members</span>
        </div>
      </div>
      
      <!-- Action Button -->
      <button
        v-if="canManageCommunity"
        @click="emit('show-edit-modal')"
        class="px-3 py-1.5 rounded-full text-sm border border-[#055CFF] hover:bg-[#055CFF] hover:text-white transition-colors"
      >
        Edit
      </button>
      <button
        v-else-if="community.isMember"
        @click="emit('toggle-membership')"
        class="px-3 py-1.5 rounded-full text-sm border border-[#B72828] hover:bg-[#B72828] hover:text-white transition-colors"
      >
        Leave
      </button>
      <button
        v-else
        @click="emit('toggle-membership')"
        class="px-3 py-1.5 rounded-full text-sm border border-[#055CFF] hover:bg-[#055CFF] hover:text-white transition-colors"
      >
        Join
      </button>
    </div>

    <!-- Expandable details -->
    <div v-if="showFullDetails" class="border-t border-white/10 pt-4 space-y-3">
      <div v-if="community.description" class="text-sm">
        <span class="font-medium">About:</span>
        <p class="mt-1 opacity-75">{{ community.description }}</p>
      </div>
      
      <div v-if="community.rules" class="text-sm">
        <span class="font-medium">Rules:</span>
        <p class="mt-1 opacity-75">{{ community.rules }}</p>
      </div>
    </div>

    <!-- Toggle details button -->
    <button 
      @click="showFullDetails = !showFullDetails"
      class="w-full mt-3 py-2 text-sm text-[#055CFF] hover:text-white transition-colors flex items-center justify-center gap-1"
    >
      {{ showFullDetails ? 'Show less' : 'Show more' }}
      <svg 
        :class="[
          'w-4 h-4 transition-transform',
          showFullDetails ? 'rotate-180' : ''
        ]" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- View full profile button -->
    <button 
      @click="emit('show-full-profile')"
      class="w-full mt-2 py-2 bg-black/50 hover:bg-black/70 rounded-lg text-sm transition-colors"
    >
      View Full Community Profile
    </button>
  </div>
</template>