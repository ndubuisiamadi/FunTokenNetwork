// backend/src/utils/messageStatus.js - BACKEND MIRROR OF FRONTEND CONSTANTS

/**
 * Message Status Constants - MUST MATCH FRONTEND EXACTLY
 * Flow: QUEUED → SENDING → SENT → DELIVERED → READ
 *                   ↓
 *               FAILED (with retry)
 */
const MESSAGE_STATUS = {
  QUEUED: 'queued',         // Message queued offline/pending connection
  SENDING: 'sending',       // Being sent to server (frontend only)
  SENT: 'sent',            // Server confirmed receipt
  DELIVERED: 'delivered',   // Recipient is online and received
  READ: 'read',            // Recipient opened conversation
  FAILED: 'failed'         // Send failed (will auto-retry)
}

/**
 * Reliability Configuration - MUST MATCH FRONTEND
 */
const MESSAGE_RELIABILITY_CONFIG = {
  SEND_TIMEOUT: 5000,           // 5 seconds before marking as failed
  MAX_RETRY_ATTEMPTS: 3,        // Maximum auto-retry attempts
  AUTO_DELIVERY_DELAY: 100,     // Delay before auto-updating to delivered (ms)
  STATUS_UPDATE_BATCH_SIZE: 50, // How many messages to update in one query
  CLEANUP_INTERVAL: 300000,     // Clean up old status updates (5 minutes)
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
  [MESSAGE_STATUS.FAILED]: -1 // Special case
}

/**
 * Validate if status can progress to new status
 */
function canStatusProgress(currentStatus, newStatus) {
  // Always allow updating to failed
  if (newStatus === MESSAGE_STATUS.FAILED) return true
  
  // Never progress from failed (must retry)
  if (currentStatus === MESSAGE_STATUS.FAILED) return false
  
  // Never regress from READ
  if (currentStatus === MESSAGE_STATUS.READ) return false
  
  // Only allow forward progression or same status
  return STATUS_HIERARCHY[newStatus] >= STATUS_HIERARCHY[currentStatus]
}

/**
 * Update message status safely (prevents invalid transitions)
 */
function updateMessageStatus(currentStatus, newStatus) {
  if (canStatusProgress(currentStatus, newStatus)) {
    return {
      success: true,
      status: newStatus,
      updatedAt: new Date()
    }
  }
  
  return {
    success: false,
    error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
    status: currentStatus
  }
}

/**
 * Check if user is online (determines DELIVERED status)
 */
function shouldMarkAsDelivered(userId, onlineUsers) {
  // onlineUsers can be a Set, Array, or Map
  if (onlineUsers instanceof Set) {
    return onlineUsers.has(userId)
  }
  
  if (Array.isArray(onlineUsers)) {
    return onlineUsers.includes(userId)
  }
  
  if (onlineUsers instanceof Map) {
    return onlineUsers.has(userId)
  }
  
  // Fallback - assume user might be online
  return false
}

/**
 * Create initial message status when creating new message
 */
function getInitialMessageStatus() {
  return MESSAGE_STATUS.SENT // Messages start as SENT when created in DB
}

/**
 * Get appropriate status for new message based on recipient online status
 */
function getMessageStatusForRecipient(recipientId, onlineUsers) {
  const isRecipientOnline = shouldMarkAsDelivered(recipientId, onlineUsers)
  return isRecipientOnline ? MESSAGE_STATUS.DELIVERED : MESSAGE_STATUS.SENT
}

/**
 * Batch update message statuses for better performance
 */
async function batchUpdateMessageStatus(prisma, conversationId, senderId, newStatus, excludeStatuses = []) {
  try {
    const whereClause = {
      conversationId,
      status: { 
        notIn: [MESSAGE_STATUS.READ, MESSAGE_STATUS.FAILED, ...excludeStatuses]
      }
    }
    
    // If updating to READ, only update messages not sent by the reader
    if (newStatus === MESSAGE_STATUS.READ) {
      whereClause.senderId = { not: senderId }
    }
    
    const updateResult = await prisma.message.updateMany({
      where: whereClause,
      data: { 
        status: newStatus,
        statusUpdatedAt: new Date()
      }
    })
    
    return {
      success: true,
      count: updateResult.count,
      status: newStatus
    }
  } catch (error) {
    console.error('Batch status update failed:', error)
    return {
      success: false,
      error: error.message,
      count: 0
    }
  }
}

/**
 * Auto-deliver messages when user comes online
 */
async function autoDeliverMessages(prisma, userId) {
  try {
    // Find all conversations where user is a participant
    const participantConversations = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true }
    })
    
    const conversationIds = participantConversations.map(p => p.conversationId)
    
    if (conversationIds.length === 0) {
      return { success: true, count: 0 }
    }
    
    // Update all SENT messages in those conversations to DELIVERED
    const updateResult = await prisma.message.updateMany({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId }, // Don't deliver own messages
        status: MESSAGE_STATUS.SENT
      },
      data: {
        status: MESSAGE_STATUS.DELIVERED,
        statusUpdatedAt: new Date()
      }
    })
    
    console.log(`📱 Auto-delivered ${updateResult.count} messages for user ${userId}`)
    
    return {
      success: true,
      count: updateResult.count,
      conversationIds
    }
  } catch (error) {
    console.error('Auto-delivery failed:', error)
    return {
      success: false,
      error: error.message,
      count: 0
    }
  }
}

/**
 * Log status transition for debugging
 */
function logStatusTransition(messageId, fromStatus, toStatus, context = '') {
  const timestamp = new Date().toISOString()
  console.log(`📱 MSG_STATUS [${timestamp}] ${messageId}: ${fromStatus} → ${toStatus} ${context}`)
}

/**
 * Validate message status data
 */
function validateMessageStatus(status) {
  const validStatuses = Object.values(MESSAGE_STATUS)
  
  if (!validStatuses.includes(status)) {
    return {
      valid: false,
      error: `Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`
    }
  }
  
  return { valid: true }
}

module.exports = {
  MESSAGE_STATUS,
  MESSAGE_RELIABILITY_CONFIG,
  canStatusProgress,
  updateMessageStatus,
  shouldMarkAsDelivered,
  getInitialMessageStatus,
  getMessageStatusForRecipient,
  batchUpdateMessageStatus,
  autoDeliverMessages,
  logStatusTransition,
  validateMessageStatus
}