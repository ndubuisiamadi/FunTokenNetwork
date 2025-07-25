const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateMessages() {
  console.log('🚀 Migrating messages...')
  
  // Just backfill the new fields for existing messages
  const conversations = await prisma.conversation.findMany({
    select: { id: true }
  })

  for (const conv of conversations) {
    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    })

    // Give each message a sequence number
    for (let i = 0; i < messages.length; i++) {
      await prisma.message.update({
        where: { id: messages[i].id },
        data: {
          sequenceNumber: i + 1,
          status: 'read', // existing messages are "delivered"
        }
      })
    }

    // Update conversation sequence counter
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { lastSequenceNumber: messages.length }
    })
    
    console.log(`✅ Updated ${messages.length} messages in conversation ${conv.id}`)
  }
  
  console.log('🎉 Migration complete!')
  await prisma.$disconnect()
}

migrateMessages().catch(console.error)