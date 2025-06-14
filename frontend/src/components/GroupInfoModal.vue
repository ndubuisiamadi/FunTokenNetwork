<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  conversation: {
    type: Object,
    required: true
  },
  show: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'leave-group', 'edit-group', 'add-members', 'manage-members'])

const router = useRouter()

// Computed
const participantCount = computed(() => props.conversation?.participants?.length || 0)
const groupName = computed(() => props.conversation?.name || 'Group Chat')
const groupAvatar = computed(() => 
  props.conversation?.avatarUrl || 
  'https://ui-avatars.com/api/?name=' + encodeURIComponent(groupName.value) + '&background=055CFF&color=fff&size=160'
)

// Methods
const viewMemberProfile = (member) => {
  if (member.userId) {
    router.push(`/user-profile/${member.userId}`)
    emit('close')
  }
}

const handleEditGroup = () => {
  emit('edit-group')
}

const handleAddMembers = () => {
  emit('add-members')
}

const handleManageMembers = () => {
  emit('manage-members')
}

const handleLeaveGroup = () => {
  if (confirm('Are you sure you want to leave this group?')) {
    emit('leave-group')
  }
}

const close = () => {
  emit('close')
}
</script>

<template>
  <div 
    v-if="show"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click="close"
  >
    <div 
      @click.stop
      class="bg-[#1A1A1A] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-white/10">
        <h3 class="text-xl font-semibold text-white">Group Info</h3>
        <button 
          @click="close"
          class="text-white/50 hover:text-white text-2xl transition-colors"
        >
          ×
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Group Details -->
        <div class="p-6 border-b border-white/10">
          <div class="text-center">
            <img 
              :src="groupAvatar"
              :alt="groupName"
              class="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
            />
            <h2 class="text-xl font-semibold text-white mb-2">{{ groupName }}</h2>
            <p class="text-white/60 text-sm">{{ participantCount }} members</p>
          </div>
        </div>

        <!-- Group Actions (Admin Only) -->
        <div v-if="isAdmin" class="p-6 border-b border-white/10">
          <h4 class="text-sm font-medium text-white/90 mb-4">Group Management</h4>
          <div class="space-y-2">
            <button 
              @click="handleEditGroup"
              class="w-full flex items-center gap-3 p-3 text-left text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Edit Group Info
            </button>
            
            <button 
              @click="handleAddMembers"
              class="w-full flex items-center gap-3 p-3 text-left text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Add Members
            </button>
            
            <button 
              @click="handleManageMembers"
              class="w-full flex items-center gap-3 p-3 text-left text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
              </svg>
              Manage Members
            </button>
          </div>
        </div>

        <!-- Members List -->
        <div class="p-6">
          <h4 class="text-sm font-medium text-white/90 mb-4">Members</h4>
          <div class="space-y-3">
            <div 
              v-for="participant in conversation.participants" 
              :key="participant.userId"
              class="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              @click="viewMemberProfile(participant)"
            >
              <img 
                :src="participant.user?.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'" 
                :alt="participant.user?.firstName || participant.user?.username"
                class="w-10 h-10 rounded-full object-cover"
              />
              <div class="flex-1 min-w-0">
                <p class="text-white font-medium truncate">
                  {{ `${participant.user?.firstName || ''} ${participant.user?.lastName || ''}`.trim() || participant.user?.username }}
                </p>
                <p class="text-white/50 text-sm">
                  {{ participant.user?.isOnline ? 'Online' : 'Offline' }}
                  {{ participant.role === 'admin' ? ' • Admin' : '' }}
                </p>
              </div>
              
              <!-- Admin Badge -->
              <div v-if="participant.role === 'admin'" class="text-xs bg-[#055CFF] text-white px-2 py-1 rounded-full">
                Admin
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="border-t border-white/10 p-6">
        <div class="flex gap-3">
          <button 
            @click="close"
            class="flex-1 py-3 px-4 bg-[#2C2F36] text-white rounded-lg hover:bg-[#3C3F46] transition-colors font-medium"
          >
            Close
          </button>
          <button 
            v-if="!isAdmin"
            @click="handleLeaveGroup"
            class="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
          >
            Leave Group
          </button>
        </div>
      </div>
    </div>
  </div>
</template>