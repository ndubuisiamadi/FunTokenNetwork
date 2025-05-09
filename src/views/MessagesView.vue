<template>
    <div class="flex h-3/4 grow text-white">
  <!-- Sidebar -->
  <aside class="w-80 bg-[#1A1A1A] flex flex-col rounded-l-2xl">
    <div class="flex items-center justify-between p-4 text-lg font-semibold">
        <div class="flex items-center gap-2">
            <span>Chats</span>
            <img class="size-4" src="@/components/icons/caretdown.svg">
        </div>
      
      <button class="text-3xl font-light">+</button>
    </div>
    <!-- Chat List -->
    <div class="flex-1 overflow-y-auto scrollbar-hide">
      <ul class="divide-y divide-white/10">
        <!-- Repeat for each user -->
        <li v-for="i in 30" :key="i" class="flex items-center gap-2 p-4 hover:bg-[#2C2F36] cursor-pointer ">
          <img src="https://randomuser.me/api/portraits/men/5.jpg" alt="Dianne" class="size-10 rounded-full object-cover" />
          <div class="flex-1 w-50 ">
            <div class=" flex justify-between items-center">
                <p class="text-sm font-medium">Dianne Russell</p>
                <span class="text-xs text-white/40">10:28 am</span>
            </div>
            <div class=" flex justify-between items-center gap-3">
                <p class="text-xs text-white/50 truncate">How many NPCs are there? Seems endless!</p>
                <div class="flex hidden text-[10px] bg-[#055CFF] size-[14px] justify-center items-center text-center rounded-full">5</div>
            </div>
            
          </div>
          
        </li>
        <!-- Add other chat items similarly -->
      </ul>
    </div>
  </aside>

  <!-- Chat Window -->
  <main class="flex-1 flex flex-col bg-[#141619] relative rounded-r-2xl">
    <!-- Header -->
    <div class="flex items-center gap-3 bg-[#2B3442] px-6 py-4 border-b border-white/10 rounded-tr-xl">
      <img src="https://randomuser.me/api/portraits/men/4.jpg" alt="Dianne" class="w-10 h-10 rounded-full" />
      <span class="text-sm font-semibold text-white">Dianne Russell</span>
      <div class="ml-auto">
        <img src="@/components/icons/dotsthree.svg" alt="Options" class="size-5" />
      </div>
    </div>

    <!-- Chat Messages Area -->
    <div class="flex-1 overflow-y-auto px-6 py-4 bg-[url('@/assets/message-chat-bg.png')] bg-opacity-50 bg-cover bg-[#212121] space-y-3 text-sm scrollbar-hide justify-end">
      <!-- Incoming Message -->
      <div class="flex items-start bg-[#2C2F36] px-3 py-2 rounded-lg w-fit gap-2">
        <div class="">
          Hello
        </div>
        <span class="text-[10px] text-white/40 self-end">9:48 AM</span>
      </div>

      <!-- Outgoing Message -->
       <div class="flex gap-2 items-end">
        <div class="flex justify-end gap-2 bg-[#2979FF] px-3 py-2 rounded-lg ml-auto w-fit text-white">
        <span>Hello</span>
        <span class="text-[10px] text-white/70 self-end">9:48 AM</span>
      </div>
      <img class="size-5" src="@/components/icons/checks.svg" alt="">
       </div>
      

      <!-- More messages -->
       <div class="flex gap-2 items-end">
      <div class="flex justify-end gap-2 bg-[#2979FF] px-3 py-2 rounded-lg ml-auto w-fit text-white">
        <div>
          Have you spoken to the delivery man?<br />
          He is more than an hour late
        </div>
        <span class="text-[10px] text-white/70 self-end">9:48 AM</span>
      </div>
      <img class="size-5" src="@/components/icons/checks.svg" alt="">
       </div>

       <div class="flex gap-2 items-end">
<div class="flex justify-end gap-2 bg-[#2979FF] px-3 py-2 rounded-lg ml-auto w-fit text-white">
        <div>Received</div>
        <span class="text-[10px] text-white/70 self-end">9:48 AM</span>
      </div>
      <img class="size-5" src="@/components/icons/checks.svg" alt="">
       </div>
      
      </div>

    <!-- Message Input -->
    <div class="text-sm p-4 border-t border-white/10 flex items-center justify-between bg-[#1A1A1A] rounded-br-xl">
        <div class="flex items-center gap-3">
            <div class="bg-white/10 p-3 rounded-full">
        <img src="@/components/icons/paperclip.svg" alt="Emoji" class="size-5" />
      </div>
      <input type="text" placeholder="Type a message" class="flex-1 bg-transparent focus:outline-none text-white placeholder-white/40" />
        </div>
        <img src="@/components/icons/smileysticker.svg" alt="Emoji" class="size-8" />
    </div>
  </main>
</div>
</template>