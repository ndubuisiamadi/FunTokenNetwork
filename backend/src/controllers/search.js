// src/controllers/search.js - PERFORMANCE OPTIMIZED VERSION
const { validationResult } = require('express-validator')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ✅ Simple, fast search query builder
const buildOptimizedUserSearch = (searchQuery, currentUserId) => {
  const trimmedQuery = searchQuery.trim()
  
  // Split search into words for full name support
  const words = trimmedQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0)
  
  const baseCondition = {
    AND: [
      { id: { not: currentUserId } }
    ]
  }

  if (words.length === 0) {
    return baseCondition
  }

  if (words.length === 1) {
    // ✅ Single word - use simple OR with indexed fields
    baseCondition.AND.push({
      OR: [
        { firstName: { contains: words[0], mode: 'insensitive' } },
        { lastName: { contains: words[0], mode: 'insensitive' } },
        { username: { contains: words[0], mode: 'insensitive' } }
      ]
    })
  } else if (words.length === 2) {
    // ✅ Two words - likely first name + last name (most common case)
    baseCondition.AND.push({
      OR: [
        // First + Last
        {
          AND: [
            { firstName: { contains: words[0], mode: 'insensitive' } },
            { lastName: { contains: words[1], mode: 'insensitive' } }
          ]
        },
        // Last + First  
        {
          AND: [
            { firstName: { contains: words[1], mode: 'insensitive' } },
            { lastName: { contains: words[0], mode: 'insensitive' } }
          ]
        },
        // Fallback: any word in username
        { username: { contains: trimmedQuery, mode: 'insensitive' } }
      ]
    })
  } else {
    // ✅ 3+ words - just search in username and first/last separately  
    baseCondition.AND.push({
      OR: [
        { firstName: { contains: trimmedQuery, mode: 'insensitive' } },
        { lastName: { contains: trimmedQuery, mode: 'insensitive' } },
        { username: { contains: trimmedQuery, mode: 'insensitive' } }
      ]
    })
  }

  return baseCondition
}

// ✅ FAST Global Search
const globalSearch = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const { q: searchQuery, types, limit = 5 } = req.query
    const currentUserId = req.user.id
    const searchLimit = Math.min(parseInt(limit), 10)

    const results = { posts: [], users: [], communities: [] }
    const searchTypes = types ? types.split(',') : ['posts', 'users', 'communities']

    // ✅ Parallel execution for better performance
    const searchPromises = []

    // Search Posts
    if (searchTypes.includes('posts')) {
      searchPromises.push(
        prisma.post.findMany({
          where: {
            content: { contains: searchQuery, mode: 'insensitive' }
          },
          take: searchLimit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            likesCount: true,
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
              select: { id: true, name: true }
            },
            likes: {
              where: { userId: currentUserId },
              select: { id: true }
            }
          }
        }).then(posts => {
          results.posts = posts.map(post => ({
            ...post,
            author: post.user,
            isLiked: post.likes.length > 0
          }))
        })
      )
    }

    // ✅ Optimized User Search
    if (searchTypes.includes('users')) {
      const userSearchCondition = buildOptimizedUserSearch(searchQuery, currentUserId)
      
      searchPromises.push(
        prisma.user.findMany({
          where: userSearchCondition,
          take: searchLimit,
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            level: true,
            gumballs: true
          },
          orderBy: [
            { gumballs: 'desc' },
            { createdAt: 'desc' }
          ]
        }).then(users => {
          results.users = users.map(user => ({
            ...user,
            points: user.gumballs
          }))
        })
      )
    }

    // Search Communities
    if (searchTypes.includes('communities')) {
      searchPromises.push(
        prisma.community.findMany({
          where: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { description: { contains: searchQuery, mode: 'insensitive' } }
            ]
          },
          take: searchLimit,
          select: {
            id: true,
            name: true,
            description: true,
            avatarUrl: true,
            memberCount: true
          },
          orderBy: [
            { memberCount: 'desc' },
            { createdAt: 'desc' }
          ]
        }).then(async (communities) => {
          // ✅ Efficient membership check
          if (communities.length > 0) {
            const communityIds = communities.map(c => c.id)
            const memberships = await prisma.communityMember.findMany({
              where: {
                userId: currentUserId,
                communityId: { in: communityIds }
              },
              select: { communityId: true }
            })
            
            const membershipSet = new Set(memberships.map(m => m.communityId))
            results.communities = communities.map(community => ({
              ...community,
              isMember: membershipSet.has(community.id)
            }))
          }
        })
      )
    }

    // ✅ Execute all searches in parallel
    await Promise.all(searchPromises)

    res.json({
      success: true,
      data: results,
      pagination: {
        query: searchQuery,
        types: searchTypes,
        limit: searchLimit,
        totalResults: {
          posts: results.posts.length,
          users: results.users.length,
          communities: results.communities.length
        }
      }
    })

  } catch (error) {
    console.error('Global search error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ✅ Optimized Individual Search Functions
const searchUsers = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const { q: searchQuery } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 20, 50) // Cap at 50
    const skip = (page - 1) * limit
    const currentUserId = req.user.id

    const userSearchCondition = buildOptimizedUserSearch(searchQuery, currentUserId)

    const users = await prisma.user.findMany({
      where: userSearchCondition,
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
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
      points: user.gumballs
    }))

    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        page,
        limit,
        hasMore: users.length === limit,
        query: searchQuery
      }
    })

  } catch (error) {
    console.error('Search users error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// Keep other functions simple and fast...
const searchPosts = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const { q: searchQuery } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10, 20)
    const skip = (page - 1) * limit
    const currentUserId = req.user.id

    const posts = await prisma.post.findMany({
      where: {
        content: { contains: searchQuery, mode: 'insensitive' }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        likesCount: true,
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
          select: { id: true, name: true }
        },
        likes: {
          where: { userId: currentUserId },
          select: { id: true }
        }
      }
    })

    const formattedPosts = posts.map(post => ({
      ...post,
      author: post.user,
      isLiked: post.likes.length > 0
    }))

    res.json({
      success: true,
      data: formattedPosts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit,
        query: searchQuery
      }
    })

  } catch (error) {
    console.error('Search posts error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

const searchCommunities = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const { q: searchQuery } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 20, 50)
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
      select: {
        id: true,
        name: true,
        description: true,
        avatarUrl: true,
        memberCount: true
      },
      orderBy: [
        { memberCount: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Efficient membership check
    let formattedCommunities = communities
    if (communities.length > 0) {
      const communityIds = communities.map(c => c.id)
      const memberships = await prisma.communityMember.findMany({
        where: {
          userId: currentUserId,
          communityId: { in: communityIds }
        },
        select: { communityId: true }
      })
      
      const membershipSet = new Set(memberships.map(m => m.communityId))
      formattedCommunities = communities.map(community => ({
        ...community,
        isMember: membershipSet.has(community.id)
      }))
    }

    res.json({
      success: true,
      data: formattedCommunities,
      pagination: {
        page,
        limit,
        hasMore: communities.length === limit,
        query: searchQuery
      }
    })

  } catch (error) {
    console.error('Search communities error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

module.exports = {
  globalSearch,
  searchPosts,
  searchUsers,
  searchCommunities
}