const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Create sample users
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const user1 = await prisma.user.create({
    data: {
      username: 'johndoe',
      email: 'john@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Hello, I am John!',
      gumballs: 1500,
    },
  })

  const user2 = await prisma.user.create({
    data: {
      username: 'janedoe',
      email: 'jane@example.com', 
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Doe',
      bio: 'Nice to meet you!',
      gumballs: 2500,
    },
  })

  // Create sample posts
  await prisma.post.create({
    data: {
      content: 'This is my first post!',
      postType: 'text',
      userId: user1.id,
    },
  })

  await prisma.post.create({
    data: {
      content: 'Beautiful sunset today! 🌅',
      postType: 'photo',
      mediaUrls: ['https://example.com/sunset.jpg'],
      userId: user2.id,
    },
  })

  // Create sample community
  await prisma.community.create({
    data: {
      name: 'Photography Lovers',
      description: 'A community for photography enthusiasts',
      createdById: user1.id,
      members: {
        create: [
          { userId: user1.id, role: 'owner' },
          { userId: user2.id, role: 'member' },
        ],
      },
    },
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })