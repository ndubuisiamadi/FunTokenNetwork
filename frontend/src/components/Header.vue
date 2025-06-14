<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ref, onMounted } from 'vue'

import userPlaceholderImage from '@/assets/user-placeholder-image.jpg'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isOpen = ref(false)

const currentPage = (routePath) => {
  return route.path === routePath
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function closeOnClickOutside(event) {
  if (!event.target.closest('.relative')) {
    isOpen.value = false
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  document.addEventListener('click', closeOnClickOutside)
})
</script>

<template>
  <div v-if="!currentPage('/messages')" class="flex items-center justify-between w-full">
    <!-- Left: Page Title -->
    
    <h1 v-if="currentPage('/tasks')" class="text-white">Tasks</h1>
    <h1 v-if="currentPage('/messages')" class="text-white">Messages</h1>
    <h1 v-if="currentPage('/communities')" class="text-white">Communities</h1>
    <h1 v-if="currentPage('/friends')" class="text-white">Friends</h1>
    <h1 v-if="currentPage('/profile')" class="text-white">My Profile</h1>
    <h1 v-if="currentPage('/profile/edit')" class="text-white">Edit Profile</h1>
    <h1 v-if="currentPage('/leaderboard')" class="text-white">Leaderboard</h1>

    <RouterLink to="/" v-if="currentPage('/')" class="block md:hidden">
            <img class="size-12" src="@/assets/logo.svg" alt="FunToken Logo">
        </RouterLink>

    <!-- Right: Controls -->
    <div class="flex grow justify-end items-center gap-3 md:gap-4">
      <!-- Search Bar -->
      <div class="hidden lg:flex items-center bg-[#212121] text-white rounded-full px-4 py-2 w-72 shadow-[0_4px_0px_black]">
        <input
          type="text"
          placeholder="Search"
          class="bg-transparent outline-none flex-grow text-sm placeholder-white"
        />
        <img src="@/components/icons/magnifyingglass.svg">
      </div>

      <!-- Search Icon -->
      <button class="size-10 md:size-11 p-3 rounded-full bg-[#212121] flex lg:hidden items-center justify-center text-white shadow-[0_4px_0px_black]">
        <img src="@/components/icons/magnifyingglass.svg">
      </button>

      <!-- Notification Icon -->
      <button class="size-10 md:size-11 p-3 rounded-full bg-[#212121] flex items-center justify-center text-white shadow-[0_4px_0px_black]">
        <img src="@/components/icons/bell.svg">
      </button>

      <!-- Profile Dropdown -->
      <div class="relative inline-block text-left">
        <div
          @click="toggleDropdown"
          class="cursor-pointer flex items-center gap-2 bg-[#1E1E1E] text-white rounded-full md:px-2 md:py-1 md:pr-3 shadow-[0_4px_0px_black]"
        >
          <img
    :src="authStore.currentUser?.avatarUrl || userPlaceholderImage"
    alt="User"
    class="size-10 rounded-full object-cover"
  />
          <div class="hidden md:block text-left leading-tight">
            <p class="text-sm font-semibold">{{ authStore.userFullName || authStore.currentUser?.username }}</p>
            <p class="text-xs text-gray-400">{{ authStore.currentUser?.gumballs || 0 }} Gumballs</p>
          </div>
          <img class="hidden md:block" src="@/components/icons/caretdown.svg">
        </div>
        
        <!-- Dropdown Menu -->
        <div
          v-if="isOpen"
          class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-[#212121] ring-1 ring-black ring-opacity-5 z-500"
        >
          <div class="py-1">
            <RouterLink to="/profile" class="block px-4 py-2 text-sm text-white hover:bg-[#101010]">Profile</RouterLink>
            <a href="#" class="block px-4 py-2 text-sm text-white hover:bg-[#101010]">Support</a>
            <button @click="handleLogout" class="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#101010]">Sign out</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>