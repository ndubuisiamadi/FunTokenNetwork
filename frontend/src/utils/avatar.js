// src/utils/avatar.js
import userPlaceholderImage from '@/assets/user-placeholder-image.jpg'

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

/**
 * Get media URL for any uploaded file
 */
export const getMediaUrl = (mediaUrl) => {
  if (!mediaUrl) return ''
  
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl
  }
  
  if (mediaUrl.startsWith('/uploads/')) {
    return `${BACKEND_BASE_URL}${mediaUrl}`
  }
  
  if (!mediaUrl.startsWith('/')) {
    return `${BACKEND_BASE_URL}/uploads/${mediaUrl}`
  }
  
  return `${BACKEND_BASE_URL}${mediaUrl}`
}

/**
 * Get avatar URL with automatic fallback to default
 * This is the ONLY place where the default avatar is defined
 */
export const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) {
    return userPlaceholderImage // SINGLE source of truth
  }
  return getMediaUrl(avatarUrl)
}

/**
 * Default avatar constant for direct template use
 */
export const DEFAULT_AVATAR = userPlaceholderImage