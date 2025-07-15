<script setup>
// Simplified - no auto-dismiss or click dismiss
const props = defineProps({
  unreadCount: {
    type: Number,
    default: 0
  }
})

const formatUnreadCount = (count) => {
  if (count <= 0) return 'New messages'
  if (count === 1) return '1 new message'
  if (count > 99) return '99+ new messages'
  return `${count} new messages`
}

// Remove all dismiss logic - let ChatArea handle visibility
</script>

<template>
  <div class="flex items-center justify-center my-6">
    <div class="flex items-center w-full max-w-lg">
      <!-- Left line -->
      <div class="flex-1 h-[2px] bg-gradient-to-r from-transparent via-[#055CFF]/50 to-[#055CFF]"></div>
      
      <!-- Center content - no click handler -->
      <div class="flex items-center gap-3 px-4 py-2 bg-[#055CFF]/20 border-2 border-[#055CFF] rounded-full mx-4 shadow-xl">
        <!-- Icon -->
        <div class="size-2 bg-[#055CFF] rounded-full animate-pulse shadow-lg"></div>
        
        <!-- Text -->
        <span class="text-xs font-bold text-[#055CFF] whitespace-nowrap">
          {{ formatUnreadCount(unreadCount) }}
        </span>
      </div>
      
      <!-- Right line -->
      <div class="flex-1 h-[2px] bg-gradient-to-l from-transparent via-[#055CFF]/50 to-[#055CFF]"></div>
    </div>
  </div>
</template>