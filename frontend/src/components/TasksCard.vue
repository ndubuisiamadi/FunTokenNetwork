<template>
  <div class="bg-linear-to-tr from-[#9E03FF]/20 to-[#082CFC]/20 backdrop-blur-xl border border-[#082CFC]/50
   text-white p-5 rounded-[18px] ">
    <div class="flex justify-between items-center mb-5">
      <div class="flex items-center gap-2 text-lg font-medium">
        <img src="@/components/icons/check-fat.svg" alt="Check" class="size-6" />
        <span>Tasks</span>
      </div>
      <RouterLink 
        to="/tasks" 
        class="text-xs text-white/80 hover:underline"
      >
        View All
      </RouterLink>
    </div>

    <!-- Tasks Content -->
    <div class="space-y-3">
      <!-- Show tasks if available -->
      <template v-if="mockTasks.length > 0">
        <div 
          v-for="task in mockTasks" 
          :key="task.id"
          class="flex items-center justify-between hover:bg-white/5 p-2 rounded transition-colors cursor-pointer"
          @click="navigateToTask(task)"
        >
          <div class="flex items-center gap-2">
            <img 
              :src="task.platform.iconUrl" 
              :alt="task.platform.name" 
              class="size-8 rounded-full object-cover" 
            />
            <div>
              <p class="text-xs">{{ task.target.handle }}</p>
              <p class="text-xs font-bold text-[#FFCF00]">+{{ formatNumber(task.reward) }} Gumballs</p>
            </div>
          </div>
          <img 
            src="@/components/icons/task-button.svg" 
            alt="Start" 
            class="size-6 opacity-80 group-hover:opacity-100 transition-opacity" 
          />
        </div>
      </template>

      <!-- Empty State -->
      <div v-else class="text-center py-6">
        <svg class="w-8 h-8 mx-auto mb-2 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p class="text-xs text-white/50 mb-1">No tasks available</p>
        <p class="text-xs text-white/30">Check back soon for new opportunities!</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

// Mock data for now (until API is ready)
const mockTasks = computed(() => [
  // {
  //   id: 1,
  //   platform: { name: 'YouTube', iconUrl: '/src/assets/youtube-logo.png' },
  //   target: { handle: '@thatdude' },
  //   reward: 200
  // },
  // {
  //   id: 2,
  //   platform: { name: 'Twitter', iconUrl: '/src/assets/x-logo.png' },
  //   target: { handle: '@thatdude' },
  //   reward: 200
  // },
  // {
  //   id: 3,
  //   platform: { name: 'Telegram', iconUrl: '/src/assets/telegram-logo.png' },
  //   target: { handle: '@thatdude' },
  //   reward: 200
  // }
])

const navigateToTask = (task) => {
  router.push('/tasks')
}

const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num)
}
</script>