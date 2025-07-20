<template>
  <div class="h-full text-white">
    <!-- Mobile Version -->
    <div class="md:hidden">
      <!-- Tab Navigation -->
      <div class="rounded-t-2xl border-b border-white/10">
        <div class="flex">
          <button 
            @click="activeTab = 'leaderboard'"
            :class="[
              'flex-1 py-4 px-6 text-center font-medium transition-colors relative',
              activeTab === 'leaderboard' 
                ? 'text-[#FCCA00]' 
                : 'text-white/70 hover:text-white'
            ]"
          >
            <div class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 6.707 6.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              Leaderboard
            </div>
            <div 
              v-if="activeTab === 'leaderboard'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FCCA00]"
            ></div>
          </button>
          <button 
            @click="activeTab = 'stats'"
            :class="[
              'flex-1 py-4 px-6 text-center font-medium transition-colors relative',
              activeTab === 'stats' 
                ? 'text-[#FCCA00]' 
                : 'text-white/70 hover:text-white'
            ]"
          >
            <div class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10a8 8 0 818-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
              My Stats
            </div>
            <div 
              v-if="activeTab === 'stats'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FCCA00]"
            ></div>
          </button>
        </div>
      </div>

      <!-- Mobile Content -->
      <div class="rounded-b-2xl overflow-hidden" style="height: calc(100vh - 180px);">
        <!-- Leaderboard Tab Content -->
        <div v-if="activeTab === 'leaderboard'" class="h-full flex flex-col">
          <!-- Mobile Filters and Search -->
          <div class="py-4 border-b border-white/10 space-y-3">
            <!-- Period Filters -->
            <div class="flex items-center gap-2 overflow-x-auto">
              <button 
                v-for="option in periodOptions" 
                :key="option.value"
                @click="handlePeriodChange(option.value)"
                :class="[
                  'px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap',
                  selectedPeriod === option.value 
                    ? 'bg-linear-to-tr from-[#FCCA00] to-[#82681A] text-white' 
                    : 'text-white/70 hover:text-white bg-[#1a1a1a]'
                ]"
              >
                <component :is="option.iconComponent" class="w-4 h-4" />
                {{ option.label }}
              </button>
            </div>
            
            <!-- Search -->
            <div class="relative">
              <input 
                v-model="searchQuery"
                @input="handleSearch"
                type="text" 
                placeholder="Search all users..."
                class="w-full px-4 py-2 pl-10 bg-[#1a1a1a] text-sm rounded-md border border-white/10 focus:border-[#055CFF] focus:outline-none"
              />
              <svg class="absolute left-3 top-2.5 w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <!-- Mobile Leaderboard List -->
          <div class="flex-1 overflow-auto">
            <div v-if="displayUsers.length > 0" class="space-y-1">
              <div 
                v-for="user in displayUsers" 
                :key="user.id"
                :class="[
                  'flex items-center gap-3 p-3 border-b border-white/5 transition-all duration-200',
                  user.id === authStore.currentUser?.id 
                    ? 'bg-[#055CFF]/10 border-[#055CFF]/30' 
                    : 'hover:bg-white/5'
                ]"
              >
                <!-- Rank -->
                <div class="w-8 text-center">
                  <span 
                    :class="[
                      'font-bold text-sm',
                      user.id === authStore.currentUser?.id 
                        ? 'text-[#055CFF]' 
                        : user.rank <= 3 ? 'text-yellow-400' : 'text-white/70'
                    ]"
                  >
                    #{{ user.rank || user.globalRank || '?' }}
                  </span>
                </div>

                <!-- Avatar & Info -->
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <img 
                    :src="user.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'" 
                    alt="" 
                    :class="[
                      'w-10 h-10 rounded-full object-cover',
                      user.id === authStore.currentUser?.id ? 'ring-2 ring-[#055CFF]' : ''
                    ]"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p :class="[
                        'font-medium text-sm truncate',
                        user.id === authStore.currentUser?.id ? 'text-[#055CFF]' : 'text-white'
                      ]">
                        {{ user.firstName }} {{ user.lastName }}
                      </p>
                      <span v-if="user.id === authStore.currentUser?.id" class="text-xs bg-[#055CFF] text-white px-1.5 py-0.5 rounded-full">
                        You
                      </span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-white/60">
                      <span>{{ formatNumber(user.gumballs || 0) }}</span>
                      <span>{{ user.level || 'Novice' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Rank Change -->
                <div class="flex items-center">
                  <component 
                    :is="getRankChangeIconComponent(user.rankChange)"
                    :class="['w-4 h-4', getRankChangeColor(user.rankChange)]"
                  />
                </div>
              </div>
            </div>

            <!-- Info -->
            <div class="p-4 text-center border-t border-white/5">
              <p class="text-xs text-white/60">
                {{ searchQuery ? 
                   `Found ${displayUsers.length} users` :
                   'Showing top 30 users. Use search to find others.' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Stats Tab Content -->
        <div v-else-if="activeTab === 'stats'" class="h-full overflow-auto py-4">
          <UserRankCard 
            :user-rank-info="leaderboardStore.userRankInfo"
            :top-achievers="leaderboardStore.topAchievers"
          />
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="hidden md:flex h-full gap-6">
      <!-- Main Leaderboard -->
      <div class="flex-1 md:bg-[#212121] rounded-2xl overflow-hidden flex flex-col relative">
        <!-- Header -->
        <div class="p-6 border-b border-white/10">
          <!-- Filters -->
          <div class="flex items-center gap-4">
            <!-- Period Filter -->
            <div class="flex bg-[#1a1a1a] rounded-md p-1 gap-1">
              <button 
                v-for="option in periodOptions" 
                :key="option.value"
                @click="handlePeriodChange(option.value)"
                :class="[
                  'px-3 py-1 rounded-sm text-xs font-medium transition-colors flex items-center gap-2',
                  selectedPeriod === option.value 
                    ? 'bg-[#FCCA00] text-white' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                ]"
              >
                <component :is="option.iconComponent" class="w-4 h-4" />
                {{ option.label }}
              </button>
            </div>

            <!-- Level Filter -->
            <div class="relative text-xs">
              <button 
                @click="showLevelFilter = !showLevelFilter"
                class="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-md hover:bg-white/10 transition-colors"
              >
                <div 
                  class="w-3 h-3 rounded-full" 
                  :style="{ backgroundColor: levelOptions.find(l => l.value === selectedLevel)?.color }"
                ></div>
                {{ levelOptions.find(l => l.value === selectedLevel)?.label }}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              
              <div v-if="showLevelFilter" class="absolute top-12 left-0 z-50 bg-[#2a2a2a] rounded-lg border border-white/10 shadow-xl min-w-[140px]">
                <button 
                  v-for="option in levelOptions"
                  :key="option.value"
                  @click="handleLevelChange(option.value)"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg transition-colors"
                >
                  <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: option.color }"></div>
                  {{ option.label }}
                </button>
              </div>
            </div>

            <!-- Search -->
            <div class="flex-1 max-w-xs relative">
              <input 
                v-model="searchQuery"
                @input="handleSearch"
                type="text" 
                placeholder="Search all users..."
                class="w-full px-4 py-2 pl-10 bg-[#1a1a1a] text-xs rounded-md border border-white/10 focus:border-[#055CFF] focus:outline-none"
              />
              <svg class="absolute left-3 top-2 w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Desktop Leaderboard Content -->
        <div class="flex-1 overflow-auto scrollbar-hide relative">
          <div v-if="displayUsers.length > 0" class="space-y-1">
            <div 
              v-for="user in displayUsers" 
              :key="user.id"
              :class="[
                'flex items-center gap-4 p-4 border-b border-white/5 transition-all duration-200',
                user.id === authStore.currentUser?.id 
                  ? 'bg-[#055CFF]/10 border-[#055CFF]/30 hover:bg-[#055CFF]/15' 
                  : 'hover:bg-white/5'
              ]"
            >
              <!-- Rank -->
              <div class="w-12 text-center">
                <div class="flex items-center justify-center">
                  <span 
                    :class="[
                      'font-bold text-lg',
                      user.id === authStore.currentUser?.id 
                        ? 'text-[#055CFF]' 
                        : user.rank <= 3 ? 'text-yellow-400' : 'text-white/70'
                    ]"
                  >
                    #{{ user.rank || user.globalRank || '?' }}
                  </span>
                  <component 
                    :is="getRankChangeIconComponent(user.rankChange)"
                    :class="['ml-1 w-4 h-4', getRankChangeColor(user.rankChange)]"
                  />
                </div>
              </div>

              <!-- Avatar & Info -->
              <div class="flex items-center gap-3 flex-1">
                <img 
                  :src="user.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'" 
                  alt="" 
                  :class="[
                    'w-12 h-12 rounded-full object-cover',
                    user.id === authStore.currentUser?.id ? 'ring-2 ring-[#055CFF]' : ''
                  ]"
                />
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <p :class="[
                      'font-medium',
                      user.id === authStore.currentUser?.id ? 'text-[#055CFF]' : 'text-white'
                    ]">
                      {{ user.firstName }} {{ user.lastName }}
                    </p>
                    <span v-if="user.id === authStore.currentUser?.id" class="text-xs bg-[#055CFF] text-white px-2 py-0.5 rounded-full">
                      You
                    </span>
                  </div>
                  <div class="flex items-center gap-4 text-xs text-white/60">
                    <span>{{ formatNumber(user.gumballs || 0) }} gumballs</span>
                    <span>{{ user.level || 'Novice' }}</span>
                    <span v-if="user.isOnline" class="flex items-center gap-1">
                      <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                      Online
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Search/List Info -->
          <div class="p-6 text-center border-t border-white/5">
            <div class="flex items-center justify-center gap-2 text-white/40 text-sm">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              {{ searchQuery ? 
                `Found ${displayUsers.length} users` :
                'Showing top 30 users. Use search to find others.' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop User Rank Card -->
      <div class="w-80 overflow-y-auto scrollbar-hide">
        <UserRankCard 
          :user-rank-info="leaderboardStore.userRankInfo"
          :top-achievers="leaderboardStore.topAchievers"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useLeaderboardStore } from '@/stores/leaderboard'
import { useAuthStore } from '@/stores/auth'
import UserRankCard from '@/components/UserRankCard.vue'

const leaderboardStore = useLeaderboardStore()
const authStore = useAuthStore()

const selectedPeriod = ref('all')
const selectedLevel = ref('all')
const searchQuery = ref('')
const showLevelFilter = ref(false)
const activeTab = ref('leaderboard')
const searchTimeout = ref(null)

// Simple SVG icon components for time periods
const AllTimeIcon = {
  template: `
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
    </svg>
  `
}

const MonthlyIcon = {
  template: `
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
    </svg>
  `
}

const WeeklyIcon = {
  template: `
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
    </svg>
  `
}

// Rank change arrow components - only the essential ones
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

// Fix: Add the missing ArrowRightIcon (for no change)
const ArrowRightIcon = {
  template: `
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
    </svg>
  `
}

// Computed properties
const displayUsers = computed(() => {
  if (searchQuery.value.trim()) {
    return leaderboardStore.searchResults || []
  }
  return leaderboardStore.sortedUsers.slice(0, 30)
})

const handleSearch = () => {
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(async () => {
    if (searchQuery.value.trim()) {
      // Filter existing users from sortedUsers
      const filtered = leaderboardStore.sortedUsers.filter(user => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase()
        const username = (user.username || '').toLowerCase()
        const query = searchQuery.value.toLowerCase()
        return fullName.includes(query) || username.includes(query)
      })
      leaderboardStore.searchResults = filtered
    } else {
      leaderboardStore.searchResults = []
    }
  }, 300)
}

