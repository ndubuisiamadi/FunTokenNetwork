<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
      <p class="mt-4 text-white/60">Loading your referral data...</p>
    </div>

    <!-- Main Content -->
    <div v-else>
      <!-- Primary Action Zone -->
      <div class="bg-linear-to-tr from-[#29FF03]/20 to-[#082CFC]/20 rounded-xl p-6 border border-purple-500/30 mb-6">
        <div class="text-center">
          <h2 class="text-xl font-bold mb-2">
            {{ hasReferrals ? 'Share Your Code & Earn 50 Gumballs per Friend!' : '🚀 Start Earning! Invite Friends & Get 50 Gumballs' }}
          </h2>
          
          <!-- Referral Code Display -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <div class="bg-[#1a1a1a] border border-white/20 rounded-lg px-6 py-3">
              <span class="text-2xl font-mono font-bold text-yellow-400">
                {{ referralData.referralCode || '••••••••' }}
              </span>
            </div>
            
            <div class="flex gap-3">
              <button
                @click="copyReferralCode"
                :disabled="!referralData.referralCode"
                class="bg-linear-to-tr from-[#00B043] to-[#195E00] cursor-pointer hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-3 text-sm rounded-lg font-medium transition-colors duration-200 flex items-center gap-1"
              >
                <img src="@/components/icons/copy.svg" class="inline size-6"> {{ copyButtonText }}
              </button>
              <button
                @click="openShareSheet"
                :disabled="!referralData.referralCode"
                class="bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:bg-gray-600 text-white px-6 py-3 text-sm  rounded-lg font-medium transition-colors duration-200 flex items-center gap-1"
              >
                <img src="@/components/icons/share.svg" class="inline size-6"> Share
              </button>
            </div>
          </div>

          <!-- Social Proof / Welcome Message -->
          <p class="text-white/80 text-sm">
            <span v-if="hasReferrals" class="flex justify-center items-center">
              <img src="@/components/icons/friends-filled.svg" class="inline size-5"> {{ referralData.totalReferrals || 0 }} friends joined • <img src="@/components/icons/gumball.png" class="inline size-5"> {{ referralData.referralEarnings || 0 }} earned so far
            </span>
            <span v-else>
              💡 Each friend you invite earns you 50 Gumballs<br>
              Plus they get 25 Gumballs welcome bonus too!
            </span>
          </p>
        </div>
      </div>

      <!-- Performance Dashboard (only show if user has referrals) -->
      <div v-if="hasReferrals" class="space-y-6 mb-6">
        
        <!-- Lifetime Performance -->
        <div class="bg-[#030712]/20 rounded-lg p-6 border border-white/10">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
            <img src="@/components/icons/analytics.svg" class="inline size-6"> 
            Lifetime Performance
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-white/5 rounded-lg">
              <p class="text-2xl font-bold text-purple-400">{{ referralData.totalReferrals || 0 }}</p>
              <p class="text-sm text-white/60">Total Referrals</p>
            </div>
            
            <div class="text-center p-4 bg-white/5 rounded-lg">
              <p class="text-2xl font-bold text-green-400">{{ referralData.activeReferrals || 0 }}</p>
              <p class="text-sm text-white/60">Active Friends</p>
            </div>
            
            <div class="text-center p-4 bg-white/5 rounded-lg">
              <p class="flex justify-center items-center text-2xl font-bold text-yellow-400">
                {{ referralData.referralEarnings || 0 }} <img src="@/components/icons/gumball.png" class="inline size-6"></p>
              <p class="text-sm text-white/60">Total Earnings</p>
            </div>
            
            <div class="text-center p-4 bg-white/5 rounded-lg">
              <p class="text-2xl font-bold text-blue-400">{{ nextMilestoneDistance }}</p>
              <p class="text-sm text-white/60">To Next Milestone</p>
            </div>
          </div>
        </div>

        <!-- Recent Activity Analytics -->
        <div class="bg-[#030712]/20 rounded-lg p-6 border border-white/10">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold flex items-center gap-2">
              <img src="@/components/icons/activity.svg" class="inline size-6"> Recent Activity
            </h3>
            <span class="text-xs text-white/60 bg-white/10 px-3 py-1 rounded-full">
              {{ referralData.analytics?.period || 'Last 30 days' }}
            </span>
          </div>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-white/5 rounded-lg">
              <p class="text-2xl font-bold text-cyan-400">{{ referralData.analytics?.totalClicks || 0 }}</p>
              <p class="text-sm text-white/60">Link Clicks</p>
            </div>
            
            <div class="text-center p-4 bg-white/5 rounded-lg">
              <p class="text-2xl font-bold text-orange-400">{{ referralData.analytics?.conversions || 0 }}</p>
              <p class="text-sm text-white/60">New Sign-ups</p>
            </div>
            
            <div class="text-center p-4 bg-white/5 rounded-lg">
              <p class="text-2xl font-bold text-pink-400">{{ referralData.analytics?.conversionRate || 0 }}%</p>
              <p class="text-sm text-white/60">Conversion Rate</p>
            </div>
            
            <div class="text-center p-4 bg-white/5 rounded-lg">
              <p class="text-2xl font-bold text-indigo-400">
                {{ (referralData.analytics?.totalClicks || 0) > 0 ? 'Active' : '-' }}
              </p>
              <p class="text-sm text-white/60">Status</p>
            </div>
          </div>
          
          <!-- Helpful Context for 0 Activity -->
          <div v-if="(referralData.analytics?.totalClicks || 0) === 0" class="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div class="flex items-start gap-2">
              <span class="text-blue-400">💡</span>
              <div class="text-sm text-blue-200">
                <p class="font-medium mb-1">No recent link activity</p>
                <p class="text-blue-300/80 text-xs">Your referrals might have signed up directly with your code, or this tracking was added after they joined. Your lifetime referrals above show your actual success!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Milestone Progress -->
      <div class="bg-[#030712]/20 rounded-lg p-6 border border-white/10 mb-6">
        <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
          🎖️ {{ hasReferrals ? `Progress to ${nextMilestone.count} Referrals` : 'Your First Milestone' }}
        </h3>
        
        <div class="space-y-3">
          <!-- Progress Bar -->
          <div class="w-full bg-white/10 rounded-full h-3">
            <div 
              class="bg-linear-to-tr from-[#00B043] to-[#195E00] h-3 rounded-full transition-all duration-500"
              :style="{ width: `${milestoneProgress}%` }"
            ></div>
          </div>
          
          <!-- Progress Text -->
          <div class="flex justify-between text-xs items-center">
            <span class="text-white/80">{{ referralData.totalReferrals || 0 }}/{{ nextMilestone.count }} referrals</span>
            <span class="text-yellow-400 font-bold">Reward: {{ nextMilestone.reward }} Gumballs Bonus</span>
          </div>
          
          <p class="text-sm text-white/60">
            {{ hasReferrals ? 
              `${nextMilestoneDistance} more friends needed!` : 
              `Invite 5 friends to unlock your first 100🎾 bonus!`
            }}
          </p>
        </div>
      </div>

      <!-- How It Works (Empty State) -->
      <div v-if="!hasReferrals" class="bg-[#1a1a1a] rounded-lg p-6 border border-white/10 mb-6">
        <h3 class="text-lg font-bold mb-4 flex items-center gap-2">📱 How It Works</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="flex items-start gap-3">
            <span class="text-2xl">1️⃣</span>
            <div>
              <p class="font-medium">Share your unique code</p>
              <p class="text-sm text-white/60">Send to friends via social media or direct link</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-2xl">2️⃣</span>
            <div>
              <p class="font-medium">They sign up using your link</p>
              <p class="text-sm text-white/60">Friends create account with your referral code</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-2xl">3️⃣</span>
            <div>
              <p class="font-medium">You both earn gumballs instantly!</p>
              <p class="text-sm text-white/60">You get 50 Gumballs, they get 25 Gumballs welcome bonus</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-2xl">4️⃣</span>
            <div>
              <p class="font-medium">Reach milestones for bonus rewards</p>
              <p class="text-sm text-white/60">Extra bonuses at 5, 10, 25, 50, and 100 referrals</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Referral Network (only show if user has referrals) -->
      <div v-if="hasReferrals && referralData.referrals?.length > 0" class="bg-[#030712]/20 rounded-lg p-6 border border-white/10 mb-6">
        <h3 class="text-lg font-bold mb-4 flex items-center gap-2"><img src="@/components/icons/friends-filled.svg" class="inline size-6"> Your Latest Referrals</h3>
        <div class="space-y-3">
          <div 
            v-for="referral in referralData.referrals.slice(0, 4)" 
            :key="referral.id"
            class="flex items-center justify-between p-3 bg-white/5 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <span :class="getActivityStatusIcon(referral.isOnline, referral.lastSeen)"></span>
                <img 
                  :src="getAvatarUrl(referral.avatarUrl)" 
                  :alt="referral.username"
                  class="w-8 h-8 rounded-full object-cover bg-gray-600"
                >
                <div>
                  <p class="font-medium text-sm">@{{ referral.username }}</p>
                  <p class="text-xs text-white/60">{{ getDisplayName(referral) }}</p>
                </div>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-green-400">+50</p>
              <p class="text-xs text-white/60">{{ formatJoinDate(referral.createdAt) }}</p>
            </div>
          </div>
          
          <!-- <button 
            v-if="referralData.referrals.length > 4"
            class="w-full text-center py-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            View All {{ referralData.referrals.length }} →
          </button> -->
        </div>
      </div>
    </div>

    <!-- Share Sheet Modal -->
    <ReferralShareSheet 
      v-if="showShareSheet"
      :referral-code="referralData.referralCode"
      @close="showShareSheet = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineEmits, watch } from 'vue'
