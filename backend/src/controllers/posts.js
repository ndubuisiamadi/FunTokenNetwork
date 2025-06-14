// src/controllers/posts.js
const { validationResult } = require('express-validator')
const prisma = require('../db')
const { awardGumballs } = require('../services/levelSystem')

const getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    console.log(`Getting feed - page: ${page}, limit: ${limit}, skip: ${skip}`)

    const posts = await prisma.post.findMany({
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
            // Removed isVerified - field doesn't exist in current schema
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

    console.log(`Found ${posts.length} posts`)

    // Format posts for frontend
    const formattedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      mediaUrls: post.mediaUrls,
      postType: post.postType,
      linkPreview: post.linkPreview,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      user: {
        ...post.user,
        isVerified: false // Default to false since field doesn't exist
      },
      community: post.community,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: post.sharesCount || 0,
      isLiked: req.user ? post.likes.length > 0 : false,
      isSaved: false // TODO: Implement saved posts functionality
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
    console.error('Get feed error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const createPost = async (req, res) => {
  try {
    console.log('=== CREATE POST START ===')
    console.log('User:', req.user?.id)
    console.log('Request body:', req.body)

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array())
      return res.status(400).json({ errors: errors.array() })
    }

    const { content, mediaUrls = [], postType = 'text', linkPreview, communityId } = req.body

    // Validate that post has content or media
    if (!content?.trim() && (!mediaUrls || mediaUrls.length === 0)) {
      return res.status(400).json({ message: 'Post must have content or media' })
    }

    // If posting to community, verify membership (skip for now since communities may not be implemented)
    if (communityId) {
      try {
        const membership = await prisma.communityMember.findFirst({
          where: {
            userId: req.user.id,
            communityId
          }
        })

        if (!membership) {
          return res.status(403).json({ message: 'You are not a member of this community' })
        }
      } catch (communityError) {
        console.log('Community check failed (probably table doesnt exist):', communityError.message)
        // Continue without community check
      }
    }

    console.log('Creating post with data:', {
      content: content?.trim(),
      mediaUrls,
      postType,
      linkPreview,
      userId: req.user.id,
      communityId
    })

    const post = await prisma.post.create({
      data: {
        content: content?.trim(),
        mediaUrls,
        postType,
        linkPreview,
        userId: req.user.id,
        communityId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
            // Removed isVerified - field doesn't exist in current schema
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
        }
      }
    })

    console.log('Post created successfully:', post.id)

    // *** ADD THIS: Award gumballs for posting ***
    try {
      const gumballResult = await awardGumballs(req.user.id, 10, 'post_created')
      if (gumballResult.success) {
        console.log(`Awarded 10 gumballs for posting. New total: ${gumballResult.newTotal}`)
        if (gumballResult.levelChanged) {
          console.log(`User leveled up to: ${gumballResult.newLevel}`)
        }
      }
    } catch (gumballError) {
      console.error('Failed to award gumballs for posting:', gumballError)
      // Don't fail the request if gumballs update fails
    }

    const formattedPost = {
      id: post.id,
      content: post.content,
      mediaUrls: post.mediaUrls,
      postType: post.postType,
      linkPreview: post.linkPreview,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      user: {
        ...post.user,
        isVerified: false // Default to false since field doesn't exist
      },
      community: post.community,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: 0,
      isLiked: false,
      isSaved: false
    }

    console.log('=== CREATE POST SUCCESS ===')

    res.status(201).json({
      message: 'Post created successfully',
      post: formattedPost
    })
  } catch (error) {
    console.error('=== CREATE POST ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'Duplicate post detected',
        error: 'duplicate_post'
      })
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        message: 'User or community not found',
        error: 'not_found'
      })
    }

    res.status(500).json({ 
      message: 'Internal server error',
      error: 'create_post_failed'
    })
  }
}

const likePost = async (req, res) => {
  try {
    const { id } = req.params

    console.log(`User ${req.user.id} liking post ${id}`)

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, userId: true }
    })

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: req.user.id,
          postId: id
        }
      }
    })

    if (existingLike) {
      return res.status(400).json({ message: 'Post already liked' })
    }

    // Create like
    await prisma.like.create({
      data: {
        userId: req.user.id,
        postId: id
      }
    })

    // *** ADD THIS: Award gumballs to post owner (if not liking own post) ***
    if (post.userId !== req.user.id) {
      try {
        const gumballResult = await awardGumballs(post.userId, 5, 'received_like')
        if (gumballResult.success) {
          console.log(`Awarded 5 gumballs to post owner for like. New total: ${gumballResult.newTotal}`)
          if (gumballResult.levelChanged) {
            console.log(`Post owner leveled up to: ${gumballResult.newLevel}`)
          }
        }
      } catch (gumballError) {
        console.error('Failed to award gumballs for like:', gumballError)
        // Don't fail the request
      }
    }

    console.log('Post liked successfully')
    res.json({ message: 'Post liked successfully' })
  } catch (error) {
    console.error('Like post error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const unlikePost = async (req, res) => {
  try {
    const { id } = req.params

    console.log(`User ${req.user.id} unliking post ${id}`)

    // Check if like exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: req.user.id,
          postId: id
        }
      }
    })

    if (!existingLike) {
      return res.status(400).json({ message: 'Post not liked' })
    }

    // Remove like
    await prisma.like.delete({
      where: {
        userId_postId: {
          userId: req.user.id,
          postId: id
        }
      }
    })

    console.log('Post unliked successfully')
    res.json({ message: 'Post unliked successfully' })
  } catch (error) {
    console.error('Unlike post error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getPost = async (req, res) => {
  try {
    const { id } = req.params

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
            // Removed isVerified - field doesn't exist in current schema
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

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    const formattedPost = {
      id: post.id,
      content: post.content,
      mediaUrls: post.mediaUrls,
      postType: post.postType,
      linkPreview: post.linkPreview,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      user: {
        ...post.user,
        isVerified: false // Default to false since field doesn't exist
      },
      community: post.community,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: post.sharesCount || 0,
      isLiked: req.user ? post.likes.length > 0 : false,
      isSaved: false
    }

    res.json(formattedPost)
  } catch (error) {
    console.error('Get post error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const deletePost = async (req, res) => {
  try {
    const { id } = req.params

    console.log(`User ${req.user.id} deleting post ${id}`)

    // Check if user owns the post
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existingPost) {
      return res.status(404).json({ message: 'Post not found' })
    }

    if (existingPost.userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own posts' })
    }

    // Delete the post (this will cascade delete likes and comments)
    await prisma.post.delete({
      where: { id }
    })

    console.log('Post deleted successfully')
    res.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Delete post error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = {
  getFeed,
  createPost,
  getPost,
  likePost,
  unlikePost,
  deletePost
}