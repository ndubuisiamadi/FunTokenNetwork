<script setup>
import { ref, computed } from 'vue'
import TaskItem from '@/components/TaskItem.vue'
import TaskModal from '@/components/TaskModal.vue'

const selectedTaskForModal = ref(null)
const selectedPlatform = ref(null) // null means "All"
const startingTaskId = ref(null)
const completingTaskId = ref(null)

// Available platforms
const availablePlatforms = [
    { name: 'Twitter', iconUrl: '/src/assets/x-logo.png' },
    { name: 'YouTube', iconUrl: '/src/assets/youtube-logo.png' },
    { name: 'Telegram', iconUrl: '/src/assets/telegram-logo.png' }
]

// Enhanced mock data with more variety
const allMockTasks = [
    // Twitter Tasks
    // {
    //     id: 1,
    //     platform: { name: 'Twitter', iconUrl: '/src/assets/x-logo.png' },
    //     type: 'follow',
    //     target: { handle: '@thatdude' },
    //     description: 'Follow @thatdude on Twitter',
    //     reward: 15000,
    //     currency: 'Gumballs',
    //     status: 'available',
    //     isActive: true,
    //     difficulty: 2
    // },
    // {
    //     id: 2,
    //     platform: { name: 'Twitter', iconUrl: '/src/assets/x-logo.png' },
    //     type: 'like',
    //     target: { handle: '@techguru' },
    //     description: 'Like the latest post from @techguru',
    //     reward: 8000,
    //     currency: 'Gumballs',
    //     status: 'in-progress',
    //     isActive: true,
    //     difficulty: 1
    // },
    // {
    //     id: 3,
    //     platform: { name: 'Twitter', iconUrl: '/src/assets/x-logo.png' },
    //     type: 'retweet',
    //     target: { handle: '@cryptonews' },
    //     description: 'Retweet the pinned post from @cryptonews',
    //     reward: 12000,
    //     currency: 'Gumballs',
    //     status: 'completed',
    //     isActive: true,
    //     difficulty: 1
    // },
    // // YouTube Tasks
    // {
    //     id: 4,
    //     platform: { name: 'YouTube', iconUrl: '/src/assets/youtube-logo.png' },
    //     type: 'subscribe',
    //     target: { handle: 'TechReviews' },
    //     description: 'Subscribe to TechReviews channel',
    //     reward: 25000,
    //     currency: 'Gumballs',
    //     status: 'available',
    //     isActive: true,
    //     difficulty: 2
    // },
    // {
    //     id: 5,
    //     platform: { name: 'YouTube', iconUrl: '/src/assets/youtube-logo.png' },
    //     type: 'watch',
    //     target: { handle: 'CodingTutorials' },
    //     description: 'Watch the latest tutorial video (min 3 minutes)',
    //     reward: 18000,
    //     currency: 'Gumballs',
    //     status: 'available',
    //     isActive: true,
    //     difficulty: 3,
    //     requirements: [
    //         { id: 1, description: 'Account age > 30 days', met: true },
    //         { id: 2, description: 'Subscribed for notifications', met: false }
    //     ]
    // },
    // {
    //     id: 6,
    //     platform: { name: 'YouTube', iconUrl: '/src/assets/youtube-logo.png' },
    //     type: 'comment',
    //     target: { handle: 'GameReviews' },
    //     description: 'Leave a meaningful comment on the latest review',
    //     reward: 22000,
    //     currency: 'Gumballs',
    //     status: 'pending-verification',
    //     isActive: true,
    //     difficulty: 2
    // },
    // // Telegram Tasks
    // {
    //     id: 7,
    //     platform: { name: 'Telegram', iconUrl: '/src/assets/telegram-logo.png' },
    //     type: 'join',
    //     target: { handle: '@cryptoupdates' },
    //     description: 'Join the crypto updates channel',
    //     reward: 20000,
    //     currency: 'Gumballs',
    //     status: 'available',
    //     isActive: true,
    //     difficulty: 1
    // },
    // {
    //     id: 8,
    //     platform: { name: 'Telegram', iconUrl: '/src/assets/telegram-logo.png' },
    //     type: 'share',
    //     target: { handle: '@technews' },
    //     description: 'Share the latest post from tech news',
    //     reward: 15000,
    //     currency: 'Gumballs',
    //     status: 'available',
    //     isActive: true,
    //     difficulty: 2,
    //     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    // }
]

// Computed properties
const filteredTasks = computed(() => {
    if (!selectedPlatform.value) {
        return allMockTasks
    }
    return allMockTasks.filter(task => task.platform.name === selectedPlatform.value)
})

// Methods
const selectPlatform = (platform) => {
    selectedPlatform.value = platform
}