import { referralAPI } from '@/services/referralAPI'
import ReferralShareSheet from '@/components/ReferralShareSheet.vue'
import { getAvatarUrl } from '@/utils/avatar'

const emit = defineEmits(['earnings-updated', 'referral-data-loaded'])

// Reactive data
const loading = ref(true)
const referralData = ref({})
const copyButtonText = ref('Copy')
const showShareSheet = ref(false)

// Store previous referral earnings to detect changes
const previousReferralEarnings = ref(0)

// Milestones configuration
const milestones = [
  { count: 5, reward: 100 },
  { count: 10, reward: 250 },
  { count: 25, reward: 500 },
  { count: 50, reward: 1000 },
  { count: 100, reward: 2500 }
]

// Computed properties
const hasReferrals = computed(() => {
  const total = referralData.value.totalReferrals
  return total && total > 0
})

const nextMilestone = computed(() => {
  const current = referralData.value.totalReferrals || 0
  return milestones.find(milestone => milestone.count > current) || milestones[milestones.length - 1]
})

const nextMilestoneDistance = computed(() => {
  const current = referralData.value.totalReferrals || 0
  return Math.max(0, nextMilestone.value.count - current)
})

const milestoneProgress = computed(() => {
  const current = referralData.value.totalReferrals || 0
  const target = nextMilestone.value.count
  const previousMilestone = milestones.find(m => m.count <= current) || { count: 0 }
  
  if (current >= target) return 100
  
  const progress = ((current - previousMilestone.count) / (target - previousMilestone.count)) * 100
  return Math.max(0, Math.min(100, progress))
})

