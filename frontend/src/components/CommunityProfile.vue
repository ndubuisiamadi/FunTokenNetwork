<!-- src/components/CommunityProfile.vue -->
<script setup>
import { computed } from 'vue'
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
  posts: {
    type: Array,
    default: () => []
  },
  membersLoading: {
    type: Boolean,
    default: false
  },
  activeTab: {
    type: String,
    default: 'Admin'
  },
  canManageCommunity: {
    type: Boolean,
    default: false
  },
  isOwner: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-membership', 'show-edit-modal', 'update:active-tab'])

// Helper functions
const getCommunityAvatar = (community) => {
  return community?.avatarUrl 
    ? getMediaUrl(community.avatarUrl)
    : 'https://randomuser.me/api/portraits/men/32.jpg'
}

const getCommunityBanner = (community) => {
  return community?.bannerUrl 
    ? getMediaUrl(community.bannerUrl)
    : 'https://random-image-pepebigotes.vercel.app/api/random-image'
}

const getUserAvatar = (user) => {
  return user?.avatarUrl 
    ? getMediaUrl(user.avatarUrl)
    : `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 30) + 1}.jpg`
}

const formatMemberCount = (count) => {
  if (!count) return '0 members'
  if (count === 1) return '1 member'
  if (count < 1000) return `${count} members`
  return `${(count / 1000).toFixed(1)}k+ members`
}

const formatCreatedDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 30) {
    return `Created ${diffDays} days ago`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `Created ${months} month${months > 1 ? 's' : ''} ago`
  } else {
    const years = Math.floor(diffDays / 365)
    return `Created ${years} year${years > 1 ? 's' : ''} ago`
  }
}

// Filter members by role
const adminMembers = computed(() => {
  return props.members.filter(member => member.role === 'owner' || member.role === 'admin')
})

const regularMembers = computed(() => {
  return props.members.filter(member => member.role === 'member')
})

const displayedMembers = computed(() => {
  return props.activeTab === 'Admin' ? adminMembers.value : regularMembers.value
})

const getUserDisplayName = (user) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  return user.username
}

const getUserStats = (user) => {
  const postsCount = user.postsInCommunity || 0
  if (postsCount === 0) return 'No posts'
  if (postsCount >= 1000) return `${(postsCount / 1000).toFixed(1)}k+ posts`
  return `${postsCount}+ posts`
}
</script>

<template>
  <div class="bg-[#212121] overflow-auto scrollbar-hide pb-10 rounded-2xl">
    <div class="relative flex w-full">
      <img 
        :src="getCommunityBanner(community)" 
        class="w-full h-64 object-cover" 
        alt="Community Banner"
      >
      <div class="absolute -bottom-16 px-6 flex items-end gap-4 w-full">
        <img 
          :src="getCommunityAvatar(community)" 
          class="size-32 rounded-full object-cover" 
          alt="Community Avatar"
        >
        <div class="flex items-center justify-between grow">
          <div class="space-y-2">
            <h2 class="text-xl leading-none font-bold">{{ community.name }}</h2>
            <div class="flex items-center gap-1">
              <div class="flex gap-[-2px]">
                <img 
                  v-for="(member, index) in members.slice(0, 3)" 
                  :key="member.id"
                  class="size-4 rounded-full border border-[#212121]" 
                  :src="getUserAvatar(member.user)" 
                  alt=""
                >
              </div>
              <p class="text-xs">{{ formatMemberCount(community.memberCount) }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button 
              v-if="community.isMember"
              class="bg-black p-2 rounded-full hover:bg-black/80 transition-colors"
            >
              <img src="@/components/icons/bell-ringing.svg">
            </button>
            
            <!-- Edit/Join/Leave Button -->
            <button
              v-if="canManageCommunity"
              @click="emit('show-edit-modal')"
              class="px-4 py-2 rounded-full text-sm border-2 border-[#055CFF] hover:bg-[#055CFF] hover:text-white transition-colors"
            >
              Edit
            </button>
            <button
              v-else-if="community.isMember"
              @click="emit('toggle-membership')"
              class="px-4 py-2 rounded-full text-sm border-2 border-[#B72828] hover:bg-[#B72828] hover:text-white transition-colors"
            >
              Leave
            </button>
            <button
              v-else
              @click="emit('toggle-membership')"
              class="px-4 py-2 rounded-full text-sm border-2 border-[#055CFF] hover:bg-[#055CFF] hover:text-white transition-colors"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-20 px-6 flex flex-col lg:flex-row gap-10">
      <div class="flex flex-col flex-1">
        <div class="space-y-1">
          <div class="text-sm font-semibold flex items-center gap-2">
            <img class="size-5" src="@/components/icons/clock-user.svg" alt="">
            {{ formatCreatedDate(community.createdAt) }}
          </div>
          <div class="text-sm">
            {{ community.description || 'No description available.' }}
          </div>
        </div>

        <div class="mt-4 text-sm space-y-1">
          <div class="text-sm font-semibold flex items-center gap-2">
            <img class="size-5" src="@/components/icons/scales.svg" alt="">
            Rules
          </div>
          {{ community.rules || 'No specific rules set.' }}
        </div>
      </div>

      <div class="mt-6 lg:mt-0 flex-1">
        <div class="flex gap-2 items-center mb-4">
          <span 
            @click="emit('update:active-tab', 'Admin')"
            :class="[
              'text-sm px-2 pb-1 truncate cursor-pointer transition-colors',
              activeTab === 'Admin' ? 'border-b-2 border-[#055CFF] text-[#055CFF]' : 'hover:text-white/80'
            ]"
          >
            Admin
          </span>
          <span 
            @click="emit('update:active-tab', 'Members')"
            :class="[
              'text-sm px-2 pb-1 cursor-pointer transition-colors',
              activeTab === 'Members' ? 'border-b-2 border-[#055CFF] text-[#055CFF]' : 'hover:text-white/80'
            ]"
          >
            Members
          </span>
        </div>

        <!-- Loading Members -->
        <div v-if="membersLoading" class="space-y-3">
          <div v-for="i in 5" :key="i" class="flex items-center space-x-2 animate-pulse">
            <div class="size-8 rounded-full bg-white/20"></div>
            <div>
              <div class="h-3 bg-white/20 rounded w-20 mb-1"></div>
              <div class="h-2 bg-white/20 rounded w-16"></div>
            </div>
          </div>
        </div>

        <!-- Members List -->
        <div v-else class="space-y-3">
          <div 
            v-for="member in displayedMembers" 
            :key="member.id"
            class="flex items-center space-x-2"
          >
            <img 
              :src="getUserAvatar(member.user)" 
              class="size-8 rounded-full object-cover"
            >
            <div>
              <div class="flex items-center gap-2">
                <p class="text-xs">{{ getUserDisplayName(member.user) }}</p>
                <span 
                  v-if="member.role === 'owner'"
                  class="px-1 py-0.5 bg-yellow-600/30 text-yellow-400 text-xs rounded"
                >
                  Owner
                </span>
                <span 
                  v-else-if="member.role === 'admin'"
                  class="px-1 py-0.5 bg-blue-600/30 text-blue-400 text-xs rounded"
                >
                  Admin
                </span>
              </div>
              <p class="text-xs opacity-60">{{ getUserStats(member.user) }}</p>
            </div>
          </div>

          <!-- No Members Message -->
          <div v-if="displayedMembers.length === 0" class="text-center py-4">
            <p class="text-sm opacity-60">
              {{ activeTab === 'Admin' ? 'No admins' : 'No members' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>