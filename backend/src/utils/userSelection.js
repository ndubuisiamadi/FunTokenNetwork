// src/utils/userSelection.js - CONSISTENT USER DATA SELECTION
// This utility ensures all controllers return consistent user data with online status

/**
 * Standard user selection for basic user info (used in authentication, profiles, etc.)
 */
const basicUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  isOnline: true,
  lastSeen: true,
  createdAt: true
}

/**
 * Extended user selection for full profiles (used in profile views, user details, etc.)
 */
const fullUserSelect = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  bio: true,
  location: true,
  birthDate: true,
  avatarUrl: true,
  bannerUrl: true,
  gumballs: true,
  role: true,
  isEmailVerified: true,
  isOnline: true,
  lastSeen: true,
  level: true,
  globalRank: true,
  createdAt: true
}

/**
 * Public user selection (used when showing user info to other users)
 * Excludes sensitive information like email
 */
const publicUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  bio: true,
  location: true,
  avatarUrl: true,
  bannerUrl: true,
  gumballs: true,
  isOnline: true,
  lastSeen: true,
  level: true,
  globalRank: true,
  createdAt: true
}

/**
 * Minimal user selection (used in message senders, comment authors, etc.)
 */
const minimalUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  isOnline: true,
  lastSeen: true
}

/**
 * Search user selection (used in user search results)
 */
const searchUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  bio: true,
  avatarUrl: true,
  gumballs: true,
  isOnline: true,
  lastSeen: true,
  level: true,
  globalRank: true
}

/**
 * Friend/conversation user selection (used in friends lists, conversation participants)
 */
const friendUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  isOnline: true,
  lastSeen: true,
  level: true
}

/**
 * Helper function to format user data consistently
 * Adds computed fields and ensures consistent date formatting
 */
const formatUserData = (user) => {
  if (!user) return null

  const formatted = {
    ...user,
    // Ensure dates are properly formatted
    lastSeen: user.lastSeen ? new Date(user.lastSeen) : null,
    createdAt: user.createdAt ? new Date(user.createdAt) : null,
    birthDate: user.birthDate ? new Date(user.birthDate) : null
  }

  // Add computed full name if we have firstName/lastName
  if (user.firstName || user.lastName) {
    formatted.fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  }

  // Add display name (prefer full name, fallback to username)
  formatted.displayName = formatted.fullName || user.username

  return formatted
}

/**
 * Helper function to format online status with additional context
 */
const formatOnlineStatus = (user) => {
  if (!user) return null

  const now = new Date()
  const lastSeen = user.lastSeen ? new Date(user.lastSeen) : null
  const timeDiff = lastSeen ? Math.floor((now - lastSeen) / 1000) : null // seconds

  let onlineStatus = 'unknown'
  let lastSeenText = 'Unknown'

  if (user.isOnline) {
    onlineStatus = 'online'
    lastSeenText = 'Online now'
  } else if (timeDiff !== null) {
    if (timeDiff < 60) {
      onlineStatus = 'recently_online'
      lastSeenText = 'Just now'
    } else if (timeDiff < 300) { // 5 minutes
      onlineStatus = 'recently_online'
      lastSeenText = `${Math.floor(timeDiff / 60)} minutes ago`
    } else if (timeDiff < 3600) { // 1 hour
      onlineStatus = 'offline'
      lastSeenText = `${Math.floor(timeDiff / 60)} minutes ago`
    } else if (timeDiff < 86400) { // 24 hours
      onlineStatus = 'offline'
      lastSeenText = `${Math.floor(timeDiff / 3600)} hours ago`
    } else {
      onlineStatus = 'offline'
      lastSeenText = lastSeen.toLocaleDateString()
    }
  }

  return {
    ...user,
    onlineStatus,
    lastSeenText,
    isOnline: user.isOnline || false,
    lastSeen: lastSeen
  }
}

/**
 * Bulk format multiple users
 */
const formatUsersData = (users) => {
  if (!Array.isArray(users)) return []
  return users.map(formatUserData).filter(Boolean)
}

/**
 * Format users with online status
 */
const formatUsersWithOnlineStatus = (users) => {
  if (!Array.isArray(users)) return []
  return users.map(formatOnlineStatus).filter(Boolean)
}

module.exports = {
  // Selection objects
  basicUserSelect,
  fullUserSelect,
  publicUserSelect,
  minimalUserSelect,
  searchUserSelect,
  friendUserSelect,

  // Formatting functions
  formatUserData,
  formatOnlineStatus,
  formatUsersData,
  formatUsersWithOnlineStatus
}