// Watch for changes in referral earnings and emit update
watch(
  () => referralData.value.referralEarnings,
  (newEarnings, oldEarnings) => {
    if (newEarnings !== undefined && newEarnings !== oldEarnings && oldEarnings !== undefined) {
      console.log('Referral earnings changed from', oldEarnings, 'to', newEarnings)
      emit('earnings-updated', newEarnings)
    }
  }
)

// Methods
onMounted(async () => {
  await loadReferralData()
  
  // Set up periodic refresh to check for new referrals
  setInterval(async () => {
    await loadReferralData(true) // Silent refresh
  }, 30000) // Check every 30 seconds
})

async function loadReferralData(silent = false) {
  try {
    if (!silent) {
      loading.value = true
    }
    
    const response = await referralAPI.getMyReferralData()
    const newData = response.data || {}
    
    // Check if referral earnings changed
    const oldEarnings = referralData.value.referralEarnings || 0
    const newEarnings = newData.referralEarnings || 0
    
    // Update referral data
    referralData.value = newData
    
    // Emit the referral data to parent for period earnings calculation
    emit('referral-data-loaded', referralData.value)
    
    // If earnings changed, notify parent to refresh total earnings
    if (newEarnings !== oldEarnings && oldEarnings > 0) {
      console.log('Referral earnings updated, triggering refresh')
      emit('earnings-updated', newEarnings)
    }
    
  } catch (error) {
    console.error('Error loading referral data:', error)
    // Set empty object as fallback
    referralData.value = {}
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

async function copyReferralCode() {
  try {
    const referralUrl = `${window.location.origin}/signup?ref=${referralData.value.referralCode}`
    await navigator.clipboard.writeText(referralUrl)
    copyButtonText.value = 'Copied!'
    setTimeout(() => {
      copyButtonText.value = 'Copy'
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
    copyButtonText.value = 'Failed'
    setTimeout(() => {
      copyButtonText.value = 'Copy'
    }, 2000)
  }
}

function openShareSheet() {
  showShareSheet.value = true
}

function getActivityStatusIcon(isOnline, lastSeen) {
  if (isOnline) return '🟢'
  
  const lastSeenDate = new Date(lastSeen)
  const daysSince = (Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysSince <= 7) return '🟡'
  return '🔴'
}

function getDisplayName(referral) {
  if (referral.firstName && referral.lastName) {
    return `${referral.firstName} ${referral.lastName}`
  }
  return referral.firstName || referral.lastName || 'New User'
}

function formatJoinDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  return `${Math.ceil(diffDays / 30)} months ago`
}
</script>