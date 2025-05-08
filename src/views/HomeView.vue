<script setup>
import TasksCard from '@/components/TasksCard.vue';
import CreatePostBox from '@/components/CreatePostBox.vue';
import FeedPostCard from '@/components/FeedPostCard.vue';
</script>

<template>
    <div class="flex gap-8 h-[100%]">
        <TasksCard/>
        <div class="flex flex-col gap-[20px] w-[400px]">
            <CreatePostBox/>
            <FeedPostCard/>
        </div>
    </div>
</template>
