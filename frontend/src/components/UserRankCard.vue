<template>
  <div class="space-y-6 overflow-y-auto scrollbar-hide">
    <!-- Current User Rank -->
    <div class="bg-[#212121] rounded-2xl p-5 border border-white/10">
      <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
        
        <img src="@/components/icons/ranking-rank.svg" class="size-6">
        Your Rank
      </h3>
      
      <div v-if="userRankInfo" class="space-y-4">
        
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-[#1a1a1a] rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-[#055CFF]">
              #{{ userRankInfo.user.globalRank || 'Unranked' }}
            </p>
            <p class="text-xs text-white/60">Global Rank</p>
          </div>
          <div class="bg-[#1a1a1a] rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-yellow-400">
              {{ formatNumber(userRankInfo.user.gumballs || 0) }}
            </p>
            <p class="text-xs text-white/60">Gumballs</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-[#1a1a1a] rounded-lg p-3 text-center">
            <div class="flex items-center justify-center gap-1 min-h-[28px]">
              <span 
                v-if="(userRankInfo.user.weeklyRankChange || 0) !== 0"
                class="text-lg font-bold"
                :class="getRankChangeColor(userRankInfo.user.weeklyRankChange || 0)"
              >
                {{ formatRankChange(userRankInfo.user.weeklyRankChange || 0) }}
              </span>
              <component 
                :is="getRankChangeIconComponent(userRankInfo.user.weeklyRankChange || 0)"
                :class="['w-5 h-5', getRankChangeColor(userRankInfo.user.weeklyRankChange || 0)]"
              />
            </div>
            <p class="text-xs text-white/60">Weekly Change</p>
          </div>
          <div class="bg-[#1a1a1a] rounded-lg p-3 text-center">
            <div class="flex items-center justify-center gap-1 min-h-[28px]">
              <span 
                v-if="(userRankInfo.user.monthlyRankChange || 0) !== 0"
                class="text-lg font-bold"
                :class="getRankChangeColor(userRankInfo.user.monthlyRankChange || 0)"
              >
                {{ formatRankChange(userRankInfo.user.monthlyRankChange || 0) }}
              </span>
              <component 
                :is="getRankChangeIconComponent(userRankInfo.user.monthlyRankChange || 0)"
                :class="['w-5 h-5', getRankChangeColor(userRankInfo.user.monthlyRankChange || 0)]"
              />
            </div>
            <p class="text-xs text-white/60">Monthly Change</p>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#055CFF] mx-auto mb-2"></div>
        <p class="text-white/60">Loading your rank...</p>
      </div>
    </div>

    <!-- Top Achievers -->
    <div class="bg-[#212121] rounded-2xl p-5 border border-white/10">
      <h3 class="text-lg font-bold mb-2 flex items-center gap-2">
        
        <img src="@/components/icons/chevron-rank.svg" class="size-6">
        Top 3 This Week
      </h3>
      
      <div v-if="topAchievers.length > 0" class="">
        <div 
          v-for="(user, index) in topAchievers" 
          :key="user.id"
          class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
               :class="index === 0 ? 'bg-yellow-500 text-black' : index === 1 ? 'bg-gray-300 text-black' : index === 2 ? 'bg-orange-400 text-black' : 'bg-[#055CFF] text-white'">
            {{ index + 1 }}
          </div>
          <img :src="user.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'" 
               alt="" 
               class="w-8 h-8 rounded-full object-cover" />
          <div class="flex-1">
            <p class="text-sm font-medium">{{ user.firstName }} {{ user.lastName }}</p>
            <p class="text-xs text-white/60">{{ formatNumber(user.gumballs) }} gumballs</p>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-4">
        <p class="text-white/60 text-sm">Loading top achievers...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  userRankInfo: {
    type: Object,
    default: null
  },
  topAchievers: {
    type: Array,
    default: () => []
  }
})

// Define SVG icon components
const ArrowUpIcon = {
  template: `
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
    </svg>
  `
}

const ArrowDownIcon = {
  template: `
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
    </svg>
  `
}

const DashIcon = {
  template: `
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
    </svg>
  `
}

// Methods
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

const formatRankChange = (change) => {
  if (change === 0) return ''
  if (change > 0) return `+${change}`
  return change.toString()
}

const getRankChangeIconComponent = (change) => {
  if (change > 0) return ArrowUpIcon
  if (change < 0) return ArrowDownIcon
  return DashIcon // Return dash icon for no change
}

const getRankChangeColor = (change) => {
  if (change > 0) return 'text-green-400'
  if (change < 0) return 'text-red-400'
  return 'text-gray-400'
}
</script>