<template>
    <div class="bg-[#212121] bg-[url(@/assets/leaderboard-card-bg.png)] bg-cover text-white p-5 rounded-[18px] shadow-[0_4px_0px_#FFC200]">
            <div class="flex items-center gap-2 mb-5">
                <img src="@/components/icons/ranking.svg" alt="Check" class="size-8" />
                <div class="flex flex-col">
                    <span class="text-xs">Leaderboard</span>
                    <span>Top 5 Players</span>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                <div class="flex items-center gap-1">
                    <p class="text-sm">1.</p>
                <div class="flex items-center gap-3">
                    <img src="https://randomuser.me/api/portraits/men/1.jpg" class="size-8 rounded-full" />
                        <div>
                            <p class="text-sm">Wade Warren</p>
                            <p class="text-xs opacity-50">50k Gumballs</p>
                        </div>
                </div>
                
                </div>
                <img src="@/components/icons/arrowfatlinesup.svg" alt="Play" class="size-5" />
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1">
                        <p class="text-sm">2.</p>
                    <div class="flex items-center gap-3">
                        <img src="https://randomuser.me/api/portraits/men/2.jpg" class="size-8 rounded-full" />
                            <div>
                                <p class="text-sm">Marvin McKinney</p>
                                <p class="text-xs opacity-50">20k Gumballs</p>
                            </div>
                    </div>
                    
                    </div>
                    <img src="@/components/icons/arrowfatlinesup.svg" alt="Play" class="size-6" />
                </div>

                <div class="flex items-center justify-between">
                <div class="flex items-center gap-1">
                    <p class="text-sm">3.</p>
                <div class="flex items-center gap-3">
                    <img src="https://randomuser.me/api/portraits/men/3.jpg" alt="YouTube" class="size-8 rounded-full" />
                        <div>
                            <p class="text-sm">Ralph Edwards</p>
                            <p class="text-xs opacity-50">200 Gumballs</p>
                        </div>
                </div>
                
                </div>
                <img src="@/components/icons/arrowfatlinesup.svg" alt="Play" class="size-6" />
            </div>
            </div>

            
    </div>
</template>