// scripts/update-rankings.js
const cron = require('node-cron')
const { 
  updateRankings, 
  calculateRankChanges, 
  saveRankingSnapshot 
} = require('../src/services/levelSystem')

// Update all-time rankings every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running hourly all-time ranking update...')
  try {
    await updateRankings('all')
    console.log('Hourly ranking update completed')
  } catch (error) {
    console.error('Hourly ranking update failed:', error)
  }
})

// Update weekly/monthly rankings and save snapshots every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily ranking updates...')
  
  try {
    // Update all ranking types
    await updateRankings('all')
    await updateRankings('weekly') 
    await updateRankings('monthly')
    
    // Calculate rank changes
    await calculateRankChanges()
    
    // Save snapshot for historical tracking
    await saveRankingSnapshot()
    
    console.log('Daily ranking update completed successfully')
  } catch (error) {
    console.error('Daily ranking update failed:', error)
  }
})

// Update weekly rankings every Monday at 1 AM
cron.schedule('0 1 * * 1', async () => {
  console.log('Running weekly ranking reset...')
  
  try {
    await updateRankings('weekly')
    await calculateRankChanges()
    console.log('Weekly ranking reset completed')
  } catch (error) {
    console.error('Weekly ranking reset failed:', error)
  }
})

// Update monthly rankings on the 1st of each month at 2 AM
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily ranking updates...')
  
  try {
    // Update all ranking types
    await updateRankings('all')
    await updateRankings('weekly') 
    await updateRankings('monthly')
    
    // Calculate all rank changes (global, weekly, monthly)
    await calculateRankChanges() // existing global rank changes
    await calculatePeriodRankChanges() // new weekly/monthly rank changes
    
    // Save snapshot for historical tracking
    await saveRankingSnapshot()
    
    console.log('Daily ranking update completed successfully')
  } catch (error) {
    console.error('Daily ranking update failed:', error)
  }
})

console.log('Ranking update cron jobs initialized')

// Manual ranking update function for testing
const runManualUpdate = async () => {
  console.log('Running manual ranking update...')
  
  try {
    console.log('Updating all-time rankings...')
    await updateRankings('all')
    
    console.log('Updating weekly rankings...')
    await updateRankings('weekly')
    
    console.log('Updating monthly rankings...')
    await updateRankings('monthly')
    
    console.log('Calculating rank changes...')
    await calculateRankChanges()
    
    console.log('Manual ranking update completed successfully')
  } catch (error) {
    console.error('Manual ranking update failed:', error)
    throw error
  }
}

// Export for testing
module.exports = { runManualUpdate }

// If running this file directly
if (require.main === module) {
  runManualUpdate()
    .then(() => {
      console.log('Manual update completed, exiting...')
      process.exit(0)
    })
    .catch(err => {
      console.error('Update failed:', err)
      process.exit(1)
    })
}