// backend/src/controllers/tasks.js
// ACTUALLY WORKING MongoDB-Compatible Version

const { PrismaClient } = require('@prisma/client')
const TwitterVerificationService = require('../services/twitterVerificationService')

const prisma = new PrismaClient()
const twitterService = new TwitterVerificationService()

// Enhanced verification tracking
const activeVerifications = new Map()

// 🚀 Start a task with auto-verification
const startTask = async (req, res) => {
  try {
    const { taskId } = req.params
    const userId = req.user.id

    // Check if task exists and is active
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { platform: true }
    })

    if (!task || !task.isActive) {
      return res.status(404).json({ message: 'Task not found or inactive' })
    }

    // 🛡️ Stop any existing verification for this user-task combination
    const verificationKey = `${userId}-${taskId}`
    if (activeVerifications.has(verificationKey)) {
      const existing = activeVerifications.get(verificationKey)
      console.log(`🛑 Stopping existing verification for ${verificationKey}`)
      clearInterval(existing.intervalId)
      activeVerifications.delete(verificationKey)
    }

    // Check existing user task
    const existingUserTask = await prisma.userTask.findUnique({
      where: { userId_taskId: { userId, taskId } }
    })

    if (existingUserTask) {
      if (existingUserTask.status === 'completed') {
        return res.status(400).json({ 
          message: 'Task already completed',
          status: existingUserTask.status 
        })
      } else if (existingUserTask.status === 'in_progress') {
        return res.status(400).json({ 
          message: 'Task already in progress',
          status: existingUserTask.status 
        })
      }
    }

    // Create or update user task
    const userTask = await prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId } },
      create: {
        userId,
        taskId,
        status: 'in_progress',
        startedAt: new Date()
      },
      update: {
        status: 'in_progress',
        startedAt: new Date(),
        completedAt: null,
        verificationData: null
      }
    })

    console.log(`🚀 User ${userId} started task ${taskId}`)

    // Start auto-verification if enabled
    if (process.env.AUTO_VERIFY_TASKS !== 'false') {
      setTimeout(() => {
        startAutoVerificationProcess(userId, taskId)
      }, 1000)
    }

    res.json({
      success: true,
      message: 'Task started successfully!',
      task,
      userTask,
      autoVerifyEnabled: process.env.AUTO_VERIFY_TASKS !== 'false',
      instructions: task.type === 'follow' 
        ? `Please follow @${task.target.username} on Twitter. We'll automatically check for completion!`
        : `Please complete the ${task.type} action. We'll automatically check for completion!`
    })

  } catch (error) {
    console.error('Start task error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    })
  }
}

