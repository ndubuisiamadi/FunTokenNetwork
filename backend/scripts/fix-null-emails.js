// scripts/fix-null-emails.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixNullEmails() {
  try {
    console.log('🔧 Fixing all null emails before applying unique constraint...')
    
    // Find all users with null emails
    const usersWithNullEmail = await prisma.user.findMany({
      where: { email: null },
      select: { id: true, username: true, email: true }
    })
    
    console.log(`Found ${usersWithNullEmail.length} users with null emails`)
    
    if (usersWithNullEmail.length === 0) {
      console.log('✅ No null emails found!')
      return
    }
    
    // Update each user with a unique placeholder email
    for (let i = 0; i < usersWithNullEmail.length; i++) {
      const user = usersWithNullEmail[i]
      const timestamp = Date.now() + i // Add index to ensure uniqueness
      const placeholderEmail = `legacy.${user.username.replace('.fun', '').replace(/[^a-z0-9]/g, '')}.${timestamp}@placeholder.local`
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: placeholderEmail,
          emailRequired: false,
          isEmailVerified: false
        }
      })
      
      console.log(`  ✅ ${user.username} → ${placeholderEmail}`)
    }
    
    console.log('\n🎉 All null emails fixed!')
    
    // Verify no null emails remain
    const remainingNullEmails = await prisma.user.count({
      where: { email: null }
    })
    
    if (remainingNullEmails > 0) {
      throw new Error(`Still have ${remainingNullEmails} null emails!`)
    }
    
    console.log('✅ Verified: No null emails remain')
    console.log('You can now run: npx prisma db push')

  } catch (error) {
    console.error('❌ Error fixing null emails:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  fixNullEmails()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}