// backend/scripts/seedTasks.js
// Task Creation and Seeder Utility

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

class TaskSeeder {
  async createPlatforms() {
    console.log('🔧 Creating platforms...')
    
    const platforms = [
      {
        name: 'Twitter',
        iconUrl: '/src/assets/x-logo.png',
        isActive: true
      },
      {
        name: 'YouTube',
        iconUrl: '/src/assets/youtube-logo.png',
        isActive: true
      },
      {
        name: 'Telegram',
        iconUrl: '/src/assets/telegram-logo.png',
        isActive: true
      }
    ]

    for (const platform of platforms) {
      await prisma.platform.upsert({
        where: { name: platform.name },
        update: platform,
        create: platform
      })
      console.log(`✅ Created/updated platform: ${platform.name}`)
    }
    
    return await prisma.platform.findMany()
  }

  async createSampleTasks() {
    console.log('🔧 Creating sample tasks...')
    
    const platforms = await prisma.platform.findMany()
    const twitterPlatform = platforms.find(p => p.name === 'Twitter')
    const youtubePlatform = platforms.find(p => p.name === 'YouTube')
    const telegramPlatform = platforms.find(p => p.name === 'Telegram')

    const sampleTasks = [
      // Twitter Tasks
      {
        platformId: twitterPlatform.id,
        type: 'follow',
        title: 'Follow @thatdude',
        description: 'Follow @thatdude on Twitter to earn gumballs',
        target: {
          handle: '@thatdude',
          targetUsername: 'thatdude'
        },
        reward: 15000,
        difficulty: 1,
        isActive: true,
        verificationMethod: 'api'
      },
      {
        platformId: twitterPlatform.id,
        type: 'follow',
        title: 'Follow @elonmusk',
        description: 'Follow Elon Musk on Twitter',
        target: {
          handle: '@elonmusk',
          targetUsername: 'elonmusk'
        },
        reward: 25000,
        difficulty: 2,
        isActive: true,
        verificationMethod: 'api'
      },
      {
        platformId: twitterPlatform.id,
        type: 'like',
        title: 'Like Latest Post',
        description: 'Like the latest post from @thatdude',
        target: {
          handle: '@thatdude',
          tweetId: '1234567890', // Replace with actual tweet ID
          tweetUrl: 'https://twitter.com/thatdude/status/1234567890'
        },
        reward: 8000,
        difficulty: 1,
        isActive: true,
        verificationMethod: 'api'
      },
      {
        platformId: twitterPlatform.id,
        type: 'retweet',
        title: 'Retweet Announcement',
        description: 'Retweet our latest announcement',
        target: {
          handle: '@thatdude',
          tweetId: '1234567891',
          tweetUrl: 'https://twitter.com/thatdude/status/1234567891'
        },
        reward: 12000,
        difficulty: 1,
        isActive: true,
        verificationMethod: 'api'
      },

      // YouTube Tasks
      {
        platformId: youtubePlatform.id,
        type: 'subscribe',
        title: 'Subscribe to Channel',
        description: 'Subscribe to our YouTube channel',
        target: {
          handle: 'YourChannelName',
          channelId: 'UC1234567890',
          channelUrl: 'https://youtube.com/c/YourChannelName'
        },
        reward: 20000,
        difficulty: 2,
        isActive: true,
        verificationMethod: 'api' // Will need YouTube API
      },
      {
        platformId: youtubePlatform.id,
        type: 'like',
        title: 'Like Video',
        description: 'Like our latest video',
        target: {
          videoId: 'dQw4w9WgXcQ',
          videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          title: 'Amazing Content Video'
        },
        reward: 10000,
        difficulty: 1,
        isActive: true,
        verificationMethod: 'api'
      },
      {
        platformId: youtubePlatform.id,
        type: 'comment',
        title: 'Comment on Video',
        description: 'Leave a meaningful comment on our video',
        target: {
          videoId: 'dQw4w9WgXcQ',
          videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          requiredWords: ['amazing', 'great', 'awesome']
        },
        reward: 15000,
        difficulty: 3,
        isActive: true,
        verificationMethod: 'manual', // Comments need manual verification
        requirements: [
          { description: 'Comment must be at least 10 words', type: 'word_count', value: 10 },
          { description: 'Must be original content', type: 'originality', value: true }
        ]
      },

      // Telegram Tasks
      {
        platformId: telegramPlatform.id,
        type: 'join',
        title: 'Join Our Channel',
        description: 'Join our official Telegram channel',
        target: {
          handle: '@yourchannel',
          channelId: '@yourchannel',
          channelUrl: 'https://t.me/yourchannel'
        },
        reward: 18000,
        difficulty: 1,
        isActive: true,
        verificationMethod: 'api' // Will need Telegram Bot API
      },
      {
        platformId: telegramPlatform.id,
        type: 'forward',
        title: 'Forward Message',
        description: 'Forward our announcement to 3 groups',
        target: {
          messageId: '12345',
          channelId: '@yourchannel',
          requiredForwards: 3
        },
        reward: 25000,
        difficulty: 4,
        isActive: true,
        verificationMethod: 'manual',
        requirements: [
          { description: 'Must forward to active groups', type: 'group_activity', value: true },
          { description: 'Groups must have 50+ members', type: 'group_size', value: 50 }
        ]
      }
    ]

    let createdCount = 0
    for (const task of sampleTasks) {
      try {
        await prisma.task.create({ data: task })
        console.log(`✅ Created task: ${task.title}`)
        createdCount++
      } catch (error) {
        console.error(`❌ Failed to create task ${task.title}:`, error.message)
      }
    }

    console.log(`📊 Created ${createdCount} tasks successfully`)
    return createdCount
  }

