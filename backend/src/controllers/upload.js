// src/controllers/upload.js
const path = require('path')
const fs = require('fs').promises

const uploadMedia = async (req, res) => {
  try {
    console.log('=== MEDIA UPLOAD START ===')
    console.log('User:', req.user?.id)
    console.log('Files received:', req.files?.length)

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' })
    }

    // Build the base URL for the backend server
    const baseUrl = `${req.protocol}://${req.get('host')}`
    
    const fileUrls = req.files.map(file => {
      // Return the FULL URL
      const fullUrl = `${baseUrl}/uploads/${file.filename}`
      console.log('File uploaded:', {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        url: fullUrl
      })
      return fullUrl
    })

    console.log('All files processed successfully')
    console.log('=== MEDIA UPLOAD SUCCESS ===')

    res.json({
      message: 'Files uploaded successfully',
      urls: fileUrls,
      count: fileUrls.length
    })
  } catch (error) {
    console.error('=== MEDIA UPLOAD ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', error.message)
    res.status(500).json({ 
      message: 'Upload failed', 
      error: 'internal_server_error' 
    })
  }
}

const uploadAvatar = async (req, res) => {
  try {
    console.log('=== AVATAR UPLOAD START ===')
    console.log('User:', req.user?.id)

    if (!req.file) {
      return res.status(400).json({ message: 'No avatar file uploaded' })
    }

    // Build the full URL for the avatar
    const baseUrl = `${req.protocol}://${req.get('host')}`
    const avatarUrl = `${baseUrl}/uploads/${req.file.filename}`
    
    console.log('Avatar uploaded:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      url: avatarUrl
    })

    // TODO: Update user's avatar URL in database
    // await prisma.user.update({
    //   where: { id: req.user.id },
    //   data: { avatarUrl }
    // })

    console.log('=== AVATAR UPLOAD SUCCESS ===')

    res.json({
      message: 'Avatar uploaded successfully',
      url: avatarUrl
    })
  } catch (error) {
    console.error('=== AVATAR UPLOAD ERROR ===')
    console.error('Error:', error)
    res.status(500).json({ 
      message: 'Avatar upload failed', 
      error: 'internal_server_error' 
    })
  }
}

module.exports = {
  uploadMedia,
  uploadAvatar
}