<script setup>
import TasksCard from '@/components/TasksCard.vue';
import CreatePostBox from '@/components/CreatePostBox.vue';
import FeedPostCard from '@/components/FeedPostCard.vue';
import LeaderboardCard from '@/components/LeaderboardCard.vue';
import CommunitiesCard from '@/components/CommunitiesCard.vue';
import MessagesCard from '@/components/MessagesCard.vue';
</script>

<template>
    <!-- Outer wrapper ensures full screen height -->
    <div class="h-full flex gap-8 ">
      
      <!-- Left Column -->
      <div class="hidden md:flex flex-1 flex-col gap-4 w-[300px]">
        <TasksCard />
        <CommunitiesCard />
      </div>
  
      <!-- Scrollable Middle Column -->
      <div class="flex-2 overflow-y-auto flex flex-col gap-[20px] pb-20 scrollbar-hide">
        <CreatePostBox />
        <FeedPostCard v-for="i in 3" :key="i" />
      </div>
  
      <!-- Right Column -->
      <div class="hidden lg:flex flex-1 flex-col gap-4 w-[300px]">
        <LeaderboardCard />
        <MessagesCard />
      </div>

    </div>
  </template>
  