// 🔄 Auto-verification process
const startAutoVerificationProcess = async (userId, taskId) => {
  const verificationKey = `${userId}-${taskId}`
  
  if (activeVerifications.has(verificationKey)) {
    console.log(`⚠️ Verification already active for ${verificationKey}, skipping`)
    return
  }

  console.log(`🔄 Starting auto-verification for ${verificationKey}`)
  
  const maxAttempts = 12
  const interval = 5000
  let attempts = 0
  let isCompleted = false

  activeVerifications.set(verificationKey, {
    userId,
    taskId,
    intervalId: null,
    attempts: 0,
    startTime: Date.now(),
    maxAttempts,
    completed: false
  })

  const intervalId = setInterval(async () => {
    const verification = activeVerifications.get(verificationKey)
    if (!verification || verification.completed || isCompleted) {
      console.log(`✅ Verification ${verificationKey} already completed, stopping`)
      clearInterval(intervalId)
      activeVerifications.delete(verificationKey)
      return
    }

    attempts++
    verification.attempts = attempts
    console.log(`🔍 Auto-verification attempt ${attempts}/${maxAttempts} for ${verificationKey}`)

    try {
      // Quick status check
      const quickCheck = await prisma.userTask.findUnique({
        where: { userId_taskId: { userId, taskId } },
        select: { status: true }
      })

      if (!quickCheck || quickCheck.status !== 'in_progress') {
        console.log(`🛑 Task ${verificationKey} status changed to ${quickCheck?.status}, stopping verification`)
        isCompleted = true
        verification.completed = true
        clearInterval(intervalId)
        activeVerifications.delete(verificationKey)
        return
      }

      // Perform verification
      const result = await performTaskVerification(userId, taskId)
      
      if (result.verified) {
        isCompleted = true
        verification.completed = true
        clearInterval(intervalId)
        activeVerifications.delete(verificationKey)
        
        console.log(`✅ Auto-verification successful for ${verificationKey}`)
        await completeTaskSimple(userId, taskId, result, true)
        return
      }

      if (attempts >= maxAttempts) {
        console.log(`⏰ Auto-verification timeout for ${verificationKey}`)
        isCompleted = true
        verification.completed = true
        clearInterval(intervalId)
        activeVerifications.delete(verificationKey)
        
        await failTaskSimple(userId, taskId, 'Auto-verification timeout after 1 minute')
        return
      }

    } catch (error) {
      console.error(`❌ Auto-verification error for ${verificationKey}:`, error)
      
      if (attempts >= maxAttempts) {
        isCompleted = true
        verification.completed = true
        clearInterval(intervalId)
        activeVerifications.delete(verificationKey)
        await failTaskSimple(userId, taskId, `Verification error: ${error.message}`)
      }
    }
  }, interval)

  activeVerifications.get(verificationKey).intervalId = intervalId

  // Safety cleanup
  setTimeout(() => {
    const verification = activeVerifications.get(verificationKey)
    if (verification && !verification.completed) {
      console.log(`🧹 Safety cleanup: Auto-verification timeout for ${verificationKey}`)
      clearInterval(verification.intervalId)
      activeVerifications.delete(verificationKey)
      isCompleted = true
    }
  }, (maxAttempts * interval) + 15000)
}

// ✅ SIMPLE Complete task - MongoDB compatible, no fancy isolation levels
const completeTaskSimple = async (userId, taskId, verificationResult, autoVerified = false) => {
  try {
    console.log(`🎯 Completing task ${taskId} for user ${userId}`)

    // 🛡️ Use simple MongoDB transaction (no isolation level!)
    const result = await prisma.$transaction(async (prisma) => {
      // Check if already completed first
      const currentUserTask = await prisma.userTask.findUnique({
        where: { userId_taskId: { userId, taskId } },
        include: { task: true }
      })

      if (!currentUserTask) {
        throw new Error('Task not found')
      }

      if (currentUserTask.status === 'completed') {
        console.log(`⚠️ Task ${taskId} already completed for user ${userId}`)
        return {
          success: true,
          verified: true,
          reward: 0,
          userTask: currentUserTask,
          alreadyCompleted: true
        }
      }

      if (currentUserTask.status !== 'in_progress') {
        throw new Error(`Task status is ${currentUserTask.status}, cannot complete`)
      }

      // Update task status
      const updatedUserTask = await prisma.userTask.update({
        where: { userId_taskId: { userId, taskId } },
        data: {
          status: 'completed',
          completedAt: new Date(),
          verificationData: {
            ...verificationResult,
            verifiedAt: new Date(),
            method: 'user_centric',
            autoVerified
          }
        },
        include: { task: true }
      })

      const task = updatedUserTask.task

      // Award gumballs
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          gumballs: {
            increment: task.reward
          }
        }
      })

      // Create history record
      const currentDate = new Date()
      const week = getISOWeek(currentDate)
      const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

      const historyRecord = await prisma.gumballHistory.create({
        data: {
          userId,
          gumballs: updatedUser.gumballs,
          change: task.reward,
          reason: autoVerified ? 'task_auto_completed' : 'task_completed',
          week,
          month
        }
      })

      console.log(`💰 Awarded ${task.reward} gumballs to user ${userId}. Total: ${updatedUser.gumballs}`)

      return {
        success: true,
        verified: true,
        reward: task.reward,
        userTask: updatedUserTask,
        rewardData: {
          newTotal: updatedUser.gumballs,
          awarded: task.reward,
          historyId: historyRecord.id
        },
        autoVerified,
        alreadyCompleted: false
      }
    }, {
      timeout: 10000  // ✅ Only timeout, no isolation level for MongoDB
    })

    return result

  } catch (error) {
    console.error('Complete task error:', error)
    
    // Handle specific MongoDB errors
    if (error.message.includes('already completed')) {
      console.log(`⚠️ Task ${taskId} completion attempted multiple times for user ${userId}`)
      return {
        success: true,
        verified: true,
        reward: 0,
        alreadyCompleted: true
      }
    }
    
    throw error
  }
}

