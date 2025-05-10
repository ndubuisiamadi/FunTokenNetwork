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
    <div class="h-3/4 grow flex gap-8 ">
      
      <!-- Left Column -->
      <div class="hidden md:flex flex-1 flex-col gap-4 w-[300px] h-full">
        <TasksCard class="grow"/>
        <CommunitiesCard class="grow"/>
      </div>
  
      <!-- Scrollable Middle Column -->
      <div class="flex-2 overflow-y-auto flex flex-col gap-[20px] pb-20 scrollbar-hide">
        <CreatePostBox />
        <FeedPostCard v-for="i in 3" :key="i" />
      </div>
  
      <!-- Right Column -->
      <div class="hidden lg:flex flex-1 flex-col gap-4 w-[300px] h-full">
        <LeaderboardCard class="flex-1"/>
        <MessagesCard class="flex-2"/>
      </div>

    </div>
  </template>
  