const clearFilter = () => {
    selectedPlatform.value = null
}

const handleStartTask = async (task) => {
    startingTaskId.value = task.id
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update task status
    const taskIndex = allMockTasks.findIndex(t => t.id === task.id)
    if (taskIndex !== -1) {
        allMockTasks[taskIndex].status = 'in-progress'
    }
    
    startingTaskId.value = null
}

const handleCompleteTask = async (task) => {
    completingTaskId.value = task.id
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Update task status
    const taskIndex = allMockTasks.findIndex(t => t.id === task.id)
    if (taskIndex !== -1) {
        allMockTasks[taskIndex].status = 'pending-verification'
    }
    
    completingTaskId.value = null
    selectedTaskForModal.value = null
}
</script>
<template>
    <div class="flex flex-col lg:flex-row gap-3 lg:gap-6 text-white h-full">
        <div class="flex flex-col flex-1 lg:flex-2 gap-3 h-full min-h-0">
            <!-- Platform Filter Tabs -->
            <div class="flex flex-wrap gap-2 items-center py-4">
                <!-- All Tasks Tab -->
                <button
                    @click="selectPlatform(null)"
                    :class="[
                        'px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border-2 transition-all duration-200 flex-shrink-0',
                        selectedPlatform === null 
                            ? 'border-[#12BE32] bg-[#12BE32]/20 text-[#12BE32]' 
                            : 'border-white/20 text-white/60 hover:border-white/50 hover:text-white'
                    ]"
                >
                    All
                </button>

                <!-- Platform Tabs -->
                <button
                    v-for="platform in availablePlatforms"
                    :key="platform.name"
                    @click="selectPlatform(platform.name)"
                    :class="[
                        'size-10 sm:size-12 rounded-full border-2 transition-all duration-200 hover:scale-105 flex-shrink-0',
                        selectedPlatform === platform.name 
                            ? 'border-[#12BE32] scale-110 shadow-lg shadow-[#12BE32]/30' 
                            : 'border-white/20 hover:border-white/50'
                    ]"
                    :title="`Filter by ${platform.name}`"
                >
                    <img 
                        :src="platform.iconUrl" 
                        :alt="platform.name"
                        class="w-full h-full rounded-full object-cover"
                    />
                </button>
            </div>

            <!-- Tasks Count & Filter Status -->
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs sm:text-sm">
                <div class="text-white/60">
                    <span v-if="selectedPlatform">
                        {{ filteredTasks.length }} {{ selectedPlatform }} task{{ filteredTasks.length !== 1 ? 's' : '' }}
                    </span>
                    <span v-else>
                        {{ filteredTasks.length }} total task{{ filteredTasks.length !== 1 ? 's' : '' }}
                    </span>
                </div>
                <button 
                    v-if="selectedPlatform"
                    @click="clearFilter"
                    class="text-[#12BE32] hover:text-[#0ea025] text-xs underline self-start sm:self-auto"
                >
                    Clear filter
                </button>
            </div>
            
            <!-- Tasks List -->
            <div class="flex flex-col w-full p-0 sm:p-4 md:p-3 md:bg-[#101010] rounded-2xl overflow-auto scrollbar-hide flex-1 min-h-0">
                <!-- Empty State -->
                <div v-if="filteredTasks.length === 0" class="text-center py-8 text-white/50">
                    <svg class="w-8 sm:w-12 h-8 sm:h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p class="text-sm">No tasks available{{ selectedPlatform ? ` for ${selectedPlatform}` : '' }}</p>
                    <p class="text-xs text-white/30 mt-1">Check back later for new tasks!</p>
                </div>

                <!-- Tasks -->
                <div v-else class="space-y-3 sm:space-y-4">
                    <TaskItem
                        v-for="task in filteredTasks"
                        :key="task.id"
                        :task="task"
                        :starting="startingTaskId === task.id"
                        :completing="completingTaskId === task.id"
                        @start="handleStartTask"
                        @complete="handleCompleteTask"
                        @click="selectedTaskForModal = task"
                        class="cursor-pointer hover:bg-white/5 transition-colors duration-200 rounded-lg"
                    />
                </div>
            </div>
        </div>

        <!-- Platform Tips Panel - Hidden on mobile, visible on lg+ screens -->
        <div class="hidden lg:flex lg:flex-1 max-w-sm">
            <div class="w-full p-6 bg-[#212121] rounded-2xl h-fit">
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

        <!-- Task Modal -->
        <TaskModal
            v-if="selectedTaskForModal"
            :task="selectedTaskForModal"
            @close="selectedTaskForModal = null"
            @complete="handleCompleteTask"
        />
    </div>
</template>