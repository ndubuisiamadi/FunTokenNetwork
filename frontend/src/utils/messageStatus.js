// src/utils/messageStatus.js - SINGLE SOURCE OF TRUTH WITH RELIABILITY

/**
 * Message Status Constants - SINGLE SOURCE OF TRUTH
 * Flow: QUEUED → SENDING → SENT → DELIVERED → READ
 *                   ↓
 *               FAILED (with retry)
 */
export const MESSAGE_STATUS = {
  QUEUED: 'queued',         // Message queued offline/pending connection
  SENDING: 'sending',       // Optimistic UI - being sent to server
  SENT: 'sent',            // Server confirmed receipt
  DELIVERED: 'delivered',   // Recipient is online and received
  READ: 'read',            // Recipient opened conversation
  FAILED: 'failed'         // Send failed (will auto-retry)
}

/**
 * Status hierarchy for progression validation
 */
const STATUS_HIERARCHY = {
  [MESSAGE_STATUS.QUEUED]: 0,
  [MESSAGE_STATUS.SENDING]: 1,
  [MESSAGE_STATUS.SENT]: 2,
  [MESSAGE_STATUS.DELIVERED]: 3,
  [MESSAGE_STATUS.READ]: 4,
  [MESSAGE_STATUS.FAILED]: -1 // Special case - can transition from any state
}

/**
 * Reliability Configuration
 */
export const MESSAGE_RELIABILITY_CONFIG = {
  SEND_TIMEOUT: 5000,           // 5 seconds before marking as failed
  MAX_RETRY_ATTEMPTS: 3,        // Maximum auto-retry attempts
  RETRY_DELAY_BASE: 1000,       // Base delay for exponential backoff (1s)
  RETRY_DELAY_MAX: 8000,        // Maximum retry delay (8s)
  QUEUE_STORAGE_KEY: 'unsent_messages', // LocalStorage key for message queue
  CONNECTION_CHECK_INTERVAL: 2000,      // Check connection every 2s
}

/**
 * Message States for UI Logic
 */
export const MESSAGE_STATES = {
  PENDING: [MESSAGE_STATUS.QUEUED, MESSAGE_STATUS.SENDING],
  SUCCESS: [MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED, MESSAGE_STATUS.READ],
  ERROR: [MESSAGE_STATUS.FAILED],
  NEEDS_RETRY: [MESSAGE_STATUS.FAILED],
  FINAL: [MESSAGE_STATUS.READ, MESSAGE_STATUS.FAILED] // Cannot change from these
}

/**
 * Get message status for display (only for sender's messages)
 */
export function getMessageStatus(message, currentUserId) {
  // Only show status for messages sent by current user
  if (!message || message.senderId !== currentUserId) {
    return null
  }

  // Handle optimistic messages (before server confirmation)
  if (message.tempId && !message.id) {
    return MESSAGE_STATUS.SENDING
  }

  // Handle failed messages
  if (message.error || message.failed) {
    return MESSAGE_STATUS.FAILED
  }

  // Return the single authoritative status field
  return message.status || MESSAGE_STATUS.QUEUED
}

/**
 * Check if we should show status indicators for this message
 */
export function shouldShowMessageStatus(message, currentUserId) {
  return message && message.senderId === currentUserId
}

/**
 * Get display properties for status rendering
 */
export function getStatusDisplay(status) {
  const displays = {
    [MESSAGE_STATUS.QUEUED]: {
      icon: 'clock',
      color: 'text-white/40',
      tooltip: 'Queued...',
      ticks: 0,
      showSpinner: true
    },
    [MESSAGE_STATUS.SENDING]: {
      icon: 'clock',
      color: 'text-white/40',
      tooltip: 'Sending...',
      ticks: 0,
      showSpinner: true
    },
    [MESSAGE_STATUS.SENT]: {
      icon: 'single-tick',
      color: 'text-white/60',
      tooltip: 'Sent',
      ticks: 1
    },
    [MESSAGE_STATUS.DELIVERED]: {
      icon: 'double-tick',
      color: 'text-white/60',
      tooltip: 'Delivered',
      ticks: 2
    },
    [MESSAGE_STATUS.READ]: {
      icon: 'double-tick',
      color: 'text-[#055CFF]',
      tooltip: 'Read',
      ticks: 2,
      isRead: true
    },
    [MESSAGE_STATUS.FAILED]: {
      icon: 'error',
      color: 'text-red-400',
      tooltip: 'Failed to send (retrying...)',
      ticks: 0,
      isError: true,
      showRetry: true
    }
  }

  return displays[status] || displays[MESSAGE_STATUS.SENT]
}

/**
 * Validate if status can progress to new status
 */
