<!-- MessagesView.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import ConversationSidebar from '@/components/ConversationSidebar.vue'
import ChatArea from '@/components/ChatArea.vue'

defineProps({
  class: {
    type: String,
    default: ''
  }
})

const route = useRoute()
const messagesStore = useMessagesStore()
const authStore = useAuthStore()

// Mobile navigation state
const currentMobileView = ref('sidebar') // 'sidebar' | 'chat'
const isMobile = ref(false)

// Computed
const currentConversation = computed(() => messagesStore.currentConversation)

// Methods
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768 // md breakpoint
}

// Handle conversation query parameter
const handleConversationParam = async () => {
  const conversationId = route.query.conversation
  if (conversationId && messagesStore.conversations.length > 0) {
    console.log('Auto-selecting conversation from URL:', conversationId)
    await messagesStore.selectConversation(conversationId)
    
    // Switch to chat view on mobile
    if (isMobile.value) {
      currentMobileView.value = 'chat'
    }
  }
}

// Watch for changes in conversations list to handle query param
watch(() => messagesStore.conversations, (newConversations) => {
  if (newConversations.length > 0 && route.query.conversation) {
    handleConversationParam()
  }
}, { immediate: true })

// Watch for route changes
watch(() => route.query.conversation, (newConversationId) => {
  if (newConversationId && messagesStore.conversations.length > 0) {
    handleConversationParam()
  }
})

const handleConversationSelected = (conversation) => {
  if (isMobile.value) {
    currentMobileView.value = 'chat'
  }
}

const handleNewConversation = (conversation) => {
  if (isMobile.value) {
    currentMobileView.value = 'chat'
  }
}

const handleBackToSidebar = () => {
  console.log('📱 MessagesView: Going back to sidebar')
  
  if (isMobile.value) {
    // Clear current conversation when going back to sidebar on mobile
    messagesStore.clearCurrentConversation?.()
    currentMobileView.value = 'sidebar'
  }
}

// Updated onMounted with better mobile handling
onMounted(async () => {
  // Force link socket to store
  const { socketService } = await import('@/services/socket')
  socketService.setMessagesStore(messagesStore)
  
  if (!socketService.isSocketConnected()) {
    await socketService.connect()
  }
  
  await messagesStore.fetchConversations()
})

onUnmounted(() => {
  console.log('🧹 MessagesView: Leaving messages, clearing current conversation')
  
  // Remove resize listener
  window.removeEventListener('resize', checkMobile)
  
  // Simple reset - just clear the current conversation so user sees the list next time
  if (messagesStore.clearCurrentConversation) {
    messagesStore.clearCurrentConversation()
  }
  
  // Reset mobile view to sidebar
  currentMobileView.value = 'sidebar'
  
  console.log('✅ MessagesView: Simple cleanup complete')
})
</script>

<!-- Rest of template stays the same -->
<template>
  <div class="h-full text-white">
    <!-- Desktop Layout (md and above) -->
    <div class="hidden md:flex h-full pt-3 px-3">
      <!-- Sidebar -->
      <ConversationSidebar 
        :is-mobile="false"
        @conversation-selected="handleConversationSelected"
        @new-conversation="handleNewConversation"
      />
      
      <!-- Chat Area -->
      <ChatArea 
        :is-mobile="false"
        @back="handleBackToSidebar"
      />
    </div>

    <!-- Mobile Layout (smaller than md) -->
    <div class="md:hidden h-full">
      <!-- Mobile Sidebar View -->
      <div 
        v-if="currentMobileView === 'sidebar'"
        class="h-full"
      >
        <ConversationSidebar 
          :is-mobile="true"
          @conversation-selected="handleConversationSelected"
          @new-conversation="handleNewConversation"
        />
      </div>

      <!-- Mobile Chat View -->
      <div 
        v-else-if="currentMobileView === 'chat'"
        class="h-full"
      >
        <ChatArea 
          :is-mobile="true"
          @back="handleBackToSidebar"
        />
      </div>
    </div>

    <!-- Error Toast -->
    <div 
      v-if="messagesStore.error" 
      class="fixed bottom-4 left-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm"
    >
      <div class="flex items-center justify-between">
        <p class="text-sm">{{ messagesStore.error }}</p>
        <button 
          @click="messagesStore.clearError?.()"
          class="text-white/70 hover:text-white ml-3"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>