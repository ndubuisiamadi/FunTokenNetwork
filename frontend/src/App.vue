<script setup>
import NavBar from '@/components/NavigationBar.vue'
import Header from '@/components/Header.vue'
import { computed, ref, onMounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSocketConnector } from '@/composables/useSocketConnector'

const route = useRoute()
const authStore = useAuthStore()
const { connectSocket, disconnectSocket } = useSocketConnector()

const isMobile = ref(false)

// Check if device is mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768 // md breakpoint
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // CRITICAL: Connect socket when app starts if user is logged in
  if (authStore.isLoggedIn) {
    console.log('🚀 App: User is logged in, connecting socket')
    connectSocket()
  }
})

// CRITICAL: Watch for auth changes to connect/disconnect socket
watch(() => authStore.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    console.log('🔐 App: User logged in, connecting socket')
    connectSocket()
  } else {
    console.log('🔓 App: User logged out, disconnecting socket')
    disconnectSocket()
  }
})

const hideNavbar = computed(() => ['/signup', '/login', '/create-account', '/verify-email', '/forgot-password'].includes(route.path) || route.name === 'chat')

const hideHeader = computed(() => ['/signup', '/login', '/create-account', '/verify-email', '/forgot-password', '/messages'].includes(route.path) || route.name === 'chat')

const removeAllPadding = computed(() => ['/login', '/signup', '/create-account', '/verify-email', '/forgot-password'].includes(route.path) || route.name === 'chat')

// New computed to check if both navbar and header are hidden
const isFullscreenLayout = computed(() => hideNavbar.value && hideHeader.value)
</script>

<template>
<div class="flex bg-[#262624] w-full h-full">
  <NavBar v-if="!hideNavbar && !isMobile" class=""/>
  
  <!-- Conditional layout based on fullscreen mode -->
  <template v-if="isFullscreenLayout">
    <!-- Fullscreen layout for chat/auth pages -->
    <div class="w-full h-full">
      <RouterView/>
    </div>
  </template>
  
  <template v-else>
    <!-- Normal layout with header/navbar -->
    <div class="flex flex-col flex-1 overflow-hidden" >
      <Header v-if="!hideHeader" class="px-3 pt-3"/>
      <RouterView class="p-3 overflow-hidden"/>
      <NavBar v-if="isMobile" class=""/>
    </div>
  </template>
</div>
</template>