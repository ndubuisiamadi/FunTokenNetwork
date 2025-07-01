<template>
  <!-- Modal Overlay -->
  <div 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click="handleOverlayClick"
  >
    <!-- Modal Content -->
    <div 
      class="bg-[#1a1a1a] border border-white/20 rounded-xl w-full max-w-md max-h-[90vh] flex flex-col"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 flex-shrink-0">
        <h3 class="text-lg font-bold">Share Your Referral Link</h3>
        <button 
          @click="$emit('close')"
          class="text-white/60 hover:text-white transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto px-6 scrollbar-hide">
        <!-- Referral Link Preview -->
        <div class="bg-white/5 rounded-lg p-4 mb-6">
          <p class="text-xs text-white/60 mb-2">Your referral link:</p>
          <p class="text-xs font-mono text-green-400 break-all">{{ referralUrl }}</p>
        </div>

        <!-- Share Options -->
        <div class="space-y-3 pb-3">
          <!-- WhatsApp -->
          <button
            @click="shareViaWhatsApp"
            class="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <img src="@/assets/whatsapp-logo.png" class="w-8 h-8 rounded-full">
            <div class="text-left">
              <p class="font-medium text-sm">WhatsApp</p>
              <p class="text-xs text-white/60">Share on WhatsApp</p>
            </div>
          </button>

          <!-- Facebook -->
          <button
            @click="shareViaFacebook"
            class="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <img src="@/assets/facebook-logo.png" class="w-8 h-8 rounded-full">
            <div class="text-left">
              <p class="font-medium text-sm">Facebook</p>
              <p class="text-xs text-white/60">Share on Facebook</p>
            </div>
          </button>

          <!-- Twitter/X -->
          <button
            @click="shareViaTwitter"
            class="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <img src="@/assets/x-logo.png" class="w-8 h-8 rounded-full">
            <div class="text-left">
              <p class="font-medium text-sm">Twitter / X</p>
              <p class="text-xs text-white/60">Share on Twitter</p>
            </div>
          </button>

          <!-- Telegram -->
          <button
            @click="shareViaTelegram"
            class="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <img src="@/assets/telegram-logo.png" class="w-8 h-8 rounded-full">
            <div class="text-left">
              <p class="font-medium text-sm">Telegram</p>
              <p class="text-xs text-white/60">Share on Telegram</p>
            </div>
          </button>

          <!-- Native Share (if supported) -->
          <button
            v-if="canUseNativeShare"
            @click="shareNative"
            class="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <div class="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              ➕
            </div>
            <div class="text-left">
              <p class="font-medium">More Apps...</p>
              <!-- <p class="text-sm text-white/60">Use system share sheet</p> -->
            </div>
          </button>
        </div>
      </div>

      <!-- Footer with Share Message Preview -->
      <div class="p-6 flex-shrink-0 border-t border-white/10">
        <div class="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <p class="text-xs text-white/80 mb-2">Share message:</p>
          <p class="text-xs text-white/60 italic">
            "{{ shareMessage }}"
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, onMounted } from 'vue'

const props = defineProps({
  referralCode: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

// Reactive data
const canUseNativeShare = ref(false)

// Computed properties
const referralUrl = computed(() => {
  return `${window.location.origin}/signup?ref=${props.referralCode}`
})

const shareMessage = computed(() => {
  return `Join me on this amazing platform! Use my referral code ${props.referralCode} when you sign up and we both get bonus gumballs! 🎾 ${referralUrl.value}`
})

const shareMessageShort = computed(() => {
  return `Join me on this platform! Use code ${props.referralCode} for bonus rewards 🎾 ${referralUrl.value}`
})

// Methods
onMounted(() => {
  // Check if native sharing is supported
  canUseNativeShare.value = navigator.share !== undefined
})

function handleOverlayClick() {
  emit('close')
}

function shareViaWhatsApp() {
  const text = encodeURIComponent(shareMessage.value)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

function shareViaFacebook() {
  const url = encodeURIComponent(referralUrl.value)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
}

function shareViaTwitter() {
  const text = encodeURIComponent(shareMessageShort.value)
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
}

function shareViaTelegram() {
  const text = encodeURIComponent(shareMessage.value)
  window.open(`https://t.me/share/url?url=${referralUrl.value}&text=${text}`, '_blank')
}

async function shareNative() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Join me on this platform!',
        text: shareMessage.value,
        url: referralUrl.value
      })
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error)
      }
    }
  }
}
</script>