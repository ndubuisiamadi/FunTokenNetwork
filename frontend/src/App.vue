<script setup>
import NavBar from '@/components/NavigationBar.vue'
import Header from '@/components/Header.vue'
import { computed, ref, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const isMobile = ref(false)

// Check if device is mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768 // md breakpoint
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

const hideNavbar = computed(() => ['/signup', '/login', '/create-account', '/verify-email', '/forgot-password'].includes(route.path) || route.name === 'chat')

const hideHeader = computed(() => ['/signup', '/login', '/create-account', '/verify-email', '/forgot-password'].includes(route.path) || route.name === 'chat')

const removeAllPadding = computed(() => ['/messages', '/login', '/signup', '/create-account', '/verify-email', '/forgot-password'].includes(route.path) || route.name === 'chat')

// New computed to check if both navbar and header are hidden
const isFullscreenLayout = computed(() => hideNavbar.value && hideHeader.value)
</script>

<template>
<div :class="[
  'bg-[#262624]',
  isFullscreenLayout ? 'w-full h-full' : 'flex md:p-6 gap-6 w-full h-full max-h-screen overflow-hidden',
  removeAllPadding ? 'p-0' : 'px-3 pt-4',
]">
  <NavBar v-if="!hideNavbar" class="flex-shrink-0"/>
  
  <!-- Conditional layout based on fullscreen mode -->
  <template v-if="isFullscreenLayout">
    <!-- Fullscreen layout for chat/auth pages -->
    <div class="w-full h-full">
      <RouterView/>
    </div>
  </template>
  
  <template v-else>
    <!-- Normal layout with header/navbar -->
    <div class="flex flex-col gap-4 flex-1 min-w-0 overflow-hidden" :class="{'pb-16.5 sm:pb-0': !hideNavbar}">
      <Header v-if="!hideHeader" class="flex-shrink-0"/>
      <div class="flex-1 overflow-hidden">
        <RouterView/>
      </div>
    </div>
  </template>
</div>
</template>