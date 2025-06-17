<script setup>
import NavBar from '@/components/NavigationBar.vue'
import Header from '@/components/Header.vue'
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()

const hideNavbar = computed(() => ['/signup', '/login', '/create-account'].includes(route.path))
const hideHeader = computed(() => ['/signup', '/login', '/create-account'].includes(route.path))
const removeAllPadding = computed(() => ['/messages', '/login', '/signup', '/create-account'].includes(route.path))
</script>

<template>
<div :class="[
  !hideNavbar ? 'flex md:p-6 gap-6 w-full h-full max-h-screen overflow-hidden' : 'w-full h-full',
  !hideHeader ? 'flex md:p-6 gap-6 w-full h-full max-h-screen overflow-hidden' : 'w-full h-full',
  removeAllPadding ? 'p-0' : 'px-3 pt-4',
]" class="bg-[#262624]">
  <NavBar v-if="!hideNavbar" class="flex-shrink-0"/>
  
  <div class="flex flex-col gap-4 flex-1 min-w-0 overflow-hidden" :class="{'pb-16.5 sm:pb-0': !hideNavbar}">
    <Header v-if="!hideHeader" class="flex-shrink-0"/>
    <div class="flex-1 overflow-hidden">
      <RouterView/>
    </div>
  </div>
</div>
</template>