<template>
  <div class="h-full w-[full] text-white overflow-y-auto scrollbar-hide">
    
    <!-- Two Column Layout -->
    <div class="container flex flex-col lg:flex-row gap-6">

        <!-- Left Column - Main Content (60%) -->
        <div class="flex-1 lg:flex-2 flex flex-col">
          
          <!-- Total Earnings Summary -->
          <div class="mb-6">
            <div class="bg-linear-to-tr from-[#29FF03]/20 to-[#082CFC]/20 rounded-lg p-6 border border-purple-500/20">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p class="text-base text-white/80 mb-1">Total Earned</p>
                  <p class="text-3xl font-bold flex items-center  text-yellow-400">
                    {{ totalEarnings.toLocaleString() }} <img src="@/components/icons/gumball.png" class="inline size-10">
                  </p>
                </div>
                <div class="flex gap-6">
                  <div class="text-center">
                    <p class="text-xs text-white/60">This Week</p>
                    <p class="text-xl font-semibold text-green-400">+{{ weeklyEarnings }}</p>
                  </div>
                  <div class="text-center">
                    <p class="text-xs text-white/60">This Month</p>
                    <p class="text-xl font-semibold text-blue-400">+{{ monthlyEarnings }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sticky Tab Navigation -->
          <div class="sticky top-0 z-20 mb-6 bg-[#262624]">
            <div class="flex space-x-1 bg-[#030712]/20 p-1 rounded-lg border border-white/10">
              <button
                @click="activeTab = 'referrals'"
                :class="[
                  'flex items-center gap-2 px-4 py-2 text-sm rounded-md font-medium transition-all duration-200',
                  activeTab === 'referrals'
                    ? 'bg-linear-to-tr from-[#00B043] to-[#195E00] text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                ]"
              >
              Referrals
              </button>
              <button
                @click="activeTab = 'tasks'"
                :class="[
                  'flex items-center gap-2 px-4 py-2 text-sm rounded-md font-medium transition-all duration-200',
                  activeTab === 'tasks'
                    ? 'bg-linear-to-tr from-[#00B043] to-[#195E00] text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                ]"
              >
              Tasks
              </button>
            </div>
          </div>

          <!-- Tab Content -->
          <div>
            <ReferralsDashboard 
              v-if="activeTab === 'referrals'"
              @earnings-updated="handleEarningsUpdate"
              @referral-data-loaded="updatePeriodEarnings"
            />
            
            <TasksDashboard 
              v-else-if="activeTab === 'tasks'"
              @earnings-updated="handleEarningsUpdate"
            />
          </div>
        </div>

        <!-- Right Column - Referral Guide (40%) - Sticky -->
        <div v-if="activeTab === 'referrals'" class="hidden lg:flex lg:flex-1 order-first lg:order-last">
          <div class="sticky top-0 bg-[#030712]/20 rounded-lg p-6 border border-white/10">
            
            <!-- Guide Header -->
            <div class="mb-6">
              <h2 class="text-xl font-bold mb-2 flex items-center gap-2">
                🎯 How Referrals Work
              </h2>
              <p class="text-sm text-white/60">
                Everything you need to know about earning with referrals
              </p>
            </div>

            <!-- How It Works Steps -->
            <div class="space-y-6">
              <div class="bg-white/5 rounded-lg p-4">
                <h3 class="font-bold mb-3 flex items-center gap-2">
                  <span class="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-sm">1</span>
                  Share Your Code
                </h3>
                <p class="text-xs text-white/80 mb-3">
                  Get your unique referral code and share it with friends via WhatsApp, Facebook, Twitter, or any platform.
                </p>
                <div class="bg-purple-900/30 rounded-lg p-3">
                  <p class="text-xs text-purple-300">💡 Tip: Personal messages work better than public posts</p>
                </div>
              </div>

              <div class="bg-white/5 rounded-lg p-4">
                <h3 class="font-bold mb-3 flex items-center gap-2">
                  <span class="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-sm">2</span>
                  Friend Signs Up
                </h3>
                <p class="text-xs text-white/80 mb-3">
                  When someone uses your code to register, they become your referral and you both get rewards instantly.
                </p>
                <div class="bg-green-900/30 rounded-lg p-3">
                  <p class="text-xs text-green-300">🎁 You get 50 Gumballs • They get 25 Gumballs</p>
                </div>
              </div>

              <div class="bg-white/5 rounded-lg p-4">
                <h3 class="font-bold mb-3 flex items-center gap-2">
                  <span class="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-sm">3</span>
                  Reach Milestones
                </h3>
                <p class="text-xs text-white/80 mb-3">
                  Earn bonus rewards as you reach referral milestones:
                </p>
                <div class="space-y-2">
                  <div class="flex justify-between text-xs bg-yellow-900/30 rounded p-2">
                    <span>5 referrals</span>
                    <span class="text-yellow-400">+100</span>
                  </div>
                  <div class="flex justify-between text-xs bg-yellow-900/30 rounded p-2">
                    <span>10 referrals</span>
                    <span class="text-yellow-400">+250</span>
                  </div>
                  <div class="flex justify-between text-xs bg-yellow-900/30 rounded p-2">
                    <span>25 referrals</span>
                    <span class="text-yellow-400">+500</span>
                  </div>
                  <div class="text-center text-xs text-white/60 mt-2">
                    ...and more at 50 & 100!
                  </div>
                </div>
              </div>

              <!-- Earning Breakdown -->
              <div class="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-500/30">
                <h3 class="flex gap-2 font-bold mb-3"><img src="@/components/icons/performance.svg" class="inline size-6"> Earning Breakdown</h3>
                <div class="space-y-3 text-sm">
                  <div class="flex justify-between items-center">
                    <span class="text-white/80">Per referral signup</span>
                    <span class="flex text-green-400 font-bold">50<img src="@/components/icons/gumball.png" class="inline size-5"></span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-white/80">5 referral milestone</span>
                    <span class="flex text-yellow-400 font-bold">100<img src="@/components/icons/gumball.png" class="inline size-5"></span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-white/80">10 referral milestone</span>
                    <span class="flex text-yellow-400 font-bold">250<img src="@/components/icons/gumball.png" class="inline size-5"></span>
                  </div>
                  <hr class="border-white/20">
                  <div class="flex justify-between items-center font-bold">
                    <span>First 10 referrals total</span>
                    <span class="flex text-purple-400">850<img src="@/components/icons/gumball.png" class="inline size-5"></span>
                  </div>
                </div>
              </div>

              <!-- Pro Tips -->
              <div class="bg-white/5 rounded-lg p-4">
                <h3 class="font-bold mb-3 flex items-center gap-2">
                  ⚡ Pro Tips
                </h3>
                <div class="space-y-3 text-xs text-white/80">
                  <div class="flex items-start gap-2">
                    <span class="text-blue-400">•</span>
                    <span>Share with close friends first - they're more likely to join</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="text-blue-400">•</span>
                    <span>Explain the benefits they'll get (25 Gumballs welcome bonus)</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="text-blue-400">•</span>
                    <span>Post in relevant social groups or communities</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="text-blue-400">•</span>
                    <span>Track your progress and celebrate milestones</span>
                  </div>
                </div>
              </div>

              <!-- FAQ -->
              <div class="bg-white/5 rounded-lg p-4">
                <h3 class="font-bold mb-3">❓ Quick FAQ</h3>
                <div class="space-y-3 text-xs">
                  <div>
                    <p class="font-medium mb-1">When do I get rewarded?</p>
                    <p class="text-white/60">Instantly when your friend completes registration</p>
                  </div>
                  <div>
                    <p class="font-medium mb-1">Is there a limit?</p>
                    <p class="text-white/60">No limit! Refer as many friends as you want</p>
                  </div>
                  <div>
                    <p class="font-medium mb-1">What if my code doesn't work?</p>
                    <p class="text-white/60">Contact support - we'll help resolve any issues</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="hidden lg:flex lg:flex-1 max-w-sm">
            <div class="w-full p-6 bg-[#212121] sticky top-0 rounded-2xl h-fit">
                <!-- Header -->
                <div class="flex items-center gap-3 mb-6">
                    <div class="size-10 bg-[#12BE32]/20 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-[#12BE32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">Platform Tips</h3>
                        <p class="text-sm text-white/60">
                            {{ selectedPlatform || 'General' }} guidance
                        </p>
                    </div>
                </div>

                <!-- Tips Content -->
                <div class="space-y-4">
                    <p class="text-sm text-white/80 leading-relaxed">
                        <span v-if="!selectedPlatform">
                            • Complete tasks to earn Gumballs and climb the leaderboard<br>
                            • Some tasks require specific account criteria<br>
                            • Task rewards vary based on difficulty and platform<br>
                            • Check expiration dates to avoid missing out
                        </span>
                        <span v-else-if="selectedPlatform === 'Twitter'">
                            • Make sure your profile is public for verification<br>
                            • Likes and follows are tracked automatically<br>
                            • Retweets and quote tweets count as shares
                        </span>
                        <span v-else-if="selectedPlatform === 'YouTube'">
                            • Subscribe notifications help track completions faster<br>
                            • Watch time affects task verification<br>
                            • Comments should be meaningful and relevant
                        </span>
                        <span v-else-if="selectedPlatform === 'Telegram'">
                            • Join channels to stay updated on new tasks<br>
                            • Forward messages only to appropriate groups<br>
                            • Respect group rules and guidelines
                        </span>
                    </p>
                </div>

                <!-- Pro Tip -->
                <div class="mt-6 p-4 bg-[#12BE32]/10 border border-[#12BE32]/30 rounded-lg">
                    <div class="flex items-start gap-2">
                        <svg class="w-4 h-4 text-[#12BE32] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                        <div>
                            <p class="text-xs font-semibold text-[#12BE32] mb-1">Pro Tip</p>
                            <p class="text-xs text-white/70">
                                Focus on completing higher reward tasks first to maximize your Gumball earnings!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ReferralsDashboard from '@/components/ReferralsDashboard.vue'
import TasksDashboard from '@/components/TasksDashboard.vue'
import GumballLogo from '@/components/GumballLogo.vue'

const authStore = useAuthStore()

// Tab management
const activeTab = ref('referrals') // Default to referrals tab

// Earnings data
const totalEarnings = ref(0)
const weeklyEarnings = ref(0)
const monthlyEarnings = ref(0)

// Computed property that automatically updates when authStore.user changes
const currentUserGumballs = computed(() => authStore.user?.gumballs || 0)

// Watch for changes in user gumballs and update display
watch(currentUserGumballs, (newGumballs) => {
  console.log('User gumballs changed to:', newGumballs)
  totalEarnings.value = newGumballs
}, { immediate: true })

// Load initial earnings data
onMounted(async () => {
  await loadEarningsData()
})

async function loadEarningsData() {
  try {
    console.log('Loading earnings data...')
    
    // First refresh user data to get latest gumballs
    await authStore.refreshUser()
    
    // Get current user's gumballs from auth store
    const currentUser = authStore.user
    if (currentUser) {
      totalEarnings.value = currentUser.gumballs || 0
      console.log('Initial gumballs loaded:', totalEarnings.value)
    }
    
    // Weekly/monthly earnings will be calculated when referral data loads
    // from the referral-data-loaded event
    
  } catch (error) {
    console.error('Error loading earnings data:', error)
  }
}

// Handle earnings updates from child components
async function handleEarningsUpdate(newEarnings) {
  console.log('Earnings update requested:', newEarnings)
  
  // Refresh user data from server to get latest gumballs
  const refreshResult = await authStore.refreshUser()
  
  if (refreshResult.success) {
    totalEarnings.value = authStore.user.gumballs || 0
    console.log('Earnings updated to:', totalEarnings.value)
  } else {
    console.error('Failed to refresh user data:', refreshResult.error)
    // Fallback to the provided value
    totalEarnings.value = newEarnings
  }
}

// Calculate weekly and monthly earnings from referral data
function calculatePeriodEarnings(referralData) {
  if (!referralData.referralRewards || !Array.isArray(referralData.referralRewards)) {
    return { weekly: 0, monthly: 0 }
  }

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  let weeklyTotal = 0
  let monthlyTotal = 0

  referralData.referralRewards.forEach(reward => {
    const rewardDate = new Date(reward.createdAt)
    const amount = reward.amount || 0

    if (rewardDate >= oneWeekAgo) {
      weeklyTotal += amount
    }
    if (rewardDate >= oneMonthAgo) {
      monthlyTotal += amount
    }
  })

  return { weekly: weeklyTotal, monthly: monthlyTotal }
}

// Listen for referral data updates to recalculate period earnings
function updatePeriodEarnings(referralData) {
  console.log('Updating period earnings from referral data')
  const periodEarnings = calculatePeriodEarnings(referralData)
  weeklyEarnings.value = periodEarnings.weekly
  monthlyEarnings.value = periodEarnings.monthly
  
  console.log('Period earnings calculated:', periodEarnings)
}

// Periodically refresh user data in case earnings changed from other sources
setInterval(async () => {
  if (authStore.isAuthenticated) {
    console.log('Periodic refresh of user data...')
    await authStore.refreshUser()
  }
}, 60000) // Refresh every minute
</script>