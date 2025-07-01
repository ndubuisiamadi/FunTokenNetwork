const prisma = require('../db')
const { awardGumballs } = require('./levelSystem') // Your existing service

class ReferralService {
  // Generate unique referral code with database check
  generateReferralCode(username) {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 6)
    return `${username.substring(0, 4).toUpperCase()}${timestamp}${random}`.toUpperCase()
  }

  // Create referral code with uniqueness guarantee
  async createReferralCode(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, referralCode: true }
      })

      if (!user) throw new Error('User not found')
      if (user.referralCode) return user.referralCode

      let referralCode
      let isUnique = false
      let attempts = 0

      // Ensure unique referral code
      while (!isUnique && attempts < 10) {
        referralCode = this.generateReferralCode(user.username)
        const existing = await prisma.user.findFirst({
          where: { referralCode }
        })
        isUnique = !existing
        attempts++
      }

      if (!isUnique) throw new Error('Could not generate unique referral code')

      await prisma.user.update({
        where: { id: userId },
        data: { referralCode }
      })

      return referralCode
    } catch (error) {
      console.error('Error creating referral code:', error)
      throw error
    }
  }

  // NEW: Track referral signup without awarding rewards
  async trackReferralSignup(newUserId, referralCode) {
    try {
      if (!referralCode) return null

      const referrer = await prisma.user.findFirst({
        where: { referralCode },
        select: { id: true, username: true }
      })

      if (!referrer) {
        console.log(`Invalid referral code: ${referralCode}`)
        return null
      }

      // Prevent self-referral
      if (referrer.id === newUserId) {
        console.log('Prevented self-referral')
        return null
      }

      // Only update the referral relationship
      await prisma.user.update({
        where: { id: newUserId },
        data: { referredBy: referrer.id }
      })

      // Update referral click as converted (for analytics)
      await prisma.referralClick.updateMany({
        where: {
          referralCode,
          converted: false
        },
        data: {
          converted: true,
          convertedUserId: newUserId
        }
      })

      console.log(`Referral relationship tracked: ${referrer.username} -> new user (${newUserId})`)
      return referrer

    } catch (error) {
      console.error('Error tracking referral signup:', error)
      throw error
    }
  }

  // NEW: Process referral rewards after profile completion
  async processReferralRewards(newUserId, referrerId) {
    try {
      // Get referrer details
      const referrer = await prisma.user.findUnique({
        where: { id: referrerId },
        select: { id: true, username: true, totalReferrals: true }
      })

      if (!referrer) {
        console.log(`Referrer not found: ${referrerId}`)
        return null
      }

      // Check if rewards were already given
      const existingReward = await prisma.referralReward.findFirst({
        where: {
          userId: referrerId,
          referredUserId: newUserId,
          rewardType: 'signup'
        }
      })

      if (existingReward) {
        console.log('Referral rewards already given for this signup')
        return null
      }

      // Update referrer stats
      await prisma.user.update({
        where: { id: referrerId },
        data: {
          totalReferrals: { increment: 1 },
          activeReferrals: { increment: 1 }
        }
      })

      // Award signup bonus to referrer
      const signupReward = 50 // Gumballs
      await this.awardReferralReward(
        referrerId,
        newUserId,
        'signup',
        signupReward,
        'New user profile completion bonus'
      )

      // Award welcome bonus to new user
      const newUserBonus = 25 // Welcome bonus for being referred
      await awardGumballs(newUserId, newUserBonus, 'referral_welcome_bonus')

      // Check for milestone rewards
      const updatedReferrer = await prisma.user.findUnique({
        where: { id: referrerId },
        select: { totalReferrals: true }
      })

      await this.checkMilestoneRewards(referrerId, updatedReferrer.totalReferrals)

      console.log(`Referral rewards processed: ${referrer.username} earned ${signupReward} gumballs`)
      return referrer

    } catch (error) {
      console.error('Error processing referral rewards:', error)
      throw error
    }
  }

  // LEGACY: Keep for backward compatibility but mark as deprecated
  async processReferralSignup(newUserId, referralCode) {
    console.warn('processReferralSignup is deprecated. Use trackReferralSignup + processReferralRewards instead.')
    return this.trackReferralSignup(newUserId, referralCode)
  }

  // Validate referral code (handles non-unique constraint)
  async validateReferralCode(referralCode) {
    try {
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

      return user ? { valid: true, referrer: user } : { valid: false }
    } catch (error) {
      console.error('Error validating referral code:', error)
      return { valid: false }
    }
  }

  // Track referral click
  async trackReferralClick(referralCode, ipAddress, userAgent) {
    try {
      await prisma.referralClick.create({
        data: {
          referralCode,
          ipAddress,
          userAgent
        }
      })
    } catch (error) {
      console.error('Error tracking referral click:', error)
    }
  }

  // Award referral reward
  async awardReferralReward(userId, referredUserId, rewardType, amount, description) {
    try {
      // Create reward record
      await prisma.referralReward.create({
        data: {
          userId,
          referredUserId,
          rewardType,
          amount,
          description
        }
      })

      // Award gumballs
      await awardGumballs(userId, amount, `referral_${rewardType}`)

      // Update user's total referral earnings
      await prisma.user.update({
        where: { id: userId },
        data: {
          referralEarnings: { increment: amount }
        }
      })

      console.log(`Awarded ${amount} gumballs to user ${userId} for ${rewardType}`)
    } catch (error) {
      console.error('Error awarding referral reward:', error)
      throw error
    }
  }

  // Check for milestone rewards (updated to handle specific referral count)
  async checkMilestoneRewards(userId, currentReferralCount) {
    try {
      const milestones = [
        { count: 5, reward: 100 },
        { count: 10, reward: 250 },
        { count: 25, reward: 500 },
        { count: 50, reward: 1000 },
        { count: 100, reward: 2500 }
      ]

      // Check if this referral count hits a milestone
      const milestone = milestones.find(m => m.count === currentReferralCount)
      
      if (!milestone) return // No milestone hit

      // Check if milestone reward was already given
      const existingMilestoneReward = await prisma.referralReward.findFirst({
        where: {
          userId,
          rewardType: `milestone_${milestone.count}`,
        }
      })

      if (existingMilestoneReward) {
        console.log(`Milestone ${milestone.count} reward already given`)
        return
      }

      // Award milestone bonus
      await this.awardReferralReward(
        userId,
        userId, // For milestone rewards, referredUserId can be self
        `milestone_${milestone.count}`,
        milestone.reward,
        `Milestone reward for ${milestone.count} referrals`
      )

      console.log(`Milestone reward: User ${userId} earned ${milestone.reward} gumballs for ${milestone.count} referrals`)

    } catch (error) {
      console.error('Error checking milestone rewards:', error)
    }
  }

  // Get user's referral analytics
  async getReferralAnalytics(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          referralCode: true,
          totalReferrals: true,
          activeReferrals: true,
          referralEarnings: true,
          referrals: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              createdAt: true,
              isOnline: true,
              lastSeen: true
            },
            take: 20,
            orderBy: { createdAt: 'desc' }
          },
          referralRewards: {
            select: {
              rewardType: true,
              amount: true,
              description: true,
              createdAt: true,
              referredUser: {
                select: {
                  username: true,
                  firstName: true,
                  avatarUrl: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
          }
        }
      })

      if (!user) throw new Error('User not found')

      // Get click analytics for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const clickStats = await prisma.referralClick.groupBy({
        by: ['converted'],
        where: {
          referralCode: user.referralCode,
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: true
      })

      const totalClicks = clickStats.reduce((sum, stat) => sum + stat._count, 0)
      const conversions = clickStats.find(stat => stat.converted)?._count || 0
      const conversionRate = totalClicks > 0 ? (conversions / totalClicks * 100).toFixed(1) : 0

      return {
        ...user,
        analytics: {
          totalClicks: totalClicks,
          conversions: conversions,
          conversionRate: parseFloat(conversionRate),
          period: "Last 30 days"
        }
      }
    } catch (error) {
      console.error('Error getting referral analytics:', error)
      throw error
    }
  }

  // Get leaderboard
  async getReferralLeaderboard(limit = 20) {
    try {
      return await prisma.user.findMany({
        where: {
          totalReferrals: { gt: 0 }
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          totalReferrals: true,
          referralEarnings: true
        },
        orderBy: [
          { totalReferrals: 'desc' },
          { referralEarnings: 'desc' }
        ],
        take: limit
      })
    } catch (error) {
      console.error('Error getting referral leaderboard:', error)
      throw error
    }
  }
}

module.exports = new ReferralService()