// ❌ Simple fail task
const failTaskSimple = async (userId, taskId, reason) => {
  try {
    const updatedUserTask = await prisma.userTask.update({
      where: { userId_taskId: { userId, taskId } },
      data: {
        status: 'failed',
        verificationData: {
          verified: false,
          reason,
          failedAt: new Date(),
          method: 'user_centric_auto'
        }
      },
      include: { task: true }
    })

    console.log(`❌ Task ${taskId} failed for user ${userId}: ${reason}`)

    return {
      success: false,
      verified: false,
      reason,
      userTask: updatedUserTask,
      canRetry: true
    }

  } catch (error) {
    console.error('Fail task error:', error)
    return {
      success: false,
      verified: false,
      reason: `${reason} (update failed: ${error.message})`,
      canRetry: true
    }
  }
}

// 📊 Get task status
const getTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params
    const userId = req.user.id

    const userTask = await prisma.userTask.findUnique({
      where: { userId_taskId: { userId, taskId } },
      include: { 
        task: {
          include: { platform: true }
        }
      }
    })

    if (!userTask) {
      return res.json({
        success: true,
        status: 'available',
        task: null,
        progress: null
      })
    }

    const verificationKey = `${userId}-${taskId}`
    const activeVerification = activeVerifications.get(verificationKey)
    
    let progress = null
    if (activeVerification && userTask.status === 'in_progress') {
      const elapsed = Date.now() - activeVerification.startTime
      const progressPercent = Math.min((elapsed / 60000) * 100, 100)
      
      progress = {
        percent: Math.round(progressPercent),
        attempts: activeVerification.attempts,
        maxAttempts: activeVerification.maxAttempts,
        timeRemaining: Math.max(0, 60 - Math.floor(elapsed / 1000))
      }
    }

    res.json({
      success: true,
      status: userTask.status,
      task: userTask.task,
      userTask,
      progress,
      autoVerified: userTask.verificationData?.autoVerified || false,
      completedAt: userTask.completedAt,
      reward: userTask.status === 'completed' ? userTask.task.reward : null
    })

  } catch (error) {
    console.error('Get task status error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Failed to get task status',
      error: error.message 
    })
  }
}

// 🔍 Perform actual task verification
const performTaskVerification = async (userId, taskId) => {
  const userTask = await prisma.userTask.findUnique({
    where: { userId_taskId: { userId, taskId } },
    include: { 
      task: true, 
      user: { select: { twitterUserId: true } } 
    }
  })

  if (!userTask || !userTask.user.twitterUserId) {
    throw new Error('Twitter setup required')
  }

  const task = userTask.task
  const targetUsername = task.target.username

  console.log(`🔍 Verifying: User ${userTask.user.twitterUserId} → @${targetUsername}`)

  const verificationResult = await twitterService.verifyUserFollowsTarget(
    userTask.user.twitterUserId,
    targetUsername
  )

  return verificationResult
}

// Other existing functions remain the same...
const setupUserTwitterId = async (req, res) => {
  try {
    const { twitterId } = req.body
    const userId = req.user.id

    if (!twitterId || !/^\d+$/.test(twitterId)) {
      return res.status(400).json({ 
        message: 'Invalid Twitter ID format. Must be numeric.',
        example: '44196397'
      })
    }

    console.log(`🔍 Validating Twitter ID ${twitterId} for user ${userId}`)
    const validation = await twitterService.validateUserTwitterId(twitterId)

    if (!validation.valid) {
      return res.status(400).json({
        message: 'Twitter ID validation failed',
        error: validation.message,
        suggestion: 'Please check your Twitter ID or make sure your account is public'
      })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { 
        twitterUserId: twitterId,
        twitterSetupAt: new Date()
      }
    })

    res.json({
      message: 'Twitter ID setup successful!',
      twitterId,
      followingCount: validation.followingCount,
      setupComplete: true
    })

  } catch (error) {
    console.error('Twitter ID setup error:', error)
    res.status(500).json({ 
      message: 'Failed to setup Twitter ID',
      error: error.message 
    })
  }
}

