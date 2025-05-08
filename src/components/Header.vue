<template>
    <div class="flex items-center justify-between w-[1000px]">
  <!-- Left: Page Title -->
  <h1 class="text-white">Home</h1>

  <!-- Right: Controls -->
  <div class="flex items-center gap-4">
    <!-- Search Bar -->
    <div class="flex items-center bg-[#212121] text-white rounded-full px-4 py-2 w-72 shadow-[0_4px_0px_black]">
      <input
        type="text"
        placeholder="Search"
        class="bg-transparent outline-none flex-grow text-sm placeholder-white"
      />
      <img src="@/components/icons/magnifyingglass.svg">
    </div>

    <!-- Notification Icon -->
    <button class="w-11 h-11 rounded-full bg-[#212121] flex items-center justify-center text-white shadow-[0_4px_0px_black]">
        <img src="@/components/icons/bell.svg">
    </button>

    <!-- Profile Dropdown -->
    <div class="flex items-center gap-2 bg-[#1E1E1E] text-white rounded-full px-2 py-1 pr-3 shadow-[0_4px_0px_black]">
      <img
        src="https://randomuser.me/api/portraits/men/32.jpg"
        alt="User"
        class="w-10 h-10 rounded-full object-cover"
      />
      <div class="text-left leading-tight">
        <p class="text-sm font-semibold">Wade Warren</p>
        <p class="text-xs text-gray-400">50 Gumballs</p>
      </div>
      <img src="@/components/icons/caretdown.svg">
    </div>
  </div>
</div>
</template>