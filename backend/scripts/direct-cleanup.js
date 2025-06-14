// backend/scripts/direct-cleanup.js
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const directCleanup = async () => {
  try {
    console.log('Starting direct cleanup...')
    
    // Get all user IDs first
    const users = await prisma.user.findMany({ select: { id: true } })
    const userIds = users.map(u => u.id)
    console.log(`Found ${userIds.length} existing users`)
    
    // Delete friend requests where sender doesn't exist
    const deletedSenders = await prisma.friendRequest.deleteMany({
      where: {
        senderId: {
          notIn: userIds
        }
      }
    })
    console.log(`Deleted ${deletedSenders.count} requests with missing senders`)
    
    // Delete friend requests where receiver doesn't exist  
    const deletedReceivers = await prisma.friendRequest.deleteMany({
      where: {
        receiverId: {
          notIn: userIds
        }
      }
    })
    console.log(`Deleted ${deletedReceivers.count} requests with missing receivers`)
    
    const totalDeleted = deletedSenders.count + deletedReceivers.count
    console.log(`Total deleted: ${totalDeleted} orphaned friend requests`)
    
    // Test if we can now fetch requests with includes
    console.log('Testing fetch with includes...')
    const testRequests = await prisma.friendRequest.findMany({
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } }
      },
      take: 3
    })
    
    console.log(`✅ Success! Can now fetch ${testRequests.length} requests with includes`)
    console.log('Cleanup completed successfully!')
    
  } catch (error) {
    console.error('Direct cleanup failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

directCleanup()