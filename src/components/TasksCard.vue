<template>
    <div class="bg-[#212121] bg-[url(@/assets/task-card-bg.png)] bg-cover text-white p-5 rounded-[18px] shadow-[0_4px_0px_#12BE32]">
  <div class="flex justify-between items-center mb-5">
    <div class="flex items-center gap-2 text-lg font-medium">
      <img src="@/components/icons/checkfat.svg" alt="Check" class="size-6" />
      <span>Tasks</span>
    </div>
    <button class="text-xs text-white/80 hover:underline">View All</button>
  </div>

  <div class="space-y-5">
    <!-- Task Item -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img src="@/assets/youtube-logo.png" alt="YouTube" class="size-8 rounded-full" />
        <div>
          <p class="text-xs">Follow @thatdude</p>
          <p class="text-xs font-bold">+200 Gumballs</p>
        </div>
      </div>
      <img src="@/components/icons/task-button.svg" alt="Play" class="size-8" />
    </div>

    <!-- Repeat with different icons as needed -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img src="@/assets/x-logo.png" alt="Twitter" class="size-8 rounded-full" />
        <div>
          <p class="text-xs">Follow @thatdude</p>
          <p class="text-xs font-bold">+200 Gumballs</p>
        </div>
      </div>
      <img src="@/components/icons/task-button.svg" alt="Play" class="size-8" />
    </div>

    <!-- Telegram Example -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img src="@/assets/telegram-logo.png" alt="Telegram" class="size-8 rounded-full" />
        <div>
          <p class="text-xs">Follow @thatdude</p>
          <p class="text-xs font-bold">+200 Gumballs</p>
        </div>
      </div>
      <img src="@/components/icons/task-button.svg" alt="Play" class="size-8" />
    </div>
  </div>
</div>

</template>
