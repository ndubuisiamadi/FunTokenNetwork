/**
 * Get standardized message status for UI display
 * @param {Object} message - The message object
 * @param {string} currentUserId - Current user's ID
 * @returns {string|null} - Status string or null for received messages
 */
export const getMessageStatus = (message, currentUserId) => {
  // Only show status for messages sent by current user
  if (!message || message.senderId !== currentUserId) {
    return null
  }

  // Priority order for status determination
  if (message.isOptimistic || message.status === 'sending') {
    return 'sending'
  }
  
  if (message.error || message.status === 'failed') {
    return 'failed'
  }
  
  if (message.isRead) {
    return 'read'
  }
  
  if (message.isDelivered) {
    return 'delivered'
  }
  
  return 'sent'
}

/**
 * Get status for conversation preview (last message)
 * @param {Object} conversation - Conversation object
 * @param {string} currentUserId - Current user's ID
 * @returns {string|null} - Status for last message
 */
export const getConversationPreviewStatus = (conversation, currentUserId) => {
  const lastMessage = conversation.lastMessageData
  
  if (!lastMessage || lastMessage.senderId !== currentUserId) {
    return null
  }
  
  return getMessageStatus(lastMessage, currentUserId)
}

/**
 * Check if message should show status indicators
 * @param {Object} message - The message object
 * @param {string} currentUserId - Current user's ID
 * @returns {boolean} - Whether to show status
 */
export const shouldShowMessageStatus = (message, currentUserId) => {
  return message && message.senderId === currentUserId
}