const checkTwitterSetup = async (req, res) => {
  try {
    const userId = req.user.id
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        twitterUserId: true, 
        twitterSetupAt: true
      }
    })

    const hasSetup = !!user.twitterUserId

    res.json({
      hasSetup,
      twitterId: user.twitterUserId,
      setupAt: user.twitterSetupAt
    })

  } catch (error) {
    console.error('Twitter setup check error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const createTask = async (req, res) => {
  try {
    const { targetUsername, type, title, description, reward, difficulty } = req.body

    console.log(`📝 Creating ${type} task for @${targetUsername}`)

    let platform = await prisma.platform.findUnique({
      where: { name: 'Twitter' }
    })

    if (!platform) {
      platform = await prisma.platform.create({
        data: {
          name: 'Twitter',
          iconUrl: '/src/assets/x-logo.png',
          isActive: true
        }
      })
    }

    const task = await prisma.task.create({
      data: {
        platformId: platform.id,
        type,
        title: title || `${type} @${targetUsername}`,
        description: description || `${type} @${targetUsername} on Twitter`,
        target: {
          username: targetUsername,
          handle: `@${targetUsername}`
        },
        reward: reward || 15000,
        currency: 'Gumballs',
        difficulty: difficulty || 2,
        isActive: true
      },
      include: {
        platform: true
      }
    })

    console.log(`✅ Task created: ${task.id}`)

    res.json({
      message: 'Task created successfully!',
      task
    })

  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ 
      message: 'Failed to create task',
      error: error.message 
    })
  }
}

const verifyTask = async (req, res) => {
  res.status(400).json({ 
    message: 'Manual verification is disabled. Tasks complete automatically.',
    verified: false,
    autoVerifyEnabled: true
  })
}

const getAvailableTasks = async (req, res) => {
  try {
    const userId = req.user.id
    const { platform, difficulty } = req.query

    const where = { isActive: true }

    if (platform && platform !== 'all') {
      where.platform = { name: platform }
    }

    if (difficulty) {
      where.difficulty = parseInt(difficulty)
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        platform: true,
        userTasks: {
          where: { userId },
          select: {
            status: true,
            completedAt: true,
            startedAt: true,
            verificationData: true
          }
        }
      },
      orderBy: [
        { difficulty: 'asc' },
        { reward: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    const tasksWithStatus = tasks.map(task => ({
      ...task,
      userStatus: task.userTasks[0]?.status || 'available',
      userCompletedAt: task.userTasks[0]?.completedAt,
      userStartedAt: task.userTasks[0]?.startedAt,
      autoVerified: task.userTasks[0]?.verificationData?.autoVerified || false,
      userTasks: undefined
    }))

    res.json({ 
      success: true,
      tasks: tasksWithStatus,
      autoVerifyEnabled: process.env.AUTO_VERIFY_TASKS !== 'false',
      activeVerifications: activeVerifications.size
    })

  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    })
  }
}

