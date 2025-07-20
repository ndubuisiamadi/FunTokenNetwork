// src/services/rankingScheduler.js - AUTOMATED RANKING SYSTEM
const cron = require('node-cron')
const { 
  updateAllRankings, 
  calculateRankChanges, 
  saveRankingSnapshot,
  refreshAllRankings,
  getRankingStats
} = require('./levelSystem')

class RankingScheduler {
  constructor() {
    this.jobs = new Map()
    this.isInitialized = false
    this.stats = {
      lastGlobalUpdate: null,
      lastWeeklyUpdate: null,
      lastMonthlyUpdate: null,
      totalUpdates: 0,
      errors: 0
    }
  }

  // 🚀 Initialize all ranking schedules
  init() {
    if (this.isInitialized) {
      console.log('⚠️  Ranking scheduler already initialized')
      return
    }

    console.log('🚀 Initializing ranking scheduler...')

    try {
      // 🚀 Global rankings - every 5 minutes (frequent for real-time feel)
      this.scheduleGlobalRankings()
      
      // 🚀 Weekly rankings - every hour
      this.scheduleWeeklyRankings()
      
      // 🚀 Monthly rankings - every 6 hours
      this.scheduleMonthlyRankings()
      
      // 🚀 Rank changes calculation - every 30 minutes
      this.scheduleRankChanges()
      
      // 🚀 Ranking snapshots - daily at 2 AM
      this.scheduleSnapshots()
      
      // 🚀 Complete refresh - weekly on Sunday at 3 AM
      this.scheduleCompleteRefresh()
      
      // 🚀 Health check - every hour
      this.scheduleHealthCheck()

      this.isInitialized = true
      console.log('✅ Ranking scheduler initialized successfully')
      
      // 🚀 Run initial update
      this.runInitialUpdate()
      
    } catch (error) {
      console.error('❌ Failed to initialize ranking scheduler:', error)
      this.stats.errors++
    }
  }

