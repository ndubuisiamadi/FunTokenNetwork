// src/controllers/search.js
const { validationResult } = require('express-validator')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Global search across posts, users, and communities only
const globalSearch = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { q: searchQuery } = req.query
    const currentUserId = req.user.id

    // Search posts
    const posts = await prisma.post.findMany({
      where: {
        content: {
          contains: searchQuery,
          mode: 'insensitive'
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,  // Changed to camelCase
            lastName: true,   // Changed to camelCase
            avatarUrl: true   // Changed to camelCase
          }
        },
        community: {
          select: {
            id: true,
            name: true
          }
        },
        likes: {
          where: { userId: currentUserId },
          select: { id: true }
        },
        _count: {
          select: { likes: true }
        }
      }
    })

    // Search users
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { firstName: { contains: searchQuery, mode: 'insensitive' } },  // Changed to camelCase
              { lastName: { contains: searchQuery, mode: 'insensitive' } },   // Changed to camelCase
              { username: { contains: searchQuery, mode: 'insensitive' } }
            ]
          }
        ]
      },
      take: 5,
      select: {
        id: true,
        username: true,
        firstName: true,  // Changed to camelCase
        lastName: true,   // Changed to camelCase
        avatarUrl: true,  // Changed to camelCase
        level: true,
        gumballs: true
      },
      orderBy: [
        { gumballs: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Search communities
    const communities = await prisma.community.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } }
        ]
      },
      take: 5,
      orderBy: { memberCount: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,  // Changed to camelCase
            lastName: true,   // Changed to camelCase
            avatarUrl: true   // Changed to camelCase
          }
        },
        members: {
          where: { userId: currentUserId },
          select: { id: true }
        },
        _count: {
          select: { members: true }
        }
      }
    })

    // Get total counts
    const [postsCount, usersCount, communitiesCount] = await Promise.all([
      prisma.post.count({
        where: {
          content: {
            contains: searchQuery,
            mode: 'insensitive'
          }
        }
      }),
      prisma.user.count({
        where: {
          AND: [
            { id: { not: currentUserId } },
            {
              OR: [
                { firstName: { contains: searchQuery, mode: 'insensitive' } },  // Changed to camelCase
                { lastName: { contains: searchQuery, mode: 'insensitive' } },   // Changed to camelCase
                { username: { contains: searchQuery, mode: 'insensitive' } }
              ]
            }
          ]
        }
      }),
      prisma.community.count({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } }
          ]
        }
      })
    ])

    // Format results - fields are already in camelCase, just need to convert user to author
    const formattedPosts = posts.map(post => ({
      ...post,
      author: post.user,  // Convert 'user' to 'author' for frontend compatibility
      isLiked: post.likes.length > 0,
      likesCount: post._count.likes
    }))

    const formattedUsers = users.map(user => ({
      ...user,
      points: user.gumballs  // Convert 'gumballs' to 'points' for frontend compatibility
    }))

    const formattedCommunities = communities.map(community => ({
      ...community,
      isMember: community.members.length > 0,
      memberCount: community._count.members
    }))

    res.json({
      posts: formattedPosts,
      users: formattedUsers,
      communities: formattedCommunities,
      totals: {
        posts: postsCount,
        users: usersCount,
        communities: communitiesCount
      }
    })
  } catch (error) {
    console.error('Global search error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Search posts with pagination
const searchPosts = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { q: searchQuery } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const currentUserId = req.user.id

    const posts = await prisma.post.findMany({
      where: {
        content: {
          contains: searchQuery,
          mode: 'insensitive'
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,  // Changed to camelCase
            lastName: true,   // Changed to camelCase
            avatarUrl: true   // Changed to camelCase
          }
        },
        community: {
          select: {
            id: true,
            name: true
          }
        },
        likes: {
          where: { userId: currentUserId },
          select: { id: true }
        },
        _count: {
          select: { likes: true }
        }
      }
    })

    const formattedPosts = posts.map(post => ({
      ...post,
      author: post.user,  // Convert 'user' to 'author' for frontend compatibility
      isLiked: post.likes.length > 0,
      likesCount: post._count.likes
    }))

    res.json({
      data: formattedPosts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    })
  } catch (error) {
    console.error('Search posts error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Search users with pagination
const searchUsers = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { q: searchQuery } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const currentUserId = req.user.id

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { firstName: { contains: searchQuery, mode: 'insensitive' } },  // Changed to camelCase
              { lastName: { contains: searchQuery, mode: 'insensitive' } },   // Changed to camelCase
              { username: { contains: searchQuery, mode: 'insensitive' } }
            ]
          }
        ]
      },
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        firstName: true,  // Changed to camelCase
        lastName: true,   // Changed to camelCase
        avatarUrl: true,  // Changed to camelCase
        level: true,
        gumballs: true
      },
      orderBy: [
        { gumballs: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    const formattedUsers = users.map(user => ({
      ...user,
      points: user.gumballs  // Convert 'gumballs' to 'points' for frontend compatibility
    }))

    res.json({
      data: formattedUsers,
      pagination: {
        page,
        limit,
        hasMore: users.length === limit
      }
    })
  } catch (error) {
    console.error('Search users error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Search communities with pagination
const searchCommunities = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { q: searchQuery } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const currentUserId = req.user.id

    const communities = await prisma.community.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } }
        ]
      },
      skip,
      take: limit,
      orderBy: { memberCount: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,  // Changed to camelCase
            lastName: true,   // Changed to camelCase
            avatarUrl: true   // Changed to camelCase
          }
        },
        members: {
          where: { userId: currentUserId },
          select: { id: true }
        },
        _count: {
          select: { members: true }
        }
      }
    })

    const formattedCommunities = communities.map(community => ({
      ...community,
      isMember: community.members.length > 0,
      memberCount: community._count.members
    }))

    res.json({
      data: formattedCommunities,
      pagination: {
        page,
        limit,
        hasMore: communities.length === limit
      }
    })
  } catch (error) {
    console.error('Search communities error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = {
  globalSearch,
  searchPosts,
  searchUsers,
  searchCommunities
}