// src/stores/search.js
import { defineStore } from 'pinia'
import { searchAPI } from '@/services/api'

export const useSearchStore = defineStore('search', {
  state: () => ({
    query: '',
    isSearching: false,
    results: {
      posts: [],
      users: [],
      communities: []
    },
    totalResults: {
      posts: 0,
      users: 0,
      communities: 0
    },
    loading: false,
    error: null,
    hasMore: {
      posts: true,
      users: true,
      communities: true
    },
    currentPage: {
      posts: 1,
      users: 1,
      communities: 1
    }
  }),

  getters: {
    hasResults: (state) => {
      return state.results.posts.length > 0 || 
             state.results.users.length > 0 || 
             state.results.communities.length > 0
    },
    
    totalCount: (state) => {
      return state.totalResults.posts + 
             state.totalResults.users + 
             state.totalResults.communities
    }
  },

  actions: {
    // Global search using your existing API
    // Updated search store to handle standardized responses
async search(query) {
  if (!query.trim()) {
    this.clearResults()
    return { success: true }
  }

  if (this.loading) {
    return { success: false, error: 'Search already in progress' }
  }

  this.loading = true
  this.error = null
  this.query = query
  this.isSearching = true

  try {
    const response = await searchAPI.globalSearch(query, {
      types: ['users', 'communities', 'posts'],
      limit: 5
    })

    if (response.success) {
      // Now response.results has consistent format from backend
      this.results = response.results
      this.totalResults = {
        posts: response.results.posts?.length || 0,
        users: response.results.users?.length || 0,
        communities: response.results.communities?.length || 0
      }
      return { success: true }
    } else {
      this.error = response.error || 'Search failed'
      return { success: false, error: this.error }
    }
  } catch (error) {
    console.error('Search error:', error)
    this.error = error.message || 'Search failed'
    return { success: false, error: this.error }
  } finally {
    this.loading = false
  }
},

    // Search specific type with pagination using individual API calls
    async searchType(type, page = 1) {
      if (!this.query.trim()) return

      try {
        let response
        switch (type) {
          case 'posts':
            response = await searchAPI.searchPosts(this.query, page)
            break
          case 'users':
            response = await searchAPI.searchUsers(this.query, page)
            break
          case 'communities':
            response = await searchAPI.searchCommunities(this.query, page)
            break
          default:
            return { success: false, error: 'Invalid search type' }
        }

        // Handle different response structures
        let data, pagination
        
        if (type === 'posts' && response.data.posts) {
          data = response.data.posts
          pagination = response.data.pagination
        } else if (type === 'users' && response.data.users) {
          data = response.data.users
          pagination = response.data.pagination
        } else if (type === 'communities' && response.data.communities) {
          data = response.data.communities
          pagination = response.data.pagination
        } else {
          // Fallback for direct data response
          data = response.data.data || response.data
          pagination = response.data.pagination
        }
        
        if (page === 1) {
          this.results[type] = data || []
        } else {
          this.results[type].push(...(data || []))
        }

        this.currentPage[type] = page
        this.hasMore[type] = pagination?.hasMore ?? (data?.length >= 10)
        
        // Update total count if provided
        if (pagination?.total) {
          this.totalResults[type] = pagination.total
        }

        return { success: true }
      } catch (error) {
        console.error(`Search ${type} error:`, error)
        return { success: false, error: error.response?.data?.message }
      }
    },

    // Load more results for a specific type
    async loadMore(type) {
      if (!this.hasMore[type] || this.loading) return
      
      const nextPage = this.currentPage[type] + 1
      return await this.searchType(type, nextPage)
    },

    // Clear search results
    clearResults() {
      this.query = ''
      this.isSearching = false
      this.results = {
        posts: [],
        users: [],
        communities: []
      }
      this.totalResults = {
        posts: 0,
        users: 0,
        communities: 0
      }
      this.currentPage = {
        posts: 1,
        users: 1,
        communities: 1
      }
      this.hasMore = {
        posts: true,
        users: true,
        communities: true
      }
      this.error = null
    },

    // Clear only the query but keep results for back navigation
    clearQuery() {
      this.query = ''
    }
  }
})