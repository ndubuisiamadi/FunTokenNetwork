<template>
    <div class="bg-[#1B1B1B] bg-[url(@/assets/task-card-bg.png)] bg-cover text-white p-6 rounded-[32px] w-[320px] shadow-[0_4px_0px_#12BE32] relative">
  <div class="flex justify-between items-center mb-6">
    <div class="flex items-center gap-2 text-xl font-medium">
      <img src="@/components/icons/checkfat.svg" alt="Check" class="w-6 h-6" />
      <span>Tasks</span>
    </div>
    <button class="text-sm text-white/80 hover:underline">View All</button>
  </div>

  <div class="space-y-5">
    <!-- Task Item -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img src="@/assets/youtube-logo.png" alt="YouTube" class="w-10 h-10 rounded-full" />
        <div>
          <p class="text-sm">Follow @thatdude</p>
          <p class="text-sm font-bold">+200 Gumballs</p>
        </div>
      </div>
      <img src="@/components/icons/task-button.svg" alt="Play" class="w-10 h-10" />
    </div>

    <!-- Repeat with different icons as needed -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img src="@/assets/x-logo.png" alt="Twitter" class="w-10 h-10 rounded-full" />
        <div>
          <p class="text-sm">Follow @thatdude</p>
          <p class="text-sm font-bold">+200 Gumballs</p>
        </div>
      </div>
      <img src="@/components/icons/task-button.svg" alt="Play" class="w-10 h-10" />
    </div>

    <!-- Telegram Example -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img src="@/assets/telegram-logo.png" alt="Telegram" class="w-10 h-10 rounded-full" />
        <div>
          <p class="text-sm">Follow @thatdude</p>
          <p class="text-sm font-bold">+200 Gumballs</p>
        </div>
      </div>
      <img src="@/components/icons/task-button.svg" alt="Play" class="w-10 h-10" />
    </div>
  </div>
</div>

</template>
