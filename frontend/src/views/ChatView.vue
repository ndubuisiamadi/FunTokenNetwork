<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessagesStore } from '@/stores/messages'
import { useUsersStore } from '@/stores/users'
import ChatArea from '@/components/ChatArea.vue'

const route = useRoute()
const router = useRouter()
const messagesStore = useMessagesStore()
const usersStore = useUsersStore()

const chatId = computed(() => route.params.id)
const isNewChat = computed(() => route.query.new === 'true')
const recipientId = computed(() => route.query.userId)
const isGroup = computed(() => route.query.group === 'true')

const draftRecipients = ref([])
const draftGroupName = ref('')

const handleBackToMessages = () => {
  router.push('/messages')
}

onMounted(async () => {
  // Initialize messages store if needed
  if (!messagesStore.isInitialized()) {
    messagesStore.initializeSocket()
    await messagesStore.fetchConversations()
  }
  
  if (isNewChat.value) {
    // Handle new chat - load recipient info
    if (recipientId.value) {
      try {
        const user = await usersStore.getUserById(recipientId.value)
        draftRecipients.value = [user]
      } catch (error) {
        console.error('Error loading recipient:', error)
        router.push('/messages')
      }
    }
  } else if (chatId.value) {
    // Handle existing conversation
    await messagesStore.selectConversation(chatId.value)
  }
})

onUnmounted(() => {
  // Clear current conversation when leaving chat view
  if (typeof messagesStore.clearCurrentConversation === 'function') {
    messagesStore.clearCurrentConversation()
  }
})
</script>

<template>
  <div class="h-full text-white">
    <ChatArea 
      :is-mobile="true"
      :is-draft="isNewChat"
      :draft-recipients="draftRecipients"
      :draft-group-name="draftGroupName"
      @back="handleBackToMessages"
      @conversation-created="(conversationId) => router.replace(`/chat/${conversationId}`)"
    />
  </div>
</template>