<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSearchStore } from '@/stores/search'
import { ref, onMounted, watch, nextTick } from 'vue' // ✅ Added nextTick import

import userPlaceholderImage from '@/assets/user-placeholder-image.jpg'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const searchStore = useSearchStore()

const isOpen = ref(false)
const searchQuery = ref('')
const isMobileSearchOpen = ref(false)

defineProps({
  class: {
    type: String,
    default: ''
  }
})

// Watch for route changes to update search query
watch(() => route.query.q, (newQuery) => {
  searchQuery.value = newQuery || ''
})

// Initialize search query from URL
onMounted(() => {
  if (route.query.q) {
    searchQuery.value = route.query.q
  }
  document.addEventListener('click', closeOnClickOutside)
})

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

// ✅ Fixed search functionality
const handleSearch = (event) => {
  if (event.key === 'Enter' || event.type === 'click') {
    performSearch()
  }
}

const performSearch = async () => {
  const query = searchQuery.value.trim()
  if (!query) return

  try {
    // Navigate to search page with query
    await router.push({ path: '/search', query: { q: query } })
    
    // ✅ Actually trigger the search in the store
    await searchStore.search(query)
    
    // Close mobile search if open
    isMobileSearchOpen.value = false
  } catch (error) {
    console.error('Search error:', error)
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  if (route.path === '/search') {
    router.push({ path: '/search' })
  }
}

// ✅ Fixed mobile search with proper nextTick usage
const toggleMobileSearch = () => {
  isMobileSearchOpen.value = !isMobileSearchOpen.value
  if (isMobileSearchOpen.value) {
    // Use nextTick to ensure DOM is updated
    nextTick(() => {
      const input = document.querySelector('#mobile-search-input')
      if (input) {
        input.focus()
        input.select() // Also select existing text for better UX
      }
    })
  }
}
</script>

<template>
  <div :class="$props.class">
    <div v-if="!currentPage('/messages')" class="flex items-center justify-between w-full text-xs md:text-base">
    <!-- Left: Page Title -->
    
    <h1 v-if="currentPage('/tasks')" class="text-[#00B043]">Tasks</h1>
    <h1 v-if="currentPage('/messages')" class="text-[#055DFF]">Messages</h1>
    <h1 v-if="currentPage('/communities')" class="text-[#FFA02B]">Communities</h1>
    <h1 v-if="currentPage('/friends')" class="text-[#FA7D7D]">Friends</h1>
    <h1 v-if="currentPage('/profile')" class="text-[#055DFF]">My Profile</h1>
    <h1 v-if="currentPage('/profile/edit')" class="text-white">Edit Profile</h1>
    <h1 v-if="currentPage('/leaderboard')" class="text-[#FCCA00]">Leaderboard</h1>
    <h1 v-if="currentPage('/search')" class="text-white hidden md:block">Search</h1>

    <RouterLink to="/" v-if="currentPage('/') || currentPage('/search')" class="block md:hidden">
      <img class="size-10" src="@/assets/logo.png" alt="FunToken Logo">
    </RouterLink>

    <!-- Right: Controls -->
    <div class="flex grow justify-end items-center gap-3 md:gap-4">
      <!-- Desktop Search Bar -->
      <div class="hidden lg:flex items-center
      bg-linear-to-tr from-[#055DFF] to-[#00BFFF] backdrop-blur-xl
       text-white rounded-full px-4 py-2 w-72">
        <input
          v-model="searchQuery"
          @keyup.enter="handleSearch"
          type="text"
          placeholder="Search"
          class="bg-transparent outline-none flex-grow text-sm placeholder-white"
        />
        <button @click="performSearch" class="ml-2">
          <img src="@/components/icons/magnifying-glass.svg" alt="Search">
        </button>
      </div>

      <!-- Mobile Search Icon -->
      <button 
        @click="toggleMobileSearch"
        class="size-10 md:size-11 p-3 rounded-full 
        bg-linear-to-tr from-[#055DFF] to-[#00BFFF] backdrop-blur-xl
        flex lg:hidden items-center justify-center text-white">
        <img src="@/components/icons/magnifying-glass.svg" alt="Search">
      </button>

      <!-- Notification Icon -->
      <button class="size-10 md:size-11 p-3 rounded-full 
      bg-linear-to-tr from-[#FFA02B] to-[#FF1E00] backdrop-blur-xl
      flex items-center justify-center text-white">
        <img src="@/components/icons/bell.svg" alt="Notifications">
      </button>

      <!-- Profile Dropdown -->
      <div class="relative inline-block text-left">
        <div
          @click="toggleDropdown"
          class="cursor-pointer flex items-center gap-2 
          bg-linear-to-tr from-[#9E03FF] to-[#082CFC] backdrop-blur-xl
           text-white rounded-full md:px-2 md:py-1 md:pr-3"
        >
          <img
    :src="authStore.currentUser?.avatarUrl || userPlaceholderImage"
    alt="User"
    class="size-10 rounded-full object-cover"
  />
          <div class="hidden md:block text-left leading-tight">
            <p class="text-sm font-semibold">{{ authStore.userFullName || authStore.currentUser?.username }}</p>
            <p class="text-xs">{{ authStore.currentUser?.gumballs || 0 }} Gumballs</p>
          </div>
          <img class="hidden md:block" src="@/components/icons/caret-down.svg">
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

 <!-- Mobile Search Overlay -->
 <div v-if="isMobileSearchOpen" class="fixed inset-0 bg-black/50 z-50 lg:hidden" @click="toggleMobileSearch">
   <div class="absolute top-0 left-0 right-0 bg-[#1a1a1a] p-4" @click.stop>
     <div class="flex items-center gap-3">
       <div class="flex-1 flex items-center bg-white/10 rounded-full px-4 py-2">
         <input
           id="mobile-search-input"
           v-model="searchQuery"
           @keyup.enter="handleSearch"
           type="text"
           placeholder="Search"
           class="bg-transparent outline-none flex-grow text-sm placeholder-white text-white"
         />
         <button @click="performSearch" class="ml-2">
           <img src="@/components/icons/magnifying-glass.svg" alt="Search">
         </button>
       </div>
       <button @click="toggleMobileSearch" class="text-white">
         <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
         </svg>
       </button>
     </div>
   </div>
 </div>
  </div>
  
</template>