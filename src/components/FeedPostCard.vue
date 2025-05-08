<template>
    <div class="bg-[#212121] text-white max-w-md mx-auto rounded-2xl overflow-hidden">

<!-- Post -->
  <div class="flex items-center justify-between p-4">
    <div class="flex items-center gap-3">
      <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" class="w-10 h-10 rounded-full object-cover" />
      <div>
        <p class="text-sm font-medium">Brooklyn Simmons</p>
        <p class="text-xs text-white/50">12 March 2025</p>
      </div>
    </div>
    <img src="@/components/icons/dotsthree.svg" alt="More" class="w-4 h-4" />
  </div>

  <!-- Post Image -->
  <div class="relative">
    <img src="https://random-image-pepebigotes.vercel.app/api/random-image" alt="Post content" class="w-full" />
    <!-- Navigation arrows -->
    <button class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-1 rounded-full">
      <img src="@/components/icons/arrowleft.svg" alt="Prev" class="w-3 h-3" />
    </button>
    <button class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-1 rounded-full">
      <img src="@/components/icons/arrowright.svg" alt="Next" class="w-3 h-3" />
    </button>
  </div>

  <!-- Reactions -->
  <div class="flex flex-col gap-2 justify-between text-sm text-white/70 p-4">
    <div class="flex items-center gap-4">
      <button><img src="@/components/icons/heart.svg" alt="Like" class="w-5 h-5" /></button>
      <button><img src="@/components/icons/chatteardrop.svg" alt="Comment" class="w-5 h-5" /></button>
      <button><img src="@/components/icons/sharefat.svg" alt="Share" class="w-5 h-5" /></button>
    </div>
    <p>5 Likes • 10 Comments</p>
  </div>
</div>
</template>