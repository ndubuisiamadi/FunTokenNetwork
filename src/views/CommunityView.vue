<script setup>
import CreatePostBox from '@/components/CreatePostBox.vue';
import FeedPostCard from '@/components/FeedPostCard.vue';
</script>
<template>
    <div class="flex h-3/4 grow text-white gap-6">
    <!-- Sidebar -->
    <div class=" flex flex-1 flex-col gap-[20px] ">
        <CreatePostBox/>
      <div class="flex flex-col overflow-y-auto scrollbar-hide gap-[20px] ">
        <FeedPostCard v-for="i in 3" :key="i"/>
      </div>
        
      </div>

    <!-- Profile Content -->
    <div class="flex-2 bg-[#212121] overflow-auto scrollbar-hide pb-10 rounded-2xl">
            
      <div class="relative flex w-full">
        <img src="https://random-image-pepebigotes.vercel.app/api/random-image" class="w-full h-64 object-cover" alt="Background">
        <div class="absolute -bottom-16 px-6 flex items-end gap-4 w-full">
          <img src="https://randomuser.me/api/portraits/men/32.jpg" class="size-32 rounded-full" alt="Profile">
          <div class="flex items-center justify-between grow">
          <div class="space-y-2">
            <h2 class="text-xl leading-none font-bold">How to build a loyal community</h2>
            <div class="flex items-center gap-1">
              <div class="flex gap-[-2px]">
                <img class="size-4 rounded-full border border-[#212121]" src="https://randomuser.me/api/portraits/men/32.jpg" alt="">
                <img class="size-4 rounded-full border border-[#212121]" src="https://randomuser.me/api/portraits/men/32.jpg" alt="">
                <img class="size-4 rounded-full border border-[#212121]" src="https://randomuser.me/api/portraits/men/32.jpg" alt="">
              </div>
              <p class="text-xs">5k+ members</p>
            </div>
            
          </div>
          <div class="flex items-center space-x-2">
            <button class="bg-black p-2 rounded-full"><img src="@/components/icons/bellringing.svg"></button>
            <button class="bg-black px-4 py-2 rounded-full border-2 border-[#B72828] hover:bg-[#B72828] text-sm">Leave</button>
          </div>
        </div>
        </div>
      </div>

      <div class="mt-20 px-6 flex gap-10">
        
        <div class="flex flex-col flex-1">
          <div class="space-y-1">
            <div class="text-sm font-semibold flex items-center gap-2"><img class="size-5" src="@/components/icons/clockuser.svg" alt="">Created 5 months ago</div>
            <div class="text-sm ">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. </div>
          </div>

        <div class="mt-4 text-sm space-y-1">
            <div class="text-sm font-semibold flex items-center gap-2"><img class="size-5" src="@/components/icons/scales.svg" alt="">Rules</div>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do. 
            Eiusmod tempor incididunt ut labore et dolore magna aliqua. 
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
        </div>
        </div>


        <div class="mt-6 flex-1">
          <div class="flex gap-2 items-center mb-4">
        <span class="text-sm border-b-2 px-2 pb-1 truncate">Admin</span>
        <span class="text-sm px-2 pb-1">Members</span>
      </div>
          <div class="space-y-3">
            <div class="flex items-center space-x-2">
              <img src="https://randomuser.me/api/portraits/men/7.jpg" class="size-8 rounded-full">
              <div>
                <p class="text-xs">Floyd Miles</p>
                <p class="text-xs opacity-60">200+ Gumballs</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <img src="https://randomuser.me/api/portraits/men/8.jpg" class="size-8 rounded-full">
              <div>
                <p class="text-sm">Jerome Bell</p>
                <p class="text-xs opacity-60">Hidden</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <img src="https://randomuser.me/api/portraits/men/9.jpg" class="size-8 rounded-full">
              <div>
                <p class="text-sm">Albert Flores</p>
                <p class="text-xs opacity-60">5k+ Gumballs</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <img src="https://randomuser.me/api/portraits/men/10.jpg" class="size-8 rounded-full">
              <div>
                <p class="text-sm">Leslie Alexander</p>
                <p class="text-xs opacity-60">150+ Gumballs</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <img src="https://randomuser.me/api/portraits/men/11.jpg" class="size-8 rounded-full">
              <div>
                <p class="text-sm">Cameron Williamson</p>
                <p class="text-xs opacity-60">150+ Gumballs</p>
              </div>
            </div>
          </div>
        </div>

      </div>


    </div>
  </div>
</template>