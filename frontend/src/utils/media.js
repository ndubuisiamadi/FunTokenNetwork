// src/utils/media.js
import userPlaceholderImage from '@/assets/user-placeholder-image.jpg'

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

/**
 * Convert a relative media URL to a full backend URL
 * @param {string} mediaUrl - The media URL (could be relative or absolute)
 * @returns {string} - Full URL to the media file
 */
export const getMediaUrl = (mediaUrl) => {
  if (!mediaUrl) return ''
  
  // If already a full URL, return as-is
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl
  }
  
  // If it's a relative URL starting with /uploads/, construct full URL
  if (mediaUrl.startsWith('/uploads/')) {
    return `${BACKEND_BASE_URL}${mediaUrl}`
  }
  
  // If it's just a filename, assume it's in uploads folder
  if (!mediaUrl.startsWith('/')) {
    return `${BACKEND_BASE_URL}/uploads/${mediaUrl}`
  }
  
  // Default case - prepend backend base URL
  return `${BACKEND_BASE_URL}${mediaUrl}`
}

/**
 * Get avatar URL with fallback to default avatar
 * @param {string} avatarUrl - User's avatar URL
 * @returns {string} - Full URL to avatar or default avatar
 */
export const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) {
    // Return local default avatar
    return userPlaceholderImage
  }
  
  return getMediaUrl(avatarUrl)
}