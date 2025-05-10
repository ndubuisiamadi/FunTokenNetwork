<script setup>
  import { RouterLink } from 'vue-router'
</script>
<template>
    <div class="flex h-3/4 grow text-white gap-6">
    <!-- Sidebar -->
    <div class="w-lg bg-[#212121] pt-4 px-4 flex flex-col rounded-2xl">
      <div class="flex justify-between items-center gap-2">
        <span class="text-sm border-b-2 px-2 pb-1 truncate">Your Friends</span>
        <span class="text-sm px-2 pb-1">Requests</span>
          <span class="text-sm px-2 pb-1">Suggested</span>
      </div>
      <div class="mt-4 space-y-4 overflow-auto scrollbar-hide">
        <RouterLink to="/user-profile" v-for="i in 3" :key="i" class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <img src="https://randomuser.me/api/portraits/women/6.jpg" alt="" class="size-8 rounded-full">
          <div>
            <p class="text-xs truncate">Jennifer</p>
            <p class="text-xs opacity-50">Recently Online</p>
          </div>
          
          </div>
          <img src="@/components/icons/chatcentereddots.svg" alt="">
        </RouterLink>
      </div>
    </div>

    <!-- Profile Content -->
    <div class="grow bg-[#212121] overflow-auto scrollbar-hide pb-10 rounded-2xl">
            
      <div class="relative flex w-full">
        <RouterLink to="/user-profile" class="absolute top-4 right-4 bg-black size-8 rounded-full"><img src="@/components/icons/arrowsoutsimple.svg"></RouterLink>
        <img src="https://random-image-pepebigotes.vercel.app/api/random-image" class="w-full h-64 object-cover" alt="Background">
        <div class="absolute -bottom-16 px-6 flex items-end gap-4 w-full">
          <img src="https://randomuser.me/api/portraits/men/32.jpg" class="size-32 rounded-full" alt="Profile">
          <div class="flex items-center justify-between grow">
          <div>
            <h2 class="text-xl font-bold">Kathryn Murphy</h2>
            <div class="flex items-center gap-1">
              <img class="size-5" src="@/components/icons/mappinline.svg" alt="">
              <p class="text-xs">Minnesota, United States</p>
            </div>
            
          </div>
          <div class="flex items-center space-x-2">
            <button class="bg-black p-2 rounded-full"><img src="@/components/icons/userminus.svg"></button>
            <button class="bg-black p-2 rounded-full"><img src="@/components/icons/prohibit.svg"></button>
            <button class="bg-black px-4 py-2 rounded-full border-2 border-[#055CFF] hover:bg-[#055CFF] text-sm">Message</button>
          </div>
        </div>
        </div>
      </div>

      <div class="mt-15 px-6 flex gap-10">
        
        <div class="flex flex-col flex-1">
          <div class="mt-4 flex flex-col space-y-6 text-sm text-gray-300">
          
            <div class="flex items-center gap-2">
              <img src="@/components/icons/wallet.svg" alt="">
            <div>
                        <p class="font-bold text-xl">1,600+</p>
                        <p class="text-xs">Top 200 Player</p>
                      </div>
            </div>
          
          <div class="space-y-1">
            <div class="text-sm font-semibold flex items-center gap-2"><img class="size-5" src="@/components/icons/clockuser.svg" alt="">Joined 5 months ago</div>
            <div class="text-sm font-semibold flex items-center gap-2"><img class="size-5" src="@/components/icons/calendardots.svg" alt="">November, 1999</div>
          </div>
        </div>

        <p class="mt-4 text-sm">
          This is a sample of biography. This includes detailed account of a person's life, written by another person. It typically covers the individual's life history, achievements, experiences, and significant events.
        </p>

        <div class="mt-4 pr-10 flex justify-between text-center">
          <div>
            <p class="text-3xl font-[Cherry_Bomb_One] text-shadow-[0_4px_0px_#055CFF]">62</p>
            <p class="text-sm font-[Cherry_Bomb_One]">Friends</p>
          </div>
          <div>
            <p class="text-3xl font-[Cherry_Bomb_One] text-shadow-[0_4px_0px_#055CFF]">12</p>
            <p class="text-sm font-[Cherry_Bomb_One]">Communities</p>
          </div>
          <div>
            <p class="text-3xl font-[Cherry_Bomb_One] text-shadow-[0_4px_0px_#055CFF]">5</p>
            <p class="text-sm font-[Cherry_Bomb_One]">Group Chats</p>
          </div>
        </div>
        </div>


        <div class="mt-6 flex-1">
          <h2 class="text-lg font-bold mb-4">Communities</h2>
          <div class="space-y-3">
            <div class="flex items-center space-x-3">
              <img src="https://randomuser.me/api/portraits/men/7.jpg" class="size-8 rounded-full">
              <div>
                <p class="text-xs">How to build a loyal community...</p>
                <p class="text-xs opacity-60">Owner</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <img src="https://randomuser.me/api/portraits/men/8.jpg" class="size-8 rounded-full">
              <div>
                <p class="text-sm">Where to grow your business as a...</p>
                <p class="text-xs opacity-60">Admin</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <img src="https://randomuser.me/api/portraits/men/9.jpg" class="size-8 rounded-full">
              <div>
                <p class="text-sm">How does writing influence your...</p>
                <p class="text-xs opacity-60">Member</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <img src="https://randomuser.me/api/portraits/men/10.jpg" class="size-8 rounded-full">
              <div>
                <p class="text-sm">How to choose the right colors...</p>
                <p class="text-xs opacity-60">Member</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <img src="https://randomuser.me/api/portraits/men/11.jpg" class="size-8 rounded-full">
              <div>
                <p class="text-sm">How to choose the right colors...</p>
                <p class="text-xs opacity-60">Member</p>
              </div>
            </div>
          </div>
        </div>

      </div>


    </div>
  </div>
</template>