// Period options with icon components
const periodOptions = [
  { value: 'all', label: 'All Time', iconComponent: AllTimeIcon },
  { value: 'monthly', label: 'This Month', iconComponent: MonthlyIcon },
  { value: 'weekly', label: 'This Week', iconComponent: WeeklyIcon }
]

const levelOptions = [
  { value: 'all', label: 'All Levels', color: '#9CA3AF' },
  { value: 'novice', label: 'Novice', color: '#9CA3AF' },
  { value: 'apprentice', label: 'Apprentice', color: '#059669' },
  { value: 'expert', label: 'Expert', color: '#0284C7' },
  { value: 'master', label: 'Master', color: '#7C3AED' },
  { value: 'grandmaster', label: 'Grandmaster', color: '#DC2626' }
]

// Methods
const loadData = async () => {
  await Promise.all([
    leaderboardStore.fetchLeaderboard(),
    leaderboardStore.fetchUserRankInfo(),
    leaderboardStore.fetchTopAchievers(3),
    leaderboardStore.fetchLevelDistribution()
  ])
}

const handlePeriodChange = async (period) => {
  selectedPeriod.value = period
  await leaderboardStore.changeFilters({ period })
  if (searchQuery.value.trim()) {
    handleSearch()
  }
}

const handleLevelChange = async (level) => {
  selectedLevel.value = level
  showLevelFilter.value = false
  await leaderboardStore.changeFilters({ level })
  if (searchQuery.value.trim()) {
    handleSearch()
  }
}

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

// Fix: Proper rank change functions
const getRankChangeIconComponent = (change) => {
  if (change > 0) return ArrowUpIcon
  if (change < 0) return ArrowDownIcon
  return ArrowRightIcon // Fixed: Now properly defined
}

const getRankChangeColor = (change) => {
  if (change > 0) return 'text-green-400'
  if (change < 0) return 'text-red-400'
  return 'text-gray-400'
}

// Watchers
watch([selectedPeriod, selectedLevel], async () => {
  await leaderboardStore.changeFilters({
    period: selectedPeriod.value,
    level: selectedLevel.value
  })
})

watch(() => searchQuery.value, (newValue) => {
  if (!newValue.trim()) {
    leaderboardStore.searchResults = []
  }
})

// Lifecycle
onMounted(() => {
  loadData()
})
</script>