const getFilteredTasks = async (req, res) => {
  try {
    const userId = req.user.id
    const {
      platform = 'all',
      status = 'all', 
      difficulty = 'all',
      search = '',
      dateFrom,
      dateTo,
      sortBy = 'reward',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query

    console.log('🔍 Filtering tasks with params:', { platform, status, difficulty, search, sortBy, sortOrder })

    // Build task where clause
    const taskWhere = { isActive: true }
    
    // Platform filtering
    if (platform !== 'all') {
      taskWhere.platform = { name: platform }
    }
    
    // Difficulty filtering
    if (difficulty !== 'all') {
      taskWhere.difficulty = parseInt(difficulty)
    }
    
    // Search filtering
    if (search.trim()) {
      taskWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { targetUsername: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Build sort options (FIXED: removed pinned field)
    const orderBy = []
    
    switch (sortBy) {
      case 'reward':
        orderBy.push({ reward: sortOrder })
        break
      case 'difficulty':
        orderBy.push({ difficulty: sortOrder })
        break
      case 'created':
        orderBy.push({ createdAt: sortOrder })
        break
      case 'title':
        orderBy.push({ title: sortOrder })
        break
      default:
        orderBy.push({ reward: 'desc' }) // Default to highest reward first
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    console.log('📊 Query params:', { skip, limitNum, orderBy })

    // Execute queries
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        include: {
          platform: true,
          userTasks: {
            where: { userId },
            select: {
              status: true,
              completedAt: true,
              startedAt: true,
              verificationData: true
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      
      // Count total matching tasks
      prisma.task.count({ where: taskWhere })
    ])

    console.log(`📋 Found ${tasks.length} tasks, total: ${totalCount}`)

    // Transform results - add user status
    const tasksWithStatus = tasks.map(task => {
      const userTask = task.userTasks[0]
      let userStatus = 'available'
      
      if (userTask) {
        userStatus = userTask.status
      }
      
      // Apply status filtering if needed
      if (status !== 'all') {
        if (status === 'available' && userStatus !== 'available' && userStatus !== 'failed') {
          return null // Filter out
        }
        if (status !== 'available' && userStatus !== status) {
          return null // Filter out
        }
      }

      return {
        ...task,
        userStatus,
        userCompletedAt: userTask?.completedAt,
        userStartedAt: userTask?.startedAt,
        autoVerified: userTask?.verificationData?.autoVerified || false,
        userTasks: undefined // Remove from response
      }
    }).filter(task => task !== null) // Remove filtered out tasks

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum)
    const hasMore = pageNum < totalPages

    console.log(`✅ Returning ${tasksWithStatus.length} filtered tasks`)

    res.json({
      success: true,
      tasks: tasksWithStatus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasMore,
        hasPrev: pageNum > 1
      },
      filters: {
        platform,
        status,
        difficulty,
        search,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      },
      meta: {
        resultCount: tasksWithStatus.length,
        autoVerifyEnabled: process.env.AUTO_VERIFY_TASKS !== 'false'
      }
    })

  } catch (error) {
    console.error('❌ Get filtered tasks error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
}

// 🚀 FIXED: Enhanced user tasks with filtering
const getUserTasksFiltered = async (req, res) => {
  try {
    const userId = req.user.id
    const {
      status = 'all',
      platform = 'all', 
      difficulty = 'all',
      search = '',
      dateFrom,
      dateTo,
      sortBy = 'created',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query

    console.log('🔍 Filtering user tasks with params:', { status, platform, difficulty, search })

    // Build user task where clause
    const userTaskWhere = { userId }
    
    // Status filtering
    if (status !== 'all') {
      userTaskWhere.status = status
    }
    
    // Date filtering
    if (dateFrom || dateTo) {
      userTaskWhere.completedAt = {}
      if (dateFrom) userTaskWhere.completedAt.gte = new Date(dateFrom)
      if (dateTo) userTaskWhere.completedAt.lte = new Date(dateTo + 'T23:59:59.999Z')
    }

    // Build task filtering for include
    const taskIncludeWhere = {}
    
    // Platform filtering
    if (platform !== 'all') {
      taskIncludeWhere.platform = { name: platform }
    }
    
    // Difficulty filtering
    if (difficulty !== 'all') {
      taskIncludeWhere.difficulty = parseInt(difficulty)
    }
    
    // Search filtering
    if (search.trim()) {
      taskIncludeWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { targetUsername: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Build sort options (FIXED: removed pinned references)
    const orderBy = []
    
    switch (sortBy) {
      case 'created':
        orderBy.push({ createdAt: sortOrder })
        break
      case 'completed':
        orderBy.push({ completedAt: sortOrder })
        break
      case 'started':
        orderBy.push({ startedAt: sortOrder })
        break
      case 'status':
        orderBy.push({ status: sortOrder })
        break
      case 'reward':
        orderBy.push({ task: { reward: sortOrder } })
        break
      case 'difficulty':
        orderBy.push({ task: { difficulty: sortOrder } })
        break
      default:
        orderBy.push({ createdAt: 'desc' })
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    // Execute queries
    const [userTasks, totalCount] = await Promise.all([
      prisma.userTask.findMany({
        where: userTaskWhere,
        include: {
          task: {
            where: Object.keys(taskIncludeWhere).length > 0 ? taskIncludeWhere : undefined,
            include: {
              platform: true
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      
      // Count with basic user task filter
      prisma.userTask.count({
        where: userTaskWhere
      })
    ])

    // Filter out user tasks where task is null (due to task filtering)
    const filteredUserTasks = userTasks.filter(ut => ut.task !== null)

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum)
    const hasMore = pageNum < totalPages

    // Calculate stats
    const stats = {
      total: filteredUserTasks.length,
      completed: filteredUserTasks.filter(ut => ut.status === 'completed').length,
      inProgress: filteredUserTasks.filter(ut => ut.status === 'in_progress').length,
      failed: filteredUserTasks.filter(ut => ut.status === 'failed').length,
      totalEarnings: filteredUserTasks
        .filter(ut => ut.status === 'completed')
        .reduce((sum, ut) => sum + (ut.task?.reward || 0), 0)
    }

    console.log(`✅ Returning ${filteredUserTasks.length} user tasks`)

    res.json({
      success: true,
      userTasks: filteredUserTasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasMore,
        hasPrev: pageNum > 1
      },
      filters: {
        status,
        platform,
        difficulty,
        search,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      },
      stats
    })

  } catch (error) {
    console.error('❌ Get user tasks filtered error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
}

// 🚀 Get task statistics for dashboard
const getTaskStats = async (req, res) => {
  try {
    const userId = req.user.id

    // Get available tasks count (tasks user can start)
    const availableTasks = await prisma.task.count({
      where: { 
        isActive: true,
        // Count tasks that user hasn't completed yet
        NOT: {
          userTasks: {
            some: {
              userId,
              status: 'completed'
            }
          }
        }
      }
    })

    // Get user task statistics
    const userTaskStats = await prisma.userTask.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true }
    })

    // Calculate today's completed tasks and earnings
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayCompletedTasks = await prisma.userTask.findMany({
      where: {
        userId,
        status: 'completed',
        completedAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        task: {
          select: { reward: true }
        }
      }
    })

    // Process statistics
    const stats = {
      available: availableTasks,
      completed: todayCompletedTasks.length,
      inProgress: userTaskStats.find(s => s.status === 'in_progress')?._count.status || 0,
      failed: userTaskStats.find(s => s.status === 'failed')?._count.status || 0,
      totalEarnings: todayCompletedTasks.reduce((sum, ut) => sum + (ut.task?.reward || 0), 0),
      totalCompleted: userTaskStats.find(s => s.status === 'completed')?._count.status || 0
    }

    console.log('📊 Task stats:', stats)

    res.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('❌ Get task stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
}

const getUserTasks = async (req, res) => {
  try {
    const userId = req.user.id
    const { status } = req.query

    const where = { userId }
    if (status) {
      where.status = status
    }

    const userTasks = await prisma.userTask.findMany({
      where,
      include: {
        task: {
          include: {
            platform: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ 
      success: true,
      userTasks 
    })

  } catch (error) {
    console.error('Get user tasks error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    })
  }
}

const healthCheck = async (req, res) => {
  try {
    const healthResults = await twitterService.healthCheck()
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      api: healthResults,
      approach: 'user_centric_mongodb_compatible',
      activeVerifications: activeVerifications.size,
      autoVerifyEnabled: process.env.AUTO_VERIFY_TASKS !== 'false',
      fixes: [
        'MongoDB-compatible transactions (no isolation levels)',
        'Simple duplicate prevention',
        'Enhanced verification cleanup',
        'Proper error handling for P2026'
      ]
    })

  } catch (error) {
    console.error('Health check error:', error)
    res.status(500).json({ 
      status: 'error',
      message: 'Health check failed',
      error: error.message
    })
  }
}

// Helper function to get ISO week number
function getISOWeek(date) {
  const year = date.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000))
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

module.exports = {
  setupUserTwitterId,
  checkTwitterSetup,
  createTask,
  startTask,
  getTaskStatus,
  verifyTask,
  getAvailableTasks,
  getFilteredTasks,
  getUserTasksFiltered,
  getUserTasks,
  healthCheck,

  getFilteredTasks,
  getUserTasksFiltered,
  getTaskStats
}