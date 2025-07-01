// src/routes/referrals.js
const express = require('express')
const { auth } = require('../middleware/auth')  // CORRECT: Use 'auth'
const referralService = require('../services/referralService')
const prisma = require('../db')
const router = express.Router()

// Get user's referral data and analytics
router.get('/me', auth, async (req, res) => {
  try {
    const analytics = await referralService.getReferralAnalytics(req.user.id)
    
    // Create referral code if user doesn't have one
    if (!analytics.referralCode) {
      const referralCode = await referralService.createReferralCode(req.user.id)
      analytics.referralCode = referralCode
    }

    res.json(analytics)
  } catch (error) {
    console.error('Get referral analytics error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Generate referral code
router.post('/generate-code', auth, async (req, res) => {
  try {
    const referralCode = await referralService.createReferralCode(req.user.id)
    res.json({ referralCode })
  } catch (error) {
    console.error('Generate referral code error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Track referral click (public endpoint)
router.post('/track/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get('User-Agent')

    await referralService.trackReferralClick(referralCode, ipAddress, userAgent)
    res.json({ success: true })
  } catch (error) {
    console.error('Track referral click error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get referral leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20
    const leaderboard = await referralService.getReferralLeaderboard(limit)
    res.json(leaderboard)
  } catch (error) {
    console.error('Get referral leaderboard error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Validate referral code (public endpoint)
router.get('/validate/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params
    
    const user = await prisma.user.findFirst({
      where: { referralCode },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true
      }
    })

    if (!user) {
      return res.status(404).json({ valid: false, message: 'Invalid referral code' })
    }

    res.json({
      valid: true,
      referrer: user
    })
  } catch (error) {
    console.error('Validate referral code error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

module.exports = router