<script setup>
import VerticalNavBar from '@/components/VerticalNavBar.vue'
import Header from '@/components/Header.vue'
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <VerticalNavBar/>
  <div class="flex flex-col gap-x-20">
    <Header/>
    <RouterView/>
  </div>
  
</template>
