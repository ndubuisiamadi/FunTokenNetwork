// src/controllers/friends.js
const { validationResult } = require('express-validator')
const prisma = require('../db')

// Helper function to get user's friends
const getUserFriends = async (userId) => {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { user1Id: userId },
        { user2Id: userId }
      ]
    },
    include: {
      user1: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isOnline: true,
          lastSeen: true,
          gumballs: true
        }
      },
      user2: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isOnline: true,
          lastSeen: true,
          gumballs: true
        }
      }
    }
  })

  return friendships.map(friendship => 
    friendship.user1Id === userId ? friendship.user2 : friendship.user1
  )
}

// Helper function to check if users are friends
const areFriends = async (user1Id, user2Id) => {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { user1Id: user1Id, user2Id: user2Id },
        { user1Id: user2Id, user2Id: user1Id }
      ]
    }
  })
  return !!friendship
}

const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' })
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }
    })

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if already friends
    const alreadyFriends = await areFriends(req.user.id, userId)
    if (alreadyFriends) {
      return res.status(400).json({ message: 'You are already friends with this user' })
    }

    // Check if request already exists
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: userId },
          { senderId: userId, receiverId: req.user.id }
        ],
        status: 'pending'
      }
    })

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already exists' })
    }

    // Create friend request
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: req.user.id,
        receiverId: userId
      },
      include: {
        sender: {
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

    res.status(201).json({
      message: 'Friend request sent successfully',
      request: friendRequest
    })
  } catch (error) {
    console.error('Send friend request error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const respondToFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params
    const { action } = req.body // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "accept" or "decline"' })
    }

    // Find the friend request
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' })
    }

    if (friendRequest.receiverId !== req.user.id) {
      return res.status(403).json({ message: 'You can only respond to requests sent to you' })
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request has already been responded to' })
    }

    if (action === 'accept') {
      // Create friendship and update request status
      await prisma.$transaction([
        prisma.friendship.create({
          data: {
            user1Id: friendRequest.senderId,
            user2Id: friendRequest.receiverId
          }
        }),
        prisma.friendRequest.update({
          where: { id: requestId },
          data: { status: 'accepted' }
        })
      ])

      res.json({ message: 'Friend request accepted successfully' })
    } else {
      // Just update request status
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'declined' }
      })

      res.json({ message: 'Friend request declined' })
    }
  } catch (error) {
    console.error('Respond to friend request error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getFriendRequests = async (req, res) => {
  try {
    const { type = 'received' } = req.query // 'sent' or 'received'

    const whereClause = type === 'sent' 
      ? { senderId: req.user.id }
      : { receiverId: req.user.id }

    const requests = await prisma.friendRequest.findMany({
      where: {
        ...whereClause,
        status: 'pending'
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            gumballs: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            gumballs: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ requests })
  } catch (error) {
    console.error('Get friend requests error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getFriends = async (req, res) => {
  try {
    // Use userId from params if provided, otherwise use current user's ID
    const targetUserId = req.params.userId || req.user.id

    const friends = await getUserFriends(targetUserId)

    res.json({
      friends,
      count: friends.length
    })
  } catch (error) {
    console.error('Get friends error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const removeFriend = async (req, res) => {
  try {
    const { userId } = req.params

    // Find and delete the friendship
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id, user2Id: userId },
          { user1Id: userId, user2Id: req.user.id }
        ]
      }
    })

    if (!friendship) {
      return res.status(404).json({ message: 'Friendship not found' })
    }

    await prisma.friendship.delete({
      where: { id: friendship.id }
    })

    res.json({ message: 'Friend removed successfully' })
  } catch (error) {
    console.error('Remove friend error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const checkFriendshipStatus = async (req, res) => {
  try {
    const { userId } = req.params

    if (userId === req.user.id) {
      return res.json({ status: 'self' })
    }

    // Check if they are friends
    const isFriend = await areFriends(req.user.id, userId)
    if (isFriend) {
      return res.json({ status: 'friends' })
    }

    // Check for pending request
    const pendingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: userId },
          { senderId: userId, receiverId: req.user.id }
        ],
        status: 'pending'
      }
    })

    if (pendingRequest) {
      const status = pendingRequest.senderId === req.user.id ? 'request_sent' : 'request_received'
      return res.json({ 
        status,
        requestId: pendingRequest.id
      })
    }

    res.json({ status: 'none' })
  } catch (error) {
    console.error('Check friendship status error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getFriendsForChat = async (req, res) => {
  try {
    const userId = req.user.id

    // Get accepted friendships where user is involved
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'accepted' },
          { addresseeId: userId, status: 'accepted' }
        ]
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isOnline: true
          }
        },
        addressee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isOnline: true
          }
        }
      }
    })

    // Extract friends (the other person in each friendship)
    const friends = friendships.map(friendship => {
      return friendship.requesterId === userId 
        ? friendship.addressee 
        : friendship.requester
    })

    res.json({ friends })
  } catch (error) {
    console.error('Get friends for chat error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}


module.exports = {
  sendFriendRequest,
  respondToFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  checkFriendshipStatus,
  getFriendsForChat
}