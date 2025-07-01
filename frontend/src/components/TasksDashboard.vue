<template>
  <div class="space-y-6">
    <!-- Coming Soon Message -->
    <div class="bg-linear-to-tr from-[#29FF03]/20 to-[#082CFC]/20 rounded-xl p-8 border border-blue-500/30 text-center">
      <div class="text-6xl mb-4">📋</div>
      <h2 class="text-2xl font-bold mb-4">Tasks Dashboard Coming Soon!</h2>
      <p class="text-white/80 mb-6">
        We're working hard to bring you an amazing task system where you can complete challenges and earn gumballs.
      </p>
      
      <!-- Feature Preview -->
      <div class="grid md:grid-cols-3 gap-4 mt-8">
        <div class="bg-white/5 rounded-lg p-4">
          <div class="text-2xl mb-2">🎯</div>
          <h3 class="font-bold mb-2">Daily Challenges</h3>
          <p class="text-sm text-white/60">Complete daily tasks to earn consistent rewards</p>
        </div>
        
        <div class="bg-white/5 rounded-lg p-4">
          <div class="text-2xl mb-2">🏆</div>
          <h3 class="font-bold mb-2">Achievement System</h3>
          <p class="text-sm text-white/60">Unlock badges and milestone rewards</p>
        </div>
        
        <div class="bg-white/5 rounded-lg p-4">
          <div class="text-2xl mb-2">⚡</div>
          <h3 class="font-bold mb-2">Skill Building</h3>
          <p class="text-sm text-white/60">Learn new skills while earning gumballs</p>
        </div>
      </div>
    </div>

    <!-- Quick Stats Placeholder -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-[#1a1a1a] rounded-lg p-4 border border-white/10">
        <div class="text-center">
          <p class="text-2xl font-bold text-blue-400">0</p>
          <p class="text-sm text-white/60">Tasks Available</p>
        </div>
      </div>
      
      <div class="bg-[#1a1a1a] rounded-lg p-4 border border-white/10">
        <div class="text-center">
          <p class="text-2xl font-bold text-green-400">0</p>
          <p class="text-sm text-white/60">Completed</p>
        </div>
      </div>
      
      <div class="bg-[#1a1a1a] rounded-lg p-4 border border-white/10">
        <div class="text-center">
          <p class="text-2xl font-bold text-yellow-400">0🎾</p>
          <p class="text-sm text-white/60">Earned</p>
        </div>
      </div>
      
      <div class="bg-[#1a1a1a] rounded-lg p-4 border border-white/10">
        <div class="text-center">
          <p class="text-2xl font-bold text-purple-400">0</p>
          <p class="text-sm text-white/60">Streak</p>
        </div>
      </div>
    </div>

    <!-- Notification -->
    <div class="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <div class="text-yellow-400 text-xl">🔔</div>
        <div>
          <h4 class="font-bold text-yellow-400 mb-1">Stay Tuned!</h4>
          <p class="text-sm text-white/80">
            We'll notify you as soon as the task system is available. In the meantime, focus on building your referral network to maximize your earnings!
          </p>
        </div>
      </div>
    </div>

    <!-- Extra content for scroll testing -->
    <div class="bg-[#1a1a1a] rounded-lg p-6 border border-white/10">
      <h3 class="text-lg font-bold mb-4">More Content Coming...</h3>
      <div class="space-y-4">
        <div class="h-20 bg-white/5 rounded animate-pulse"></div>
        <div class="h-20 bg-white/5 rounded animate-pulse"></div>
        <div class="h-20 bg-white/5 rounded animate-pulse"></div>
        <div class="h-20 bg-white/5 rounded animate-pulse"></div>
        <div class="h-20 bg-white/5 rounded animate-pulse"></div>
        <div class="h-20 bg-white/5 rounded animate-pulse"></div>
        <div class="h-20 bg-white/5 rounded animate-pulse"></div>
        <div class="h-20 bg-white/5 rounded animate-pulse"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineEmits } from 'vue'

const emit = defineEmits(['earnings-updated'])

// This is a placeholder component for the tasks dashboard
// When the actual task system is implemented, this will be replaced
// with the full task management interface
</script>