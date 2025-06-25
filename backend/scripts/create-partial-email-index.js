// scripts/create-partial-email-index.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createPartialEmailIndex() {
  try {
    console.log('🔧 Creating partial unique index for emails...')
    
    // Drop any existing email index
    try {
      await prisma.$runCommandRaw({
        dropIndex: 'users',
        index: 'users_email_key'
      })
      console.log('✅ Dropped existing email index')
    } catch (error) {
      console.log('ℹ️ No existing email index to drop')
    }
    
    // Create partial unique index (only for non-null emails)
    await prisma.$runCommandRaw({
      createIndex: 'users',
      index: {
        key: { email: 1 },
        name: 'users_email_unique',
        unique: true,
        partialFilterExpression: { email: { $ne: null } }
      }
    })
    
    console.log('✅ Created partial unique index for emails')
    console.log('This index only applies to non-null emails')

  } catch (error) {
    console.error('❌ Error creating index:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createPartialEmailIndex()
}