// scripts/add-profile-completed-field.js
// Run this script to add the profileCompleted field to existing users

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addProfileCompletedField() {
  try {
    console.log('🔄 Starting migration to add profileCompleted field...')

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true
      }
    })

    console.log(`📊 Found ${users.length} users to update`)

    let updatedCount = 0
    let alreadyCompletedCount = 0

    // Update users with profileCompleted status
    for (const user of users) {
      const hasCompletedProfile = user.firstName && user.lastName
      
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          profileCompleted: hasCompletedProfile 
        }
      })

      if (hasCompletedProfile) {
        alreadyCompletedCount++
        console.log(`✅ ${user.username} - Profile already completed`)
      } else {
        console.log(`⏳ ${user.username} - Profile incomplete`)
      }
      
      updatedCount++
    }

    console.log(`\n📈 Migration Summary:`)
    console.log(`   Total users updated: ${updatedCount}`)
    console.log(`   Users with completed profiles: ${alreadyCompletedCount}`)
    console.log(`   Users with incomplete profiles: ${updatedCount - alreadyCompletedCount}`)
    console.log(`\n✅ Migration completed successfully!`)

    // Note about existing referrals
    if (alreadyCompletedCount > 0) {
      console.log(`\n⚠️  IMPORTANT NOTE:`)
      console.log(`   ${alreadyCompletedCount} users already have completed profiles.`)
      console.log(`   Any referral rewards for these users were already processed during registration.`)
      console.log(`   This change only affects NEW signups going forward.`)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
if (require.main === module) {
  addProfileCompletedField()
    .then(() => {
      console.log('🎉 Migration script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error)
      process.exit(1)
    })
}

module.exports = { addProfileCompletedField }