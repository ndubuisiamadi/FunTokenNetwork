<script setup>
  import { RouterLink } from 'vue-router'
</script>
<template>
    <div class="flex h-3/4 grow text-white gap-6">
    <!-- Sidebar -->
    <div class="w-min bg-[#212121] pt-4 px-4 flex flex-col rounded-2xl">
      <div class="flex justify-between gap-5 items-center">
        <span class="text-sm border-b px-2 pb-2 truncate">Owner</span>
        <span class="text-sm px-2 pb-2">Admin</span>
          <span class="text-sm px-2 pb-2">Member</span>
      </div>
      <div class="mt-4 space-y-4 overflow-auto scrollbar-hide">
        <div v-for="i in 3" :key="i" class="flex items-center space-x-2">
          <img src="https://random-image-pepebigotes.vercel.app/api/random-image" alt="" class="size-8 rounded-full">
          <div>
            <p class="text-xs truncate">How to build a loyal community...</p>
            <p class="text-xs opacity-50">10+ posts today</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Profile Content -->
    <div class="grow bg-[#212121] overflow-auto scrollbar-hide p-5 rounded-2xl">
            
        <div class="flex items-center gap-2">
            <img src="@/components/icons/binoculars.svg" alt="">
            <h2 class="text-xl font-bold">Explore</h2>
        </div>
      
      <div class="mt-4 overflow-auto scrollbar-hide divide-y divide-white/10">
        <div v-for="i in 30" :key="i" class="flex items-center justify-between py-4">
          <div class="flex items-center space-x-2">
            <img src="https://random-image-pepebigotes.vercel.app/api/random-image" alt="" class="size-10 rounded-full">
          <div>
            <p class="text-sm truncate">Journey Junkies: Embarking on Epic Adventures and Creating Lifelong Memories</p>
            <p class="text-xs opacity-50">10+ post this week</p>
          </div>
          
          </div>
          <RouterLink to="/community" class="bg-black px-4 py-2 rounded-full border-2 border-[#055CFF] hover:bg-[#055CFF] text-sm">Follow</RouterLink>
        </div>
      </div>

    </div>
  </div>
</template>