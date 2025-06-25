// src/stores/users.js - NEW FILE
import { defineStore } from 'pinia'
import { usersAPI, friendsAPI } from '@/services/api'

export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [],
    currentUser: null,  // This is key!
  friendRequests: [], // This holds ALL requests
    friends: [],
    searchResults: [],
    loading: false,
    error: null,
    searchQuery: '',
    hasMore: true,
    currentPage: 1,
    
    // Friend request states
    sendingRequest: false,
    respondingToRequest: false
  }),

  getters: {
    allUsers: (state) => state.users,
    
    // Filter users by friendship status
    getUsersByStatus: (state) => (status) => {
      return state.users.filter(user => user.friendshipStatus === status)
    },
    
    // Get pending friend requests (received) - fixed filtering
  receivedRequests: (state) => {
    if (!state.currentUser?.id) return []
    return state.friendRequests.filter(req => req.receiverId === state.currentUser.id && req.status === 'pending')
  },
  
  // Get sent friend requests - fixed filtering
  sentRequests: (state) => {
    if (!state.currentUser?.id) return []
    return state.friendRequests.filter(req => req.senderId === state.currentUser.id && req.status === 'pending')
  },
  
    
    // Check if user is a friend
    isFriend: (state) => (userId) => {
      return state.friends.some(friend => friend.id === userId)
    },
    
    // Get friendship status for a user
    getFriendshipStatus: (state) => (userId) => {
      const user = state.users.find(u => u.id === userId)
      return user?.friendshipStatus || 'none'
    }
  },

  actions: {
    // Search users
    async searchUsers(query, page = 1) {
      if (page === 1) {
        this.loading = true
        this.searchResults = []
      }
      
      this.error = null
      this.searchQuery = query

      try {
        const response = await usersAPI.searchUsers(query, page)
        const { users, pagination } = response.data

        if (page === 1) {
          this.searchResults = users
        } else {
          this.searchResults.push(...users)
        }

        this.currentPage = pagination.page
        this.hasMore = pagination.hasMore

        return { success: true, users }
      } catch (error) {
        console.error('Search users error:', error)
        this.error = error.response?.data?.message || 'Failed to search users'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Get all users (browse)
    async getAllUsers(page = 1) {
      if (page === 1) {
        this.loading = true
        this.users = []
      }
      
      this.error = null

      try {
        const response = await usersAPI.getAllUsers(page)
        const { users, pagination } = response.data

        if (page === 1) {
          this.users = users
        } else {
          this.users.push(...users)
        }

        this.currentPage = pagination.page
        this.hasMore = pagination.hasMore

        return { success: true, users }
      } catch (error) {
        console.error('Get users error:', error)
        this.error = error.response?.data?.message || 'Failed to load users'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Get user by ID
    async getUserById(userId) {
      this.loading = true
      this.error = null

      try {
        const response = await usersAPI.getUserById(userId)
        this.currentUser = response.data.user

        // Update user in lists if present
        this.updateUserInLists(response.data.user)

        return { success: true, user: response.data.user }
      } catch (error) {
        console.error('Get user error:', error)
        this.error = error.response?.data?.message || 'Failed to load user'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Send friend request
    async sendFriendRequest(userId) {
      this.sendingRequest = true
      this.error = null

      try {
        const response = await friendsAPI.sendRequest(userId)

        // Update user status in local lists immediately
        this.updateUserFriendshipStatus(userId, 'request_sent')

        // Refresh friend requests to get the new request
        await this.getFriendRequests()

        return { success: true, request: response.data.request }
      } catch (error) {
        console.error('Send friend request error:', error)
        this.error = error.response?.data?.message || 'Failed to send friend request'
        return { success: false, error: this.error }
      } finally {
        this.sendingRequest = false
      }
    },

    // Respond to friend request
    async respondToFriendRequest(requestId, action) {
      this.respondingToRequest = true
      this.error = null

      try {
        const response = await friendsAPI.respondToRequest(requestId, action)

        // Refresh friend requests and friends list
        await this.getFriendRequests()
        if (action === 'accept') {
          await this.getFriends()
        }

        return { success: true, message: response.data.message }
      } catch (error) {
        console.error('Respond to friend request error:', error)
        this.error = error.response?.data?.message || 'Failed to respond to friend request'
        return { success: false, error: this.error }
      } finally {
        this.respondingToRequest = false
      }
    },

    // Add this method to your users.js store actions
// Replace your cancelFriendRequest method with this simpler version
async cancelFriendRequest(userId) {
  this.actionLoading = true
  this.error = null

  try {
    // First, refresh requests to get the latest data
    await this.getFriendRequests()
    
    // Find the request in the current sentRequests
    const sentRequest = this.sentRequests.find(
      req => req.receiver?.id === userId || req.receiverId === userId
    )

    if (!sentRequest) {
      // If no sent request found, the UI state is out of sync
      // Reset the user's friendship status and refresh data
      this.updateUserFriendshipStatus(userId, 'none')
      await this.getFriendRequests()
      return { success: true, message: 'Request already cancelled or does not exist' }
    }

    const response = await friendsAPI.cancelRequest(sentRequest.id)

    // Update user status in local lists immediately
    this.updateUserFriendshipStatus(userId, 'none')

    // Refresh friend requests to remove the cancelled request
    await this.getFriendRequests()

    return { success: true, message: response.data.message }
  } catch (error) {
    console.error('Cancel friend request error:', error)
    
    // If request not found on server, sync the UI state
    if (error.response?.status === 404) {
      this.updateUserFriendshipStatus(userId, 'none')
      await this.getFriendRequests()
      return { success: true, message: 'Request already cancelled' }
    }
    
    this.error = error.response?.data?.message || 'Failed to cancel friend request'
    return { success: false, error: this.error }
  } finally {
    this.actionLoading = false
  }
},

        // Get friend requests - fetch both types
    async getFriendRequests() {
      try {
        const [receivedResponse, sentResponse] = await Promise.all([
          friendsAPI.getRequests('received'),
          friendsAPI.getRequests('sent')
        ])

        // Combine both arrays
        this.friendRequests = [
          ...receivedResponse.data.requests,
          ...sentResponse.data.requests
        ]

        return { success: true }
      } catch (error) {
        console.error('Get friend requests error:', error)
        this.error = error.response?.data?.message || 'Failed to load friend requests'
        return { success: false, error: this.error }
      }
    },

    // Get friends list
    async getFriends(userId = null) {
      try {
        const response = await friendsAPI.getFriends(userId)
        this.friends = response.data.friends
        return { success: true, friends: response.data.friends }
      } catch (error) {
        console.error('Get friends error:', error)
        this.error = error.response?.data?.message || 'Failed to load friends'
        return { success: false, error: this.error }
      }
    },

    // Remove friend
    async removeFriend(userId) {
      try {
        const response = await friendsAPI.removeFriend(userId)

        // Update user status in local lists
        this.updateUserFriendshipStatus(userId, 'none')

        // Remove from friends list
        this.friends = this.friends.filter(friend => friend.id !== userId)

        return { success: true, message: response.data.message }
      } catch (error) {
        console.error('Remove friend error:', error)
        this.error = error.response?.data?.message || 'Failed to remove friend'
        return { success: false, error: this.error }
      }
    },

    // Load more users (pagination)
    async loadMore() {
      if (!this.hasMore || this.loading) return

      if (this.searchQuery) {
        return await this.searchUsers(this.searchQuery, this.currentPage + 1)
      } else {
        return await this.getAllUsers(this.currentPage + 1)
      }
    },

    async removeFriend(userId) {
      this.actionLoading = true
      try {
        const response = await friendsAPI.removeFriend(userId)
        
        // Update local data
        this.updateUserInLists({ 
          id: userId, 
          friendshipStatus: 'none' 
        })
        
        return { success: true }
      } catch (error) {
        console.error('Remove friend error:', error)
        return { 
          success: false, 
          error: error.response?.data?.message || 'Failed to remove friend' 
        }
      } finally {
        this.actionLoading = false
      }
    },

    // Helper: Update user in all lists
    updateUserInLists(updatedUser) {
      // Update in users list
      const userIndex = this.users.findIndex(u => u.id === updatedUser.id)
      if (userIndex !== -1) {
        this.users[userIndex] = { ...this.users[userIndex], ...updatedUser }
      }

      // Update in search results
      const searchIndex = this.searchResults.findIndex(u => u.id === updatedUser.id)
      if (searchIndex !== -1) {
        this.searchResults[searchIndex] = { ...this.searchResults[searchIndex], ...updatedUser }
      }
    },

    // Helper: Update user friendship status
    updateUserFriendshipStatus(userId, status, requestId = null) {
      const updateUser = (user) => {
        if (user.id === userId) {
          user.friendshipStatus = status
          if (requestId) {
            user.friendRequestId = requestId
          }
        }
      }

      this.users.forEach(updateUser)
      this.searchResults.forEach(updateUser)
    },

    // Set current user (call this from auth store when user logs in)
    setCurrentUser(user) {
      this.currentUser = user
    },

    // Clear search
    clearSearch() {
      this.searchQuery = ''
      this.searchResults = []
      this.currentPage = 1
      this.hasMore = true
    },

    // Clear errors
    clearError() {
      this.error = null
    },

    // Reset store
    reset() {
      this.users = []
      this.currentUser = null
      this.friendRequests = []
      this.friends = []
      this.searchResults = []
      this.loading = false
      this.error = null
      this.searchQuery = ''
      this.hasMore = true
      this.currentPage = 1
      this.sendingRequest = false
      this.respondingToRequest = false
    }
  }
})