  // 🚀 Global rankings every 5 minutes
  scheduleGlobalRankings() {
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('🔄 Running scheduled global ranking update...')
        const result = await updateAllRankings('global')
        
        if (result.success) {
          this.stats.lastGlobalUpdate = new Date()
          this.stats.totalUpdates++
          console.log(`✅ Global rankings updated in ${result.duration}ms`)
        } else {
          console.error('❌ Global ranking update failed:', result.error)
          this.stats.errors++
        }
      } catch (error) {
        console.error('❌ Global ranking schedule error:', error)
        this.stats.errors++
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    })

    this.jobs.set('global', job)
    console.log('📅 Scheduled global rankings (every 5 minutes)')
  }

  // 🚀 Weekly rankings every hour
  scheduleWeeklyRankings() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        console.log('🔄 Running scheduled weekly ranking update...')
        const result = await updateAllRankings('weekly')
        
        if (result.success) {
          this.stats.lastWeeklyUpdate = new Date()
          this.stats.totalUpdates++
          console.log(`✅ Weekly rankings updated in ${result.duration}ms`)
        } else {
          console.error('❌ Weekly ranking update failed:', result.error)
          this.stats.errors++
        }
      } catch (error) {
        console.error('❌ Weekly ranking schedule error:', error)
        this.stats.errors++
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    })

    this.jobs.set('weekly', job)
    console.log('📅 Scheduled weekly rankings (every hour)')
  }

  // 🚀 Monthly rankings every 6 hours
  scheduleMonthlyRankings() {
    const job = cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('🔄 Running scheduled monthly ranking update...')
        const result = await updateAllRankings('monthly')
        
        if (result.success) {
          this.stats.lastMonthlyUpdate = new Date()
          this.stats.totalUpdates++
          console.log(`✅ Monthly rankings updated in ${result.duration}ms`)
        } else {
          console.error('❌ Monthly ranking update failed:', result.error)
          this.stats.errors++
        }
      } catch (error) {
        console.error('❌ Monthly ranking schedule error:', error)
        this.stats.errors++
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    })

    this.jobs.set('monthly', job)
    console.log('📅 Scheduled monthly rankings (every 6 hours)')
  }

  // 🚀 Rank changes every 30 minutes
  scheduleRankChanges() {
    const job = cron.schedule('*/30 * * * *', async () => {
      try {
        console.log('🔄 Running scheduled rank changes calculation...')
        const result = await calculateRankChanges()
        
        if (result.success) {
          console.log(`✅ Rank changes calculated for ${result.updated} users`)
        } else {
          console.error('❌ Rank changes calculation failed:', result.error)
          this.stats.errors++
        }
      } catch (error) {
        console.error('❌ Rank changes schedule error:', error)
        this.stats.errors++
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    })

    this.jobs.set('rankChanges', job)
    console.log('📅 Scheduled rank changes (every 30 minutes)')
  }

  // 🚀 Daily snapshots at 2 AM UTC
  scheduleSnapshots() {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('📸 Running scheduled ranking snapshot...')
        const result = await saveRankingSnapshot()
        
        if (result.success) {
          console.log(`✅ Ranking snapshot saved for ${result.saved} users`)
        } else {
          console.error('❌ Ranking snapshot failed:', result.error)
          this.stats.errors++
        }
      } catch (error) {
        console.error('❌ Ranking snapshot schedule error:', error)
        this.stats.errors++
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    })

    this.jobs.set('snapshots', job)
    console.log('📅 Scheduled ranking snapshots (daily at 2 AM UTC)')
  }

  // 🚀 Complete refresh weekly on Sunday at 3 AM UTC
  scheduleCompleteRefresh() {
    const job = cron.schedule('0 3 * * 0', async () => {
      try {
        console.log('🔄 Running scheduled complete ranking refresh...')
        const result = await refreshAllRankings()
        
        if (result.success) {
          console.log('✅ Complete ranking refresh completed')
        } else {
          console.error('❌ Complete ranking refresh failed:', result.error)
          this.stats.errors++
        }
      } catch (error) {
        console.error('❌ Complete refresh schedule error:', error)
        this.stats.errors++
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    })

    this.jobs.set('completeRefresh', job)
    console.log('📅 Scheduled complete refresh (Sundays at 3 AM UTC)')
  }

  // 🚀 Health check every hour
  scheduleHealthCheck() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        const stats = await getRankingStats()
        
        if (stats.error) {
          console.error('❌ Ranking health check failed:', stats.error)
          this.stats.errors++
        } else {
          // Log health status
          console.log('💓 Ranking system health:', {
            coverage: stats.rankingCoverage,
            weeklyActive: stats.weeklyActiveUsers,
            monthlyActive: stats.monthlyActiveUsers
          })

          // Alert if coverage is low
          if (parseFloat(stats.rankingCoverage) < 90) {
            console.warn('⚠️  Low ranking coverage detected:', stats.rankingCoverage)
          }
        }
      } catch (error) {
        console.error('❌ Health check schedule error:', error)
        this.stats.errors++
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    })

    this.jobs.set('healthCheck', job)
    console.log('📅 Scheduled health checks (every hour)')
  }

  // 🚀 Run initial update when server starts
  async runInitialUpdate() {
    try {
      console.log('🚀 Running initial ranking update...')
      
      // Check if rankings exist
      const stats = await getRankingStats()
      
      if (!stats.error && stats.rankingCoverage && parseFloat(stats.rankingCoverage) < 50) {
        console.log('⚠️  Low ranking coverage detected, running complete refresh...')
        await refreshAllRankings()
      } else {
        console.log('✅ Ranking coverage looks good, running quick update...')
        await updateAllRankings('global')
        await calculateRankChanges()
      }
      
      console.log('✅ Initial ranking update completed')
    } catch (error) {
      console.error('❌ Initial ranking update failed:', error)
      this.stats.errors++
    }
  }

  // 🚀 Manual triggers for testing/maintenance
  async triggerUpdate(type = 'all') {
    try {
      console.log(`🔄 Manual trigger: ${type}`)
      
      switch (type) {
        case 'global':
          return await updateAllRankings('global')
        case 'weekly':
          return await updateAllRankings('weekly')
        case 'monthly':
          return await updateAllRankings('monthly')
        case 'changes':
          return await calculateRankChanges()
        case 'snapshot':
          return await saveRankingSnapshot()
        case 'complete':
          return await refreshAllRankings()
        default:
          return await updateAllRankings('all')
      }
    } catch (error) {
      console.error(`❌ Manual trigger failed (${type}):`, error)
      return { success: false, error: error.message }
    }
  }

  // 🚀 Get scheduler status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeJobs: Array.from(this.jobs.keys()),
      stats: this.stats,
      nextRuns: this.getNextRuns()
    }
  }

  // 🚀 Get next run times for all jobs
  getNextRuns() {
    const nextRuns = {}
    this.jobs.forEach((job, name) => {
      if (job.nextDate) {
        nextRuns[name] = job.nextDate().toISOString()
      }
    })
    return nextRuns
  }

  // 🚀 Stop all scheduled jobs
  stop() {
    console.log('🛑 Stopping ranking scheduler...')
    
    this.jobs.forEach((job, name) => {
      job.stop()
      console.log(`✅ Stopped ${name} job`)
    })
    
    this.jobs.clear()
    this.isInitialized = false
    console.log('✅ Ranking scheduler stopped')
  }

  // 🚀 Restart all scheduled jobs
  restart() {
    console.log('🔄 Restarting ranking scheduler...')
    this.stop()
    this.init()
  }
}

// 🚀 Singleton instance
const rankingScheduler = new RankingScheduler()

module.exports = {
  rankingScheduler,
  RankingScheduler
}