<template>
  <teleport to="body">
    <!-- Notification Container -->
    <div class="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      <transition-group
        name="notification"
        tag="div"
        class="space-y-3"
      >
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'flex items-start p-4 rounded-lg shadow-lg border backdrop-blur-sm',
            'transform transition-all duration-300 ease-in-out',
            getNotificationClasses(notification.type)
          ]"
          @click="removeNotification(notification.id)"
        >
          <!-- Icon -->
          <div :class="['flex-shrink-0 w-6 h-6 mr-3', getIconClasses(notification.type)]">
            <component :is="getNotificationIcon(notification.type)" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <h4 v-if="notification.title" class="text-sm font-medium text-white mb-1">
              {{ notification.title }}
            </h4>
            <p class="text-sm text-gray-200">
              {{ notification.message }}
            </p>
            <div v-if="notification.actions" class="mt-3 flex space-x-2">
              <button
                v-for="action in notification.actions"
                :key="action.label"
                @click.stop="handleAction(action, notification)"
                :class="[
                  'px-3 py-1 text-xs font-medium rounded transition-colors',
                  action.primary 
                    ? 'bg-white text-gray-900 hover:bg-gray-100'
                    : 'bg-transparent text-white border border-white/30 hover:bg-white/10'
                ]"
              >
                {{ action.label }}
              </button>
            </div>
          </div>

          <!-- Close Button -->
          <button
            @click.stop="removeNotification(notification.id)"
            class="flex-shrink-0 ml-2 p-1 rounded-md text-white/60 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <!-- Progress Bar (for auto-dismiss) -->
          <div
            v-if="notification.autoDismiss"
            class="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-lg transition-all ease-linear"
            :style="{ width: getProgressWidth(notification) + '%' }"
          ></div>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Notification state
const notifications = ref([])
let notificationId = 0

// Icon components
const SuccessIcon = {
  template: `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>
  `
}

const ErrorIcon = {
  template: `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  `
}

const WarningIcon = {
  template: `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
    </svg>
  `
}

const InfoIcon = {
  template: `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  `
}

const LoadingIcon = {
  template: `
    <svg class="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
  `
}

// Methods
const addNotification = (notification) => {
  const id = ++notificationId
  const newNotification = {
    id,
    type: 'info',
    autoDismiss: true,
    duration: 5000,
    createdAt: Date.now(),
    ...notification
  }

  notifications.value.push(newNotification)

  // Auto dismiss if enabled
  if (newNotification.autoDismiss) {
    setTimeout(() => {
      removeNotification(id)
    }, newNotification.duration)
  }

  return id
}

const removeNotification = (id) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

const clearAllNotifications = () => {
  notifications.value = []
}

const getNotificationClasses = (type) => {
  const baseClasses = 'cursor-pointer hover:scale-105'
  
  switch (type) {
    case 'success':
      return `${baseClasses} bg-green-600/90 border-green-500/50`
    case 'error':
      return `${baseClasses} bg-red-600/90 border-red-500/50`
    case 'warning':
      return `${baseClasses} bg-yellow-600/90 border-yellow-500/50`
    case 'loading':
      return `${baseClasses} bg-blue-600/90 border-blue-500/50`
    default:
      return `${baseClasses} bg-gray-700/90 border-gray-600/50`
  }
}

const getIconClasses = (type) => {
  switch (type) {
    case 'success':
      return 'text-green-300'
    case 'error':
      return 'text-red-300'
    case 'warning':
      return 'text-yellow-300'
    case 'loading':
      return 'text-blue-300'
    default:
      return 'text-gray-300'
  }
}

const getNotificationIcon = (type) => {
  const iconMap = {
    success: SuccessIcon,
    error: ErrorIcon,
    warning: WarningIcon,
    loading: LoadingIcon,
    info: InfoIcon
  }
  return iconMap[type] || InfoIcon
}

const getProgressWidth = (notification) => {
  if (!notification.autoDismiss) return 0
  
  const elapsed = Date.now() - notification.createdAt
  const progress = (elapsed / notification.duration) * 100
  return Math.min(100, Math.max(0, 100 - progress))
}

const handleAction = (action, notification) => {
  if (action.handler) {
    action.handler(notification)
  }
  
  if (action.dismiss !== false) {
    removeNotification(notification.id)
  }
}

// Notification helper functions
const showSuccess = (message, options = {}) => {
  return addNotification({
    type: 'success',
    message,
    ...options
  })
}

const showError = (message, options = {}) => {
  return addNotification({
    type: 'error',
    message,
    autoDismiss: false, // Errors should be manually dismissed
    ...options
  })
}

const showWarning = (message, options = {}) => {
  return addNotification({
    type: 'warning',
    message,
    duration: 7000, // Warnings stay longer
    ...options
  })
}

const showInfo = (message, options = {}) => {
  return addNotification({
    type: 'info',
    message,
    ...options
  })
}

const showLoading = (message, options = {}) => {
  return addNotification({
    type: 'loading',
    message,
    autoDismiss: false, // Loading notifications should be manually dismissed
    ...options
  })
}

// Global notification service
const notificationService = {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  remove: removeNotification,
  clear: clearAllNotifications
}

// Make notification service available globally
onMounted(() => {
  // Make notifications available globally for use in other components
  window.__adminNotifications = notificationService
  
  // Listen for global notification events
  window.addEventListener('admin-notification', (event) => {
    const { type, message, options } = event.detail
    notificationService[type]?.(message, options)
  })
})

onUnmounted(() => {
  delete window.__adminNotifications
  window.removeEventListener('admin-notification', () => {})
})

// Expose notification service to parent components
defineExpose({
  addNotification,
  removeNotification,
  clearAllNotifications,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading
})
</script>

<style scoped>
/* Notification animations */
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s ease;
}

/* Progress bar animation */
@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Hover effects */
.notification:hover {
  transform: translateX(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

/* Responsive design */
@media (max-width: 640px) {
  .notification {
    max-width: 90vw;
    margin-right: 1rem;
  }
}
</style>