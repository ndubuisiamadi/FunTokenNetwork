// scripts/check-email-duplicates.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkEmailDuplicates() {
  try {
    console.log('🔍 Checking for duplicate emails...')
    
    // Get all users with emails (excluding nulls)
    const users = await prisma.user.findMany({
      where: {
        email: {
          not: null
        }
      },
      select: {
        id: true,
        username: true,
        email: true
      }
    })

    console.log(`Found ${users.length} users with emails`)

    // Group by email to find duplicates
    const emailGroups = {}
    users.forEach(user => {
      if (!emailGroups[user.email]) {
        emailGroups[user.email] = []
      }
      emailGroups[user.email].push(user)
    })

    // Find duplicates
    const duplicates = Object.entries(emailGroups).filter(([email, users]) => users.length > 1)

    if (duplicates.length > 0) {
      console.log('❌ Found duplicate emails:')
      duplicates.forEach(([email, users]) => {
        console.log(`  ${email}: ${users.map(u => u.username).join(', ')}`)
      })
    } else {
      console.log('✅ No duplicate emails found!')
    }

    // Show placeholder emails
    const placeholderUsers = users.filter(u => u.email?.includes('@legacy.placeholder.local'))
    if (placeholderUsers.length > 0) {
      console.log(`\n📝 Found ${placeholderUsers.length} users with placeholder emails:`)
      placeholderUsers.forEach(user => {
        console.log(`  ${user.username}: ${user.email}`)
      })
    }

  } catch (error) {
    console.error('❌ Error checking duplicates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  checkEmailDuplicates()
}

module.exports = { checkEmailDuplicates }