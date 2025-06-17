// src/controllers/communities.js
const { PrismaClient } = require('@prisma/client')
const { validationResult } = require('express-validator')

const prisma = new PrismaClient()

// Get all communities (explore page)
// In src/controllers/communities.js, update these methods:

// Get all communities (explore page) - UPDATED to exclude joined communities
const getAllCommunities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const currentUserId = req.user?.id

    // Build the where clause
    const whereClause = {}
    
    // If user is authenticated, exclude communities they're already members of
    if (currentUserId) {
      whereClause.NOT = {
        members: {
          some: {
            userId: currentUserId
          }
        }
      }
    }

    const communities = await prisma.community.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: [
        { memberCount: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        _count: {
          select: {
            posts: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
              }
            }
          }
        }
      }
    })

    const formattedCommunities = communities.map(community => ({
      ...community,
      postsThisWeek: community._count.posts,
      userRole: null, // User is not a member of any of these
      isMember: false, // User is not a member of any of these
      _count: undefined
    }))

    res.json({
      communities: formattedCommunities,
      pagination: {
        page,
        limit,
        hasMore: communities.length === limit
      }
    })
  } catch (error) {
    console.error('Get all communities error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Search communities
const searchCommunities = async (req, res) => {
  try {
    const { q: searchQuery } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const currentUserId = req.user?.id

    // Build the where clause - REMOVED THE EXCLUSION LOGIC
    const whereClause = {}
    
    // Add search conditions
    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } }
      ]
    }
    
    // REMOVED: No longer exclude communities the user is a member of
    // This was the problematic code:
    // if (currentUserId) {
    //   whereClause.NOT = {
    //     members: {
    //       some: {
    //         userId: currentUserId
    //       }
    //     }
    //   }
    // }

    const communities = await prisma.community.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: [
        { memberCount: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        members: currentUserId ? {
          where: { userId: currentUserId },
          select: { id: true }
        } : false,
        _count: {
          select: {
            posts: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
              }
            },
            members: true
          }
        }
      }
    })

    const formattedCommunities = communities.map(community => ({
      ...community,
      isMember: currentUserId ? community.members?.length > 0 : false,
      memberCount: community._count?.members || 0,
      postsThisWeek: community._count?.posts || 0
    }))

    res.json({
      communities: formattedCommunities,
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

// Create community - UPDATED
// Create new community
const createCommunity = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      })
    }

    const { name, description, rules, avatarUrl, bannerUrl } = req.body 
    const userId = req.user.id

    // Check if community name already exists
    const existingCommunity = await prisma.community.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' }
      }
    })

    if (existingCommunity) {
      return res.status(400).json({ 
        message: 'A community with this name already exists' 
      })
    }

    // Create community and add creator as owner
    const community = await prisma.$transaction(async (tx) => {
      // Create the community
      const newCommunity = await tx.community.create({
        data: {
          name,
          description,
          rules,
          avatarUrl,    
          bannerUrl,    
          createdById: userId,
          memberCount: 1
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true
            }
          }
        }
      })

      // Add creator as owner/member
      await tx.communityMember.create({
        data: {
          userId,
          communityId: newCommunity.id,
          role: 'owner'
        }
      })

      return newCommunity
    })

    res.status(201).json({
      message: 'Community created successfully',
      community: {
        ...community,
        userRole: 'owner',
        isMember: true,
        postsToday: 0
      }
    })
  } catch (error) {
    console.error('Create community error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Get community by ID - UPDATED
const getCommunity = async (req, res) => {
  try {
    const { communityId } = req.params
    const currentUserId = req.user?.id

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        _count: {
          select: {
            posts: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        },
        ...(currentUserId && {
          members: {
            where: { userId: currentUserId },
            select: { role: true, joinedAt: true }
          }
        })
      }
    })

    if (!community) {
      return res.status(404).json({ message: 'Community not found' })
    }

    // REMOVED: Privacy check since all communities are public

    const userMembership = currentUserId && community.members.length > 0 ? community.members[0] : null

    res.json({
      community: {
        ...community,
        userRole: userMembership?.role || null,
        isMember: !!userMembership,
        joinedAt: userMembership?.joinedAt || null,
        postsToday: community._count.posts,
        _count: undefined,
        members: undefined
      }
    })
  } catch (error) {
    console.error('Get community error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Get user's communities
const getUserCommunities = async (req, res) => {
  try {
    const userId = req.user.id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const filter = req.query.filter // 'owned', 'admin', 'member'

    let whereClause = { userId }
    
    if (filter) {
      whereClause.role = filter === 'owned' ? 'owner' : filter
    }

    const memberships = await prisma.communityMember.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { joinedAt: 'desc' },
      include: {
        community: {
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            },
            _count: {
              select: {
                posts: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    const formattedCommunities = memberships.map(membership => ({
      ...membership.community,
      userRole: membership.role,
      joinedAt: membership.joinedAt,
      postsToday: membership.community._count.posts,
      _count: undefined
    }))

    res.json({
      communities: formattedCommunities,
      pagination: {
        page,
        limit,
        hasMore: memberships.length === limit
      },
      filter
    })
  } catch (error) {
    console.error('Get user communities error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Join community
const joinCommunity = async (req, res) => {
  try {
    const { communityId } = req.params
    const userId = req.user.id

    // Check if community exists
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, name: true, memberCount: true }
    })

    if (!community) {
      return res.status(404).json({ message: 'Community not found' })
    }

    // Check if user is already a member
    const existingMembership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId
        }
      }
    })

    if (existingMembership) {
      return res.status(400).json({ message: 'Already a member of this community' })
    }

    // Add user as member and increment member count
    await prisma.$transaction(async (tx) => {
      await tx.communityMember.create({
        data: {
          userId,
          communityId,
          role: 'member'
        }
      })

      await tx.community.update({
        where: { id: communityId },
        data: { memberCount: { increment: 1 } }
      })
    })

    res.json({
      message: 'Successfully joined community',
      community: {
        id: community.id,
        name: community.name,
        memberCount: community.memberCount + 1,
        userRole: 'member',
        isMember: true
      }
    })
  } catch (error) {
    console.error('Join community error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Leave community
const leaveCommunity = async (req, res) => {
  try {
    const { communityId } = req.params
    const userId = req.user.id

    // Check if user is a member
    const membership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId
        }
      }
    })

    if (!membership) {
      return res.status(400).json({ message: 'Not a member of this community' })
    }

    // Prevent owner from leaving (they need to delete or transfer ownership)
    if (membership.role === 'owner') {
      return res.status(400).json({ 
        message: 'Community owners cannot leave. Delete the community or transfer ownership first.' 
      })
    }

    // Remove membership and decrement member count
    await prisma.$transaction(async (tx) => {
      await tx.communityMember.delete({
        where: {
          userId_communityId: {
            userId,
            communityId
          }
        }
      })

      await tx.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } }
      })
    })

    res.json({
      message: 'Successfully left community'
    })
  } catch (error) {
    console.error('Leave community error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Update community (owner/admin only)
const updateCommunity = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      })
    }

    const { communityId } = req.params
    const userId = req.user.id
    const { name, description, rules } = req.body

    // Check if user has permission to update
    const membership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId
        }
      }
    })

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Permission denied' })
    }

    // If updating name, check for duplicates
    if (name) {
      const existingCommunity = await prisma.community.findFirst({
        where: { 
          name: { equals: name, mode: 'insensitive' },
          id: { not: communityId }
        }
      })

      if (existingCommunity) {
        return res.status(400).json({ 
          message: 'A community with this name already exists' 
        })
      }
    }

    const updatedCommunity = await prisma.community.update({
      where: { id: communityId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(rules !== undefined && { rules })
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    })

    res.json({
      message: 'Community updated successfully',
      community: {
        ...updatedCommunity,
        userRole: membership.role,
        isMember: true
      }
    })
  } catch (error) {
    console.error('Update community error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Get community members
const getCommunityMembers = async (req, res) => {
  try {
    const { communityId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    // Check if community exists
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, name: true }
    })

    if (!community) {
      return res.status(404).json({ message: 'Community not found' })
    }

    const members = await prisma.communityMember.findMany({
      where: { communityId },
      skip,
      take: limit,
      orderBy: [
        { role: 'asc' }, // owners first, then admins, then members
        { joinedAt: 'asc' }
      ],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            _count: {
              select: {
                posts: {
                  where: { communityId }
                }
              }
            }
          }
        }
      }
    })

    const formattedMembers = members.map(member => ({
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt,
      user: {
        ...member.user,
        postsInCommunity: member.user._count.posts,
        _count: undefined
      }
    }))

    res.json({
      members: formattedMembers,
      pagination: {
        page,
        limit,
        hasMore: members.length === limit
      }
    })
  } catch (error) {
    console.error('Get community members error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Get community posts
const getCommunityPosts = async (req, res) => {
  try {
    const { communityId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const currentUserId = req.user?.id

    // Check if community exists
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, name: true }
    })

    if (!community) {
      return res.status(404).json({ message: 'Community not found' })
    }

    const posts = await prisma.post.findMany({
      where: { communityId },
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
        ...(currentUserId && {
          likes: {
            where: { userId: currentUserId },
            select: { id: true }
          }
        })
      }
    })

    const formattedPosts = posts.map(post => ({
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isLiked: currentUserId ? post.likes.length > 0 : false,
      _count: undefined,
      likes: undefined
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
    console.error('Get community posts error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Update member role (admin/owner only)
const updateMemberRole = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      })
    }

    const { communityId, userId: targetUserId } = req.params
    const { role } = req.body
    const currentUserId = req.user.id

    // Check current user's permission
    const currentUserMembership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: currentUserId,
          communityId
        }
      }
    })

    if (!currentUserMembership || !['owner', 'admin'].includes(currentUserMembership.role)) {
      return res.status(403).json({ message: 'Permission denied' })
    }

    // Check if target user is a member
    const targetMembership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      }
    })

    if (!targetMembership) {
      return res.status(404).json({ message: 'User is not a member of this community' })
    }

    // Only owners can promote to admin or demote admins
    if (role === 'admin' && currentUserMembership.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can manage admin roles' })
    }

    // Can't change owner role
    if (targetMembership.role === 'owner') {
      return res.status(400).json({ message: 'Cannot change owner role' })
    }

    await prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      },
      data: { role }
    })

    res.json({
      message: 'Member role updated successfully'
    })
  } catch (error) {
    console.error('Update member role error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Remove member (admin/owner only)
const removeMember = async (req, res) => {
  try {
    const { communityId, userId: targetUserId } = req.params
    const currentUserId = req.user.id

    // Check current user's permission
    const currentUserMembership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: currentUserId,
          communityId
        }
      }
    })

    if (!currentUserMembership || !['owner', 'admin'].includes(currentUserMembership.role)) {
      return res.status(403).json({ message: 'Permission denied' })
    }

    // Check target membership
    const targetMembership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      }
    })

    if (!targetMembership) {
      return res.status(404).json({ message: 'User is not a member of this community' })
    }

    // Can't remove owner
    if (targetMembership.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove community owner' })
    }

    // Only owners can remove admins
    if (targetMembership.role === 'admin' && currentUserMembership.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can remove admins' })
    }

    // Remove member and decrement count
    await prisma.$transaction(async (tx) => {
      await tx.communityMember.delete({
        where: {
          userId_communityId: {
            userId: targetUserId,
            communityId
          }
        }
      })

      await tx.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } }
      })
    })

    res.json({
      message: 'Member removed successfully'
    })
  } catch (error) {
    console.error('Remove member error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Delete community (owner only)
const deleteCommunity = async (req, res) => {
  try {
    const { communityId } = req.params
    const userId = req.user.id

    // Check if user is the owner
    const membership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId
        }
      }
    })

    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ message: 'Only community owners can delete communities' })
    }

    // Delete community (cascade will handle related records)
    await prisma.community.delete({
      where: { id: communityId }
    })

    res.json({
      message: 'Community deleted successfully'
    })
  } catch (error) {
    console.error('Delete community error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = {
  getAllCommunities,
  searchCommunities,
  getUserCommunities,
  createCommunity,
  getCommunity,
  updateCommunity,
  deleteCommunity,
  joinCommunity,
  leaveCommunity,
  getCommunityMembers,
  updateMemberRole,
  removeMember,
  getCommunityPosts
}