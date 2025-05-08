<template>
    <div class="bg-[#212121] bg-[url(@/assets/communities-card-bg.png)] bg-cover text-white p-5 rounded-[18px] shadow-[0_4px_0px_#B72828] relative">
        <div class="flex justify-between items-center mb-5">
            <div class="flex items-center gap-2 text-lg font-medium">
            <img src="@/components/icons/usersfour.svg" alt="Check" class="size-6" />
            <span>Communities</span>
            </div>
            <button class="text-xs text-white/80 hover:underline">View All</button>
        </div>

        <div class="space-y-5">
            <!-- Community Item -->
            <div class="flex items-center gap-2">
                <img src="https://random-image-pepebigotes.vercel.app/api/random-image" alt="YouTube" class="size-8 rounded-full" />
                <div>
                <p class="text-xs truncate">How to build a loyal...</p>
                <p class="text-xs opacity-50">10+ posts today</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <img src="https://random-image-pepebigotes.vercel.app/api/random-image" alt="YouTube" class="size-8 rounded-full" />
                <div>
                <p class="text-xs truncate">How to build a community...</p>
                <p class="text-xs opacity-50">10+ posts today</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <img src="https://random-image-pepebigotes.vercel.app/api/random-image" alt="YouTube" class="size-8 rounded-full" />
                <div>
                <p class="text-xs truncate">How to build a community...</p>
                <p class="text-xs opacity-50">10+ posts today</p>
                </div>
            </div>
    </div>
  </div>
</template>