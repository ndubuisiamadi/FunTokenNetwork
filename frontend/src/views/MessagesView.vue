<!-- MessagesView.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import ConversationSidebar from '@/components/ConversationSidebar.vue'
import ChatArea from '@/components/ChatArea.vue'

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
  if (isMobile.value) {
    currentMobileView.value = 'sidebar'
  }
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

// Lifecycle
onMounted(async () => {
  // Check initial screen size
  checkMobile()
  
  // Add resize listener
  window.addEventListener('resize', checkMobile)
  
  // Debug info
  console.log('Attempting socket connection...')
  console.log('Current URL:', window.location.origin)
  console.log('Socket URL should be:', window.location.hostname + ':3000')
  
  // Initialize messages store if needed
  if (!messagesStore.isInitialized()) {
    console.log('Messages not initialized, initializing now...')
    messagesStore.initializeSocket()
    await messagesStore.fetchConversations()
  } else {
    console.log('Messages already initialized from login')
  }
  
  // Handle conversation query parameter after initialization
  await handleConversationParam()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  
  // Check if reset method exists before calling it
  if (typeof messagesStore.reset === 'function') {
    messagesStore.reset()
  } else {
    // Alternative cleanup - just clear current conversation
    if (typeof messagesStore.clearCurrentConversation === 'function') {
      messagesStore.clearCurrentConversation()
    }
    console.log('MessagesStore reset method not found, skipping cleanup')
  }
})
</script>

<!-- Rest of template stays the same -->
<template>
  <!-- Desktop Layout (md and above) -->
  <div class="hidden md:flex h-full text-white">
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
  <div class="md:hidden h-full text-white">
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
</template>