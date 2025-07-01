// src/controllers/comments.js - COMPLETE WORKING VERSION
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Get comments for a post with pagination and sorting
const getComments = async (req, res) => {
  try {
    const { postId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const sortBy = req.query.sortBy || 'top'
    const skip = (page - 1) * limit

    console.log(`Getting comments for post ${postId}, page ${page}, sortBy: ${sortBy}`)

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // Define sorting logic
    let orderBy
    switch (sortBy) {
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'top':
      default:
        orderBy = [
          { likesCount: 'desc' },
          { createdAt: 'desc' }
        ]
        break
    }

    // Get top-level comments only
    const comments = await prisma.comment.findMany({
      where: { 
        postId,
        parentId: null
      },
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
        _count: {
          select: { 
            likes: true,
            replies: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    })

    // Check which comments current user has liked
    let userLikes = []
    if (req.user) {
      const commentIds = comments.map(comment => comment.id)
      if (commentIds.length > 0) {
        userLikes = await prisma.commentLike.findMany({
          where: {
            userId: req.user.id,
            commentId: { in: commentIds }
          },
          select: { commentId: true }
        })
      }
    }

    const userLikedCommentIds = userLikes.map(like => like.commentId)

    // Format response
    const formattedComments = comments.map(comment => ({
      ...comment,
      isLiked: userLikedCommentIds.includes(comment.id),
      likesCount: comment._count.likes,
      repliesCount: comment._count.replies,
      replies: []
    }))

    // Get total comment count
    const totalComments = await prisma.comment.count({
      where: { 
        postId,
        parentId: null 
      }
    })

    res.json({
      comments: formattedComments,
      pagination: {
        page,
        limit,
        hasMore: comments.length === limit
      },
      sorting: {
        current: sortBy,
        available: ['top', 'newest', 'oldest']
      },
      totalCount: totalComments
    })

  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Get replies for a specific comment
const getReplies = async (req, res) => {
  try {
    const { commentId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    console.log(`Getting replies for comment ${commentId}`)

    // Verify parent comment exists
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId }
    })

    if (!parentComment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    const replies = await prisma.comment.findMany({
      where: { parentId: commentId },
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
        _count: {
          select: { likes: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit
    })

    // Check which replies current user has liked
    let userLikes = []
    if (req.user) {
      const replyIds = replies.map(reply => reply.id)
      if (replyIds.length > 0) {
        userLikes = await prisma.commentLike.findMany({
          where: {
            userId: req.user.id,
            commentId: { in: replyIds }
          },
          select: { commentId: true }
        })
      }
    }

    const userLikedReplyIds = userLikes.map(like => like.commentId)

    const formattedReplies = replies.map(reply => ({
      ...reply,
      isLiked: userLikedReplyIds.includes(reply.id),
      likesCount: reply._count.likes
    }))

    res.json({
      replies: formattedReplies,
      pagination: {
        page,
        limit,
        hasMore: replies.length === limit
      }
    })

  } catch (error) {
    console.error('Get replies error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Create a new comment
const createComment = async (req, res) => {
  try {
    const { postId } = req.params
    const { content, parentId } = req.body
    const userId = req.user.id

    console.log(`Creating comment for post ${postId} by user ${userId}`)

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // If parentId provided, verify parent comment exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      })

      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' })
      }
    }

    // Create comment and update post comment count in transaction
    const result = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          content: content.trim(),
          userId,
          postId,
          parentId: parentId || null
        },
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
          _count: {
            select: { likes: true }
          }
        }
      })

      // Only increment post comment count for top-level comments
      if (!parentId) {
        await tx.post.update({
          where: { id: postId },
          data: { commentsCount: { increment: 1 } }
        })
      }

      return comment
    })

    const response = {
      ...result,
      isLiked: false,
      likesCount: result._count.likes,
      repliesCount: 0,
      replies: []
    }

    res.status(201).json({
      message: 'Comment created successfully',
      comment: response
    })

  } catch (error) {
    console.error('Create comment error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Like a comment
const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params
    const userId = req.user.id

    console.log(`User ${userId} liking comment ${commentId}`)

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    // Check if already liked - Use findFirst for better compatibility
    const existingLike = await prisma.commentLike.findFirst({
      where: {
        userId: userId,
        commentId: commentId
      }
    })

    if (existingLike) {
      return res.status(400).json({ message: 'Comment already liked' })
    }

    // Create like and increment like count in transaction
    await prisma.$transaction(async (tx) => {
      await tx.commentLike.create({
        data: { 
          userId: userId, 
          commentId: commentId 
        }
      })

      await tx.comment.update({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } }
      })
    })

    res.json({ message: 'Comment liked successfully' })

  } catch (error) {
    console.error('Like comment error:', error)
    console.error('Error details:', error.message)
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
    })
  }
}

