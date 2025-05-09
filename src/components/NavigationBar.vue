<script setup>
    import { RouterLink } from 'vue-router'
</script>
<template>
    <nav class="hidden sm:flex flex-auto flex-col gap-[64px] items-center rounded-full bg-[#242424] p-4 h-full">
        <img class="size-[48px]" src="@/assets/logo.svg" alt="FunToken Logo">

        <div class="flex flex-col gap-[16px]" >
            <RouterLink to="/"><img class="size-[36px] p-2 bg-black rounded-full" src="@/components/icons/house.svg"></RouterLink>
            <RouterLink to="/tasks"><img class="size-[36px] p-2" src="@/components/icons/checkfat.svg"></RouterLink>
            <RouterLink to="/messages"><img class="size-[36px] p-2" src="@/components/icons/chatsteardrop.svg"></RouterLink>
            <a href="#"><img class="size-[36px] p-2" src="@/components/icons/usersfour.svg"></a>
            <a href="#"><img class="size-[36px] p-2" src="@/components/icons/users.svg"></a>
        </div>
    </nav>
    <nav class="absolute sm:hidden z-2 bottom-4 items-center rounded-full bg-[#242424] p-4 w-full">
        <div class="flex justify-between gap-[16px]" >
            <RouterLink to="/"><img class="size-[36px] p-2 bg-black rounded-full" src="@/components/icons/house.svg"></RouterLink>
            <RouterLink to="/tasks"><img class="size-[36px] p-2" src="@/components/icons/checkfat.svg"></RouterLink>
            <RouterLink to="/messages"><img class="size-[36px] p-2" src="@/components/icons/chatsteardrop.svg"></RouterLink>
            <a href="#"><img class="size-[36px] p-2" src="@/components/icons/usersfour.svg"></a>
            <a href="#"><img class="size-[36px] p-2" src="@/components/icons/users.svg"></a>
        </div>
    </nav>
</template>