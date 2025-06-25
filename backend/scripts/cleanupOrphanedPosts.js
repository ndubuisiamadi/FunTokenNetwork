// scripts/cleanupOrphanedPosts.js
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupOrphanedPosts() {
  try {
    console.log('Starting orphaned posts cleanup...')

    // Find posts with non-existent users
    const orphanedPosts = await prisma.post.findMany({
      where: {
        user: null
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        userId: true
      }
    })

    console.log(`Found ${orphanedPosts.length} orphaned posts`)

    if (orphanedPosts.length === 0) {
      console.log('No orphaned posts found. Database is clean!')
      return
    }

    // Log details of orphaned posts before deletion
    orphanedPosts.forEach(post => {
      console.log(`Orphaned post: ${post.id} - UserId: ${post.userId} - Created: ${post.createdAt}`)
    })

    // Delete orphaned posts
    const deleteResult = await prisma.post.deleteMany({
      where: {
        user: null
      }
    })

    console.log(`Successfully deleted ${deleteResult.count} orphaned posts`)

    // Verify cleanup
    const remainingOrphans = await prisma.post.count({
      where: {
        user: null
      }
    })

    if (remainingOrphans === 0) {
      console.log('✅ Cleanup completed successfully!')
    } else {
      console.log(`⚠️ Warning: ${remainingOrphans} orphaned posts still remain`)
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupOrphanedPosts()
}

module.exports = cleanupOrphanedPosts