// Unlike a comment
const unlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params
    const userId = req.user.id

    console.log(`User ${userId} unliking comment ${commentId}`)

    // Find the like record
    const existingLike = await prisma.commentLike.findFirst({
      where: {
        userId: userId,
        commentId: commentId
      }
    })

    if (!existingLike) {
      return res.status(400).json({ message: 'Comment not liked' })
    }

    // Remove like and decrement like count in transaction
    await prisma.$transaction(async (tx) => {
      await tx.commentLike.delete({
        where: {
          id: existingLike.id
        }
      })

      await tx.comment.update({
        where: { id: commentId },
        data: { likesCount: { decrement: 1 } }
      })
    })

    res.json({ message: 'Comment unliked successfully' })

  } catch (error) {
    console.error('Unlike comment error:', error)
    console.error('Error details:', error.message)
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
    })
  }
}

// Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params
    const userId = req.user.id

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { _count: { select: { replies: true } } }
    })

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' })
    }

    if (comment._count.replies > 0) {
      // YouTube-style: Replace content with [deleted] but keep the comment
      await prisma.comment.update({
        where: { id: commentId },
        data: { 
          content: '[deleted]',
          updatedAt: new Date()
        }
      })

      res.json({ 
        message: 'Comment deleted successfully',
        type: 'content_replaced'
      })
    } else {
      // Complete deletion if no replies
      await prisma.$transaction(async (tx) => {
        await tx.comment.delete({
          where: { id: commentId }
        })

        // Decrement post comment count if it's a top-level comment
        if (!comment.parentId) {
          await tx.post.update({
            where: { id: comment.postId },
            data: { commentsCount: { decrement: 1 } }
          })
        }
      })

      res.json({ 
        message: 'Comment deleted successfully',
        type: 'complete_deletion'
      })
    }

  } catch (error) {
    console.error('Delete comment error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Update a comment
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params
    const { content } = req.body
    const userId = req.user.id

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' })
    }

    if (content.length > 2000) {
      return res.status(400).json({ message: 'Comment is too long (max 2000 characters)' })
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' })
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { 
        content: content.trim(),
        updatedAt: new Date()
      },
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
        _count: {
          select: { likes: true }
        }
      }
    })

    const response = {
      ...updatedComment,
      likesCount: updatedComment._count.likes
    }

    res.json({ comment: response })

  } catch (error) {
    console.error('Update comment error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Fix comment counts utility
const fixCommentCounts = async (req, res) => {
  try {
    console.log('🔧 Fixing comment counts...')
    
    const posts = await prisma.post.findMany({
      include: {
        comments: {
          where: { parentId: null }
        }
      }
    })

    for (const post of posts) {
      const actualCount = post.comments.length
      
      if (post.commentsCount !== actualCount) {
        await prisma.post.update({
          where: { id: post.id },
          data: { commentsCount: actualCount }
        })
        
        console.log(`✅ Post ${post.id}: Fixed count from ${post.commentsCount} to ${actualCount}`)
      }
    }

    res.json({ 
      message: 'Comment counts fixed', 
      updated: posts.length
    })
  } catch (error) {
    console.error('Fix comment counts error:', error)
    res.status(500).json({ message: 'Error fixing counts' })
  }
}

module.exports = {
  getComments,
  getReplies,
  createComment,
  likeComment,
  unlikeComment,
  deleteComment,
  updateComment,
  fixCommentCounts
}