<template>
    <div class="flex gap-6 text-white h-3/4 grow">
        <div class="flex flex-col flex-2 gap-3 h-full">
            <div class="flex gap-2">
                <img class="size-10 rounded-full border" src="@/assets/x-logo.png">
                <img class="size-10 rounded-full" src="@/assets/youtube-logo.png">
                <img class="size-10 rounded-full" src="@/assets/telegram-logo.png">
            </div>
            <div class="flex flex-col w-full p-4 bg-[#212121] rounded-2xl overflow-auto scrollbar-hide">
                <div  v-for="i in 30" :key="i" class="flex justify-between items-center p-2 border-b border-[#171717]">
                    <div class="flex flex-row justify-center items-center gap-3">
                        <p class="text-2xl font-bold text-[#FFCF00]">+15000</p>
                        <div class="flex flex-col">
                            <p class="text-lg">@thatdude</p>
                            <p>Like and comment a post</p>
                        </div>
                    </div>
                    <img src="@/components/icons/task-button.svg" alt="Play" class="size-8" />
                </div>
            </div>
        </div>
        <div class="flex flex-col flex-1 bg-[#212121] rounded-2xl p-4 gap-2 h-fit">
            <p class="text-xl font-semibold">How it works</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        </div>
    </div>
</template>