  async createCustomTask(taskData) {
    console.log(`🔧 Creating custom task: ${taskData.title}`)
    
    try {
      // Validate platform exists
      const platform = await prisma.platform.findUnique({
        where: { name: taskData.platformName }
      })
      
      if (!platform) {
        throw new Error(`Platform ${taskData.platformName} not found`)
      }

      const task = await prisma.task.create({
        data: {
          ...taskData,
          platformId: platform.id,
          platformName: undefined // Remove this field
        }
      })

      console.log(`✅ Created custom task: ${task.title} (ID: ${task.id})`)
      return task
      
    } catch (error) {
      console.error(`❌ Failed to create custom task:`, error.message)
      throw error
    }
  }

  async seedAll() {
    console.log('🌱 Starting task seeding process...')
    
    try {
      await this.createPlatforms()
      await this.createSampleTasks()
      
      console.log('✅ Task seeding completed successfully!')
      
    } catch (error) {
      console.error('❌ Task seeding failed:', error)
      throw error
    } finally {
      await prisma.$disconnect()
    }
  }

  async listTasks() {
    console.log('📋 Current tasks in database:')
    
    const tasks = await prisma.task.findMany({
      include: {
        platform: true
      },
      orderBy: [
        { platform: { name: 'asc' } },
        { difficulty: 'asc' }
      ]
    })

    tasks.forEach(task => {
      const status = task.isActive ? '🟢' : '🔴'
      console.log(`${status} [${task.platform.name}] ${task.title} - ${task.reward} gumballs (Difficulty: ${task.difficulty})`)
    })

    console.log(`\n📊 Total tasks: ${tasks.length}`)
    return tasks
  }

  async clearAllTasks() {
    console.log('🗑️  Clearing all tasks...')
    
    const deleted = await prisma.task.deleteMany({})
    console.log(`✅ Deleted ${deleted.count} tasks`)
    
    return deleted.count
  }
}

// CLI Interface
async function main() {
  const seeder = new TaskSeeder()
  const command = process.argv[2]

  switch (command) {
    case 'seed':
      await seeder.seedAll()
      break
      
    case 'list':
      await seeder.listTasks()
      break
      
    case 'clear':
      await seeder.clearAllTasks()
      break
      
    case 'platforms':
      await seeder.createPlatforms()
      break
      
    case 'custom':
      // Example custom task creation
      await seeder.createCustomTask({
        platformName: 'Twitter',
        type: 'follow',
        title: 'Follow Custom Account',
        description: 'Follow a custom Twitter account',
        target: {
          handle: '@example',
          targetUsername: 'example'
        },
        reward: 20000,
        difficulty: 2,
        isActive: true,
        verificationMethod: 'api'
      })
      break
      
    default:
      console.log('📋 Available commands:')
      console.log('  node seedTasks.js seed     - Create platforms and sample tasks')
      console.log('  node seedTasks.js list     - List all current tasks')
      console.log('  node seedTasks.js clear    - Delete all tasks')
      console.log('  node seedTasks.js platforms - Create/update platforms only')
      console.log('  node seedTasks.js custom   - Create a custom task example')
      console.log('')
      console.log('Usage: node backend/scripts/seedTasks.js [command]')
  }
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = TaskSeeder