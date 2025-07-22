// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')
  console.log('📝 Creating admin accounts...')

  try {
    // Helper function to generate referral code
    const generateReferralCode = (username) => {
      const timestamp = Date.now().toString(36)
      const random = Math.random().toString(36).substring(2, 6)
      return `${username.substring(0, 4).toUpperCase()}${timestamp}${random}`.toUpperCase()
    }

    // 1. Create Super Admin Account
    const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 12)
    const superAdminCode = generateReferralCode('superadmin')
    
    const superAdmin = await prisma.user.upsert({
      where: { username: 'superadmin' },
      update: {
        // Update password if user exists
        password: superAdminPassword,
        role: 'super_admin',
        isEmailVerified: true,
        profileCompleted: true
      },
      create: {
        username: 'superadmin',
        email: 'admin@funnetwork.com',
        password: superAdminPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        isEmailVerified: true,
        profileCompleted: true,
        referralCode: superAdminCode,
        gumballs: 10000, // Give some initial gumballs
        level: 'Master'
      }
    })

    // 2. Create Regular Admin Account  
    const adminPassword = await bcrypt.hash('Admin123!', 12)
    const adminCode = generateReferralCode('admin')
    
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        // Update password if user exists
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true,
        profileCompleted: true
      },
      create: {
        username: 'admin',
        email: 'moderator@funnetwork.com',
        password: adminPassword,
        firstName: 'Platform',
        lastName: 'Admin',
        role: 'admin',
        isEmailVerified: true,
        profileCompleted: true,
        referralCode: adminCode,
        gumballs: 5000,
        level: 'Expert'
      }
    })

    // 3. Create Test Admin (for development)
    const testAdminPassword = await bcrypt.hash('test123', 12)
    const testAdminCode = generateReferralCode('testadmin')
    
    const testAdmin = await prisma.user.upsert({
      where: { username: 'testadmin' },
      update: {
        password: testAdminPassword,
        role: 'admin',
        isEmailVerified: true,
        profileCompleted: true
      },
      create: {
        username: 'testadmin',
        email: 'test@funnetwork.com',
        password: testAdminPassword,
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        isEmailVerified: true,
        profileCompleted: true,
        referralCode: testAdminCode,
        gumballs: 1000,
        level: 'Advanced'
      }
    })

    console.log('✅ Admin accounts created successfully!')
    console.log('🎯 === ADMIN CREDENTIALS ===')
    console.log('┌─────────────────────────────────────┐')
    console.log('│ SUPER ADMIN                         │')
    console.log('│ Username: superadmin                │')
    console.log('│ Password: SuperAdmin123!            │')
    console.log('│ Email: admin@funnetwork.com         │')
    console.log('│ Role: super_admin                   │')
    console.log('├─────────────────────────────────────┤')
    console.log('│ REGULAR ADMIN                       │')
    console.log('│ Username: admin                     │')
    console.log('│ Password: Admin123!                 │')
    console.log('│ Email: moderator@funnetwork.com     │')
    console.log('│ Role: admin                         │')
    console.log('├─────────────────────────────────────┤')
    console.log('│ TEST ADMIN (Development)            │')
    console.log('│ Username: testadmin                 │')
    console.log('│ Password: test123                   │')
    console.log('│ Email: test@funnetwork.com          │')
    console.log('│ Role: admin                         │')
    console.log('└─────────────────────────────────────┘')
    console.log('💡 Use any of these accounts to access the admin dashboard')

    // Log account details for reference
    console.log(`📊 Super Admin ID: ${superAdmin.id}`)
    console.log(`📊 Admin ID: ${admin.id}`)
    console.log(`📊 Test Admin ID: ${testAdmin.id}`)

  } catch (error) {
    console.error('❌ Error creating admin accounts:', error)
    
    if (error.code === 'P2002') {
      console.log('💡 Admin accounts may already exist. Check database.')
    }
    
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed process failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    console.log('🔌 Disconnecting from database...')
    await prisma.$disconnect()
    console.log('✅ Seed process completed!')
  })