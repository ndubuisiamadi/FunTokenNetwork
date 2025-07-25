// scripts/migration-fix-status.js - FIXED VERSION
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateMessageStatus() {
  console.log('🔄 Starting message status migration...')
  
  try {
    // Check if status field exists in schema
    console.log('🔍 Checking database schema...')
    
    // Get a sample message to see current schema
    const sampleMessage = await prisma.message.findFirst()
    console.log('📝 Sample message fields:', sampleMessage ? Object.keys(sampleMessage) : 'No messages found')
    
    // Step 1: Count existing messages
    const totalMessages = await prisma.message.count()
    console.log(`📊 Found ${totalMessages} existing messages`)
    
    if (totalMessages === 0) {
      console.log('✅ No messages to migrate')
      return
    }
    
    // Step 2: Update messages based on old deliveryStatus field (if it exists)
    console.log('📝 Migrating message status...')
    
    try {
      // Try to update all messages to have 'sent' status as default
      const updateResult = await prisma.message.updateMany({
        data: {
          status: 'sent'
        }
      })
      
      console.log(`✅ Updated ${updateResult.count} messages with 'sent' status`)
      
    } catch (updateError) {
      console.error('❌ Error updating messages:', updateError.message)
      
      // If status field doesn't exist, user needs to update schema first
      if (updateError.message.includes('status')) {
        console.log('')
        console.log('🚨 SCHEMA UPDATE REQUIRED:')
        console.log('1. Update your prisma/schema.prisma file with the new Message model')
        console.log('2. Run: npx prisma db push')
        console.log('3. Then run this migration script again')
        console.log('')
        return
      }
      
      throw updateError
    }
    
    // Step 3: Verify migration
    const messagesWithStatus = await prisma.message.count({
      where: {
        status: {
          in: ['sending', 'sent', 'delivered', 'read', 'failed']
        }
      }
    })
    
    console.log(`📊 Total messages: ${totalMessages}`)
    console.log(`📊 Messages with valid status: ${messagesWithStatus}`)
    
    if (totalMessages === messagesWithStatus) {
      console.log('✅ Migration completed successfully!')
      console.log('')
      console.log('🎯 Next steps:')
      console.log('1. Restart your backend server')
      console.log('2. Deploy updated frontend code')
      console.log('3. Test message status indicators')
    } else {
      console.log('⚠️  Some messages may need manual status assignment')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('')
    console.log('🔧 Troubleshooting:')
    console.log('1. Make sure your database is running')
    console.log('2. Check that schema.prisma has been updated')
    console.log('3. Run: npx prisma db push')
    console.log('4. Try the migration again')
  } finally {
    await prisma.$disconnect()
  }
}

// Additional utility function to check current schema
async function checkCurrentSchema() {
  console.log('🔍 Checking current message schema...')
  
  try {
    const sampleMessage = await prisma.message.findFirst()
    
    if (sampleMessage) {
      console.log('📋 Current message fields:')
      Object.keys(sampleMessage).forEach(field => {
        console.log(`  - ${field}: ${typeof sampleMessage[field]}`)
      })
    } else {
      console.log('📋 No messages found - will check schema definition')
    }
    
    // Try to access status field specifically
    try {
      await prisma.message.findMany({
        select: { status: true },
        take: 1
      })
      console.log('✅ Status field exists in schema')
    } catch (error) {
      console.log('❌ Status field missing from schema')
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Run based on command line argument
if (require.main === module) {
  const command = process.argv[2]
  
  if (command === 'check') {
    checkCurrentSchema()
  } else {
    migrateMessageStatus()
  }
}

module.exports = { migrateMessageStatus, checkCurrentSchema }