// scripts/cleanup-placeholder-emails.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanupPlaceholderEmails() {
  try {
    console.log('🧹 Cleaning up placeholder emails...')
    
    // Find users with placeholder emails
    const placeholderUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: '@legacy.placeholder.local'
        }
      },
      select: {
        id: true,
        username: true,
        email: true
      }
    })

    console.log(`Found ${placeholderUsers.length} users with placeholder emails`)

    if (placeholderUsers.length > 0) {
      // Set their emails to null and mark them as legacy users
      await prisma.user.updateMany({
        where: {
          email: {
            contains: '@legacy.placeholder.local'
          }
        },
        data: {
          email: null,
          emailRequired: false,
          isEmailVerified: false
        }
      })

      console.log('✅ Cleaned up placeholder emails')
      console.log('These users are now legacy users without email requirements')
    }

  } catch (error) {
    console.error('❌ Error cleaning up:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  cleanupPlaceholderEmails()
}

module.exports = { cleanupPlaceholderEmails }