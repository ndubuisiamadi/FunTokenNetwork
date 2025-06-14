// src/stores/communities.js
import { defineStore } from 'pinia'
import { communitiesAPI } from '@/services/api'

export const useCommunitiesStore = defineStore('communities', {
  state: () => ({
    // All communities (explore page)
    allCommunities: [],
    
    // User's communities
    userCommunities: [],
    
    // Current community being viewed
    currentCommunity: null,
    
    // Community members
    communityMembers: [],
    
    // Community posts
    communityPosts: [],
    
    // Search results
    searchResults: [],
    searchQuery: '',
    
    // Loading states
    loading: false,
    loadingCommunity: false,
    loadingMembers: false,
    loadingPosts: false,
    
    // Action states
    joining: false,
    leaving: false,
    creating: false,
    updating: false,
    
    // Pagination
    hasMore: true,
    hasMoreMembers: true,
    hasMorePosts: true,
    currentPage: 1,
    membersPage: 1,
    postsPage: 1,
    
    // Errors
    error: null,
    joinError: null,
    createError: null
  }),

  getters: {
    // Get communities by user role
    ownedCommunities: (state) => {
      return state.userCommunities.filter(c => c.userRole === 'owner')
    },
    
    adminCommunities: (state) => {
      return state.userCommunities.filter(c => c.userRole === 'admin')
    },
    
    memberCommunities: (state) => {
      return state.userCommunities.filter(c => c.userRole === 'member')
    },
    
    // Check if user is member of specific community
    isMemberOf: (state) => (communityId) => {
      return state.userCommunities.some(c => c.id === communityId)
    },
    
    // Get user's role in specific community
    getUserRole: (state) => (communityId) => {
      const community = state.userCommunities.find(c => c.id === communityId)
      return community?.userRole || null
    },
    
    // Get community stats
    getTotalCommunitiesCount: (state) => state.userCommunities.length,
    
    // Check if user can manage community
    canManageCommunity: (state) => (communityId) => {
      const role = state.getUserRole(communityId)
      return role === 'owner' || role === 'admin'
    }
  },

  actions: {
    // Fetch all communities (explore page)
    async fetchAllCommunities(page = 1, limit = 20) {
      if (page === 1) {
        this.loading = true
        this.allCommunities = []
      }
      
      this.error = null

      try {
        const response = await communitiesAPI.getAllCommunities(page, limit)
        const { communities, pagination } = response.data

        if (page === 1) {
          this.allCommunities = communities
        } else {
          this.allCommunities.push(...communities)
        }

        this.currentPage = pagination.page
        this.hasMore = pagination.hasMore

        return { success: true, communities }
      } catch (error) {
        console.error('Fetch all communities error:', error)
        this.error = error.response?.data?.message || 'Failed to load communities'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Search communities
    async searchCommunities(query, page = 1, limit = 20) {
      if (page === 1) {
        this.loading = true
        this.searchResults = []
      }
      
      this.error = null
      this.searchQuery = query

      try {
        const response = await communitiesAPI.searchCommunities(query, page, limit)
        const { communities, pagination } = response.data

        if (page === 1) {
          this.searchResults = communities
        } else {
          this.searchResults.push(...communities)
        }

        this.currentPage = pagination.page
        this.hasMore = pagination.hasMore

        return { success: true, communities }
      } catch (error) {
        console.error('Search communities error:', error)
        this.error = error.response?.data?.message || 'Failed to search communities'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Fetch user's communities
    async fetchUserCommunities(filter = '', page = 1, limit = 20) {
      if (page === 1) {
        this.loading = true
        this.userCommunities = []
      }
      
      this.error = null

      try {
        const response = await communitiesAPI.getUserCommunities(filter, page, limit)
        const { communities, pagination } = response.data

        if (page === 1) {
          this.userCommunities = communities
        } else {
          this.userCommunities.push(...communities)
        }

        this.currentPage = pagination.page
        this.hasMore = pagination.hasMore

        return { success: true, communities }
      } catch (error) {
        console.error('Fetch user communities error:', error)
        this.error = error.response?.data?.message || 'Failed to load your communities'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Create new community
    async createCommunity(communityData) {
      this.creating = true
      this.createError = null

      try {
        const response = await communitiesAPI.createCommunity(communityData)
        const { community } = response.data

        // Add to user communities
        this.userCommunities.unshift(community)

        return { success: true, community }
      } catch (error) {
        console.error('Create community error:', error)
        this.createError = error.response?.data?.message || 'Failed to create community'
        return { success: false, error: this.createError }
      } finally {
        this.creating = false
      }
    },

    // Fetch specific community
    async fetchCommunity(communityId) {
      this.loadingCommunity = true
      this.error = null

      try {
        const response = await communitiesAPI.getCommunity(communityId)
        const { community } = response.data

        this.currentCommunity = community

        return { success: true, community }
      } catch (error) {
        console.error('Fetch community error:', error)
        this.error = error.response?.data?.message || 'Failed to load community'
        return { success: false, error: this.error }
      } finally {
        this.loadingCommunity = false
      }
    },

    // Join community - UPDATED to remove from explore list
async joinCommunity(communityId) {
  this.joining = true
  this.joinError = null

  try {
    const response = await communitiesAPI.joinCommunity(communityId)
    const community = response.data.community

    // Update current community if it's the one we joined
    if (this.currentCommunity?.id === communityId) {
      this.currentCommunity.isMember = true
      this.currentCommunity.userRole = 'member'
      this.currentCommunity.memberCount = community.memberCount
    }

    // REMOVE from all communities list (explore page)
    this.allCommunities = this.allCommunities.filter(c => c.id !== communityId)
    
    // REMOVE from search results if they exist
    this.searchResults = this.searchResults.filter(c => c.id !== communityId)

    // Add to user communities
    this.userCommunities.unshift({
      ...community,
      userRole: 'member',
      isMember: true
    })

    return { success: true }
  } catch (error) {
    console.error('Join community error:', error)
    this.joinError = error.response?.data?.message || 'Failed to join community'
    return { success: false, error: this.joinError }
  } finally {
    this.joining = false
  }
},

    // Leave community
    async leaveCommunity(communityId) {
      this.leaving = true
      this.error = null

      try {
        await communitiesAPI.leaveCommunity(communityId)

        // Update current community if it's the one we left
        if (this.currentCommunity?.id === communityId) {
          this.currentCommunity.isMember = false
          this.currentCommunity.userRole = null
          this.currentCommunity.memberCount -= 1
        }

        // Update in all communities list
        const communityIndex = this.allCommunities.findIndex(c => c.id === communityId)
        if (communityIndex !== -1) {
          this.allCommunities[communityIndex].isMember = false
          this.allCommunities[communityIndex].userRole = null
          this.allCommunities[communityIndex].memberCount -= 1
        }

        // Remove from user communities
        this.userCommunities = this.userCommunities.filter(c => c.id !== communityId)

        return { success: true }
      } catch (error) {
        console.error('Leave community error:', error)
        this.error = error.response?.data?.message || 'Failed to leave community'
        return { success: false, error: this.error }
      } finally {
        this.leaving = false
      }
    },

    // Fetch community members
    async fetchCommunityMembers(communityId, page = 1, limit = 20) {
      if (page === 1) {
        this.loadingMembers = true
        this.communityMembers = []
      }

      try {
        const response = await communitiesAPI.getCommunityMembers(communityId, page, limit)
        const { members, pagination } = response.data

        if (page === 1) {
          this.communityMembers = members
        } else {
          this.communityMembers.push(...members)
        }

        this.membersPage = pagination.page
        this.hasMoreMembers = pagination.hasMore

        return { success: true, members }
      } catch (error) {
        console.error('Fetch community members error:', error)
        return { success: false, error: error.response?.data?.message || 'Failed to load members' }
      } finally {
        this.loadingMembers = false
      }
    },

    // Fetch community posts
    async fetchCommunityPosts(communityId, page = 1, limit = 10) {
      if (page === 1) {
        this.loadingPosts = true
        this.communityPosts = []
      }

      try {
        const response = await communitiesAPI.getCommunityPosts(communityId, page, limit)
        const { posts, pagination } = response.data

        if (page === 1) {
          this.communityPosts = posts
        } else {
          this.communityPosts.push(...posts)
        }

        this.postsPage = pagination.page
        this.hasMorePosts = pagination.hasMore

        return { success: true, posts }
      } catch (error) {
        console.error('Fetch community posts error:', error)
        return { success: false, error: error.response?.data?.message || 'Failed to load posts' }
      } finally {
        this.loadingPosts = false
      }
    },

async updateCommunity(communityId, updateData) {
  this.updating = true
  this.error = null

  try {
    const response = await communitiesAPI.updateCommunity(communityId, updateData)
    const { community } = response.data

    // Update current community
    if (this.currentCommunity?.id === communityId) {
      this.currentCommunity = { ...this.currentCommunity, ...community }
    }

    // Update in user communities list
    const userCommunityIndex = this.userCommunities.findIndex(c => c.id === communityId)
    if (userCommunityIndex !== -1) {
      this.userCommunities[userCommunityIndex] = { 
        ...this.userCommunities[userCommunityIndex], 
        ...community 
      }
    }

    // Update in all communities list
    const allCommunityIndex = this.allCommunities.findIndex(c => c.id === communityId)
    if (allCommunityIndex !== -1) {
      this.allCommunities[allCommunityIndex] = { 
        ...this.allCommunities[allCommunityIndex], 
        ...community 
      }
    }

    return { success: true, community }
  } catch (error) {
    console.error('Update community error:', error)
    this.error = error.response?.data?.message || 'Failed to update community'
    return { success: false, error: this.error }
  } finally {
    this.updating = false
  }
},

    // Clear current community
    clearCurrentCommunity() {
      this.currentCommunity = null
      this.communityMembers = []
      this.communityPosts = []
      this.hasMoreMembers = true
      this.hasMorePosts = true
      this.membersPage = 1
      this.postsPage = 1
    },

    // Clear search results
    clearSearch() {
      this.searchResults = []
      this.searchQuery = ''
      this.hasMore = true
      this.currentPage = 1
    }
  }
})