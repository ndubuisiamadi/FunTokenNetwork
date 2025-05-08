<script setup>
import NavBar from '@/components/NavigationBar.vue'
import Header from '@/components/Header.vue'
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <NavBar/>
  <div class="flex flex-col gap-4 w-full h-full">
    <Header/>
    <RouterView/>
  </div>
  
</template>
