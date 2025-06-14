// scripts/add-rank-change-fields.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function addRankChangeFields() {
  try {
    console.log('Adding rank change fields to existing users...')
    
    // Update all existing users to have default rank change values
    await prisma.user.updateMany({
      data: {
        weeklyRankChange: 0,
        monthlyRankChange: 0
      }
    })
    
    console.log('✅ Successfully added rank change fields')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  addRankChangeFields()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}