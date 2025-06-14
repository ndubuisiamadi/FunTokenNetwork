// src/controllers/users.js - COMPLETE FILE
const { validationResult } = require('express-validator')
const prisma = require('../db')

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params
    const currentUserId = req.user?.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        location: true,
        birthDate: true,
        avatarUrl: true,
        bannerUrl: true,
        gumballs: true,
        level: true,
        globalRank: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            friendships1: true,
            friendships2: true,
            communities: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Get friendship status if current user is logged in
    let friendshipStatus = 'none'
    let friendRequestId = null

    if (currentUserId && currentUserId !== userId) {
      // Check if they are friends
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: currentUserId, user2Id: userId },
            { user1Id: userId, user2Id: currentUserId }
          ]
        }
      })

      if (friendship) {
        friendshipStatus = 'friends'
      } else {
        // Check for pending friend request
        const friendRequest = await prisma.friendRequest.findFirst({
          where: {
            OR: [
              { senderId: currentUserId, receiverId: userId },
              { senderId: userId, receiverId: currentUserId }
            ],
            status: 'pending'
          }
        })

        if (friendRequest) {
          friendRequestId = friendRequest.id
          friendshipStatus = friendRequest.senderId === currentUserId ? 'request_sent' : 'request_received'
        }
      }
    } else if (currentUserId === userId) {
      friendshipStatus = 'self'
    }

    res.json({
      user: {
        ...user,
        friendsCount: user._count.friendships1 + user._count.friendships2,
        postsCount: user._count.posts,
        communitiesCount: user._count.communities,
        friendshipStatus,
        friendRequestId
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const posts = await prisma.post.findMany({
      where: { userId: userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        community: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        ...(req.user && {
          likes: {
            where: { userId: req.user.id },
            select: { id: true }
          }
        })
      }
    })

    // Format posts
    const formattedPosts = posts.map(post => ({
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isLiked: req.user ? post.likes.length > 0 : false
    }))

    res.json({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    })
  } catch (error) {
    console.error('Get user posts error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const searchUsers = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { q } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const currentUserId = req.user?.id

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' })
    }

    const searchQuery = q.trim()

    const users = await prisma.user.findMany({
      where: {
        AND: [
          // Exclude current user from results
          currentUserId ? { id: { not: currentUserId } } : {},
          {
            OR: [
              { username: { contains: searchQuery, mode: 'insensitive' } },
              { firstName: { contains: searchQuery, mode: 'insensitive' } },
              { lastName: { contains: searchQuery, mode: 'insensitive' } }
            ]
          }
        ]
      },
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        gumballs: true,
        level: true,
        globalRank: true,
        isOnline: true,
        lastSeen: true,
        _count: {
          select: {
            friendships1: true,
            friendships2: true,
            communities: true
          }
        }
      },
      orderBy: [
        { gumballs: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    // Get friendship status for each user
    let usersWithStatus = users
    if (currentUserId) {
      usersWithStatus = await Promise.all(
        users.map(async (user) => {
          // Check friendship status
          const friendship = await prisma.friendship.findFirst({
            where: {
              OR: [
                { user1Id: currentUserId, user2Id: user.id },
                { user1Id: user.id, user2Id: currentUserId }
              ]
            }
          })

          let friendshipStatus = 'none'
          let friendRequestId = null

          if (friendship) {
            friendshipStatus = 'friends'
          } else {
            // Check for pending friend request
            const friendRequest = await prisma.friendRequest.findFirst({
              where: {
                OR: [
                  { senderId: currentUserId, receiverId: user.id },
                  { senderId: user.id, receiverId: currentUserId }
                ],
                status: 'pending'
              }
            })

            if (friendRequest) {
              friendRequestId = friendRequest.id
              friendshipStatus = friendRequest.senderId === currentUserId ? 'request_sent' : 'request_received'
            }
          }

          return {
            ...user,
            friendsCount: user._count.friendships1 + user._count.friendships2,
            communitiesCount: user._count.communities,
            friendshipStatus,
            friendRequestId
          }
        })
      )
    } else {
      usersWithStatus = users.map(user => ({
        ...user,
        friendsCount: user._count.friendships1 + user._count.friendships2,
        communitiesCount: user._count.communities,
        friendshipStatus: 'none',
        friendRequestId: null
      }))
    }

    res.json({
      users: usersWithStatus,
      pagination: {
        page,
        limit,
        hasMore: users.length === limit
      },
      query: searchQuery
    })
  } catch (error) {
    console.error('Search users error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const currentUserId = req.user?.id

    const users = await prisma.user.findMany({
      where: currentUserId ? { id: { not: currentUserId } } : {},
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        gumballs: true,
        level: true,
        globalRank: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        _count: {
          select: {
            friendships1: true,
            friendships2: true,
            communities: true
          }
        }
      },
      orderBy: [
        { gumballs: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    // Add friendship status if user is logged in
    let usersWithStatus = users
    if (currentUserId) {
      usersWithStatus = await Promise.all(
        users.map(async (user) => {
          const friendship = await prisma.friendship.findFirst({
            where: {
              OR: [
                { user1Id: currentUserId, user2Id: user.id },
                { user1Id: user.id, user2Id: currentUserId }
              ]
            }
          })

          let friendshipStatus = 'none'
          let friendRequestId = null

          if (friendship) {
            friendshipStatus = 'friends'
          } else {
            const friendRequest = await prisma.friendRequest.findFirst({
              where: {
                OR: [
                  { senderId: currentUserId, receiverId: user.id },
                  { senderId: user.id, receiverId: currentUserId }
                ],
                status: 'pending'
              }
            })

            if (friendRequest) {
              friendRequestId = friendRequest.id
              friendshipStatus = friendRequest.senderId === currentUserId ? 'request_sent' : 'request_received'
            }
          }

          return {
            ...user,
            friendsCount: user._count.friendships1 + user._count.friendships2,
            communitiesCount: user._count.communities,
            friendshipStatus,
            friendRequestId
          }
        })
      )
    } else {
      usersWithStatus = users.map(user => ({
        ...user,
        friendsCount: user._count.friendships1 + user._count.friendships2,
        communitiesCount: user._count.communities,
        friendshipStatus: 'none',
        friendRequestId: null
      }))
    }

    res.json({
      users: usersWithStatus,
      pagination: {
        page,
        limit,
        hasMore: users.length === limit
      }
    })
  } catch (error) {
    console.error('Get all users error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// In your users controller
const getUserCommunities = async (req, res) => {
  try {
    const { userId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    
    const memberships = await prisma.communityMember.findMany({
      where: { 
        userId: userId,
        // Optionally filter for public communities only
        community: {
          // Add a 'isPrivate' field to your Community model if needed
        }
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            // Don't include sensitive data for other users
          }
        }
      },
      orderBy: { joinedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit
    })
    
    const communities = memberships.map(m => ({
      ...m.community,
      userRole: m.role,
      joinedAt: m.joinedAt
    }))
    
    res.json({
      communities,
      pagination: {
        page,
        limit,
        hasMore: memberships.length === limit
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = {
  getUserById,
  getUserPosts,
  searchUsers,
  getAllUsers,
  getUserCommunities
}