export function canStatusProgress(currentStatus, newStatus) {
  // Always allow updating to failed
  if (newStatus === MESSAGE_STATUS.FAILED) return true
  
  // Never progress from failed (must retry or manual intervention)
  if (currentStatus === MESSAGE_STATUS.FAILED) return false
  
  // Never regress from READ
  if (currentStatus === MESSAGE_STATUS.READ) return false
  
  // Only allow forward progression or same status
  return STATUS_HIERARCHY[newStatus] >= STATUS_HIERARCHY[currentStatus]
}

/**
 * Check if message is in a pending state (not finalized)
 */
export function isMessagePending(status) {
  return MESSAGE_STATES.PENDING.includes(status)
}

/**
 * Check if message is in an error state
 */
export function isMessageError(status) {
  return MESSAGE_STATES.ERROR.includes(status)
}

/**
 * Check if message needs retry
 */
export function shouldRetryMessage(message) {
  if (!message || message.status !== MESSAGE_STATUS.FAILED) {
    return false
  }
  
  const retryCount = message.retryCount || 0
  return retryCount < MESSAGE_RELIABILITY_CONFIG.MAX_RETRY_ATTEMPTS
}

/**
 * Calculate next retry delay using exponential backoff
 */
export function calculateRetryDelay(retryCount) {
  const delay = MESSAGE_RELIABILITY_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retryCount)
  return Math.min(delay, MESSAGE_RELIABILITY_CONFIG.RETRY_DELAY_MAX)
}

/**
 * Get conversation preview status (for last message in sidebar)
 */
export function getConversationStatusDisplay(lastMessage, currentUserId) {
  if (!shouldShowMessageStatus(lastMessage, currentUserId)) {
    return null
  }
  
  const status = getMessageStatus(lastMessage, currentUserId)
  return status ? getStatusDisplay(status) : null
}

/**
 * Update message status safely (prevents invalid transitions)
 */
export function updateMessageStatus(message, newStatus) {
  const currentStatus = message.status || MESSAGE_STATUS.QUEUED
  
  if (canStatusProgress(currentStatus, newStatus)) {
    message.status = newStatus
    message.statusUpdatedAt = new Date().toISOString()
    return true
  }
  
  console.warn(`Invalid status transition: ${currentStatus} → ${newStatus}`)
  return false // Status update rejected
}

/**
 * Create a new message with proper status initialization
 */
export function createMessage(data, currentUserId) {
  const now = new Date().toISOString()
  
  return {
    ...data,
    status: MESSAGE_STATUS.QUEUED,
    statusUpdatedAt: now,
    createdAt: data.createdAt || now,
    retryCount: 0,
    senderId: currentUserId,
    // Reliability metadata
    reliability: {
      attempts: 0,
      lastAttempt: null,
      nextRetry: null,
      errors: []
    }
  }
}

/**
 * Mark message for retry with backoff
 */
export function scheduleMessageRetry(message) {
  if (!shouldRetryMessage(message)) {
    return false
  }
  
  const retryCount = (message.retryCount || 0) + 1
  const delay = calculateRetryDelay(retryCount)
  const nextRetry = new Date(Date.now() + delay).toISOString()
  
  message.retryCount = retryCount
  message.reliability = {
    ...message.reliability,
    nextRetry,
    lastAttempt: new Date().toISOString()
  }
  
  return { success: true, retryCount, delay }
}

/**
 * Connection state enum
 */
export const CONNECTION_STATE = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  CONNECTING: 'connecting',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected'
}

/**
 * Message queue management for offline support
 */
export class MessageQueue {
  constructor(storageKey = MESSAGE_RELIABILITY_CONFIG.QUEUE_STORAGE_KEY) {
    this.storageKey = storageKey
  }

  // Add message to offline queue
  enqueue(message) {
    try {
      const queue = this.getQueue()
      queue.push({
        ...message,
        queuedAt: new Date().toISOString()
      })
      localStorage.setItem(this.storageKey, JSON.stringify(queue))
      return true
    } catch (error) {
      console.error('Failed to queue message:', error)
      return false
    }
  }

  // Get all queued messages
  getQueue() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get message queue:', error)
      return []
    }
  }

  // Remove message from queue
  dequeue(messageId) {
    try {
      const queue = this.getQueue().filter(msg => msg.id !== messageId && msg.tempId !== messageId)
      localStorage.setItem(this.storageKey, JSON.stringify(queue))
      return true
    } catch (error) {
      console.error('Failed to dequeue message:', error)
      return false
    }
  }

  // Clear entire queue
  clear() {
    try {
      localStorage.removeItem(this.storageKey)
      return true
    } catch (error) {
      console.error('Failed to clear message queue:', error)
      return false
    }
  }

  // Get queue size
  size() {
    return this.getQueue().length
  }
}

// Export singleton instance
export const messageQueue = new MessageQueue()