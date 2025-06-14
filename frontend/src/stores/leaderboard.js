// src/stores/leaderboard.js
import { defineStore } from 'pinia'
import { leaderboardAPI } from '@/services/api'

export const useLeaderboardStore = defineStore('leaderboard', {
  state: () => ({
  users: [],
  userRankInfo: null,
  topAchievers: [],
  levelDistribution: [],
  loading: false,
  error: null,
  filters: {
    period: 'all',
    level: 'all',
    page: 1,
    limit: 30 // Changed from 50 to 30
  },
  hasMore: false, // Changed default since we're limiting to 30
  totalCount: 0,
  searchResults: [], // Add search results
  isSearching: false
}),

  getters: {
    sortedUsers: (state) => {
      return [...state.users].sort((a, b) => (a.rank || 0) - (b.rank || 0))
    },

    currentUserRank: (state) => {
      return state.userRankInfo?.user?.globalRank || null
    },

    currentUserLevel: (state) => {
      return state.userRankInfo?.user?.level || 'Novice'
    },

    levelThresholds: () => ({
      'Novice': { min: 0, max: 999, color: '#9CA3AF' },
      'Apprentice': { min: 1000, max: 4999, color: '#059669' },
      'Expert': { min: 5000, max: 19999, color: '#0284C7' },
      'Master': { min: 20000, max: 49999, color: '#7C3AED' },
      'Grandmaster': { min: 50000, max: Infinity, color: '#DC2626' }
    }),

    getLevelColor: (state) => (level) => {
      const thresholds = state.levelThresholds
      return thresholds[level]?.color || '#9CA3AF'
    }
  },

  actions: {
    async fetchLeaderboard(params = {}) {
      console.log('Fetching leaderboard:', params)
      
      this.loading = true
      this.error = null

      // Update filters
      this.filters = { ...this.filters, ...params }

      try {
        const response = await leaderboardAPI.getLeaderboard({
          period: this.filters.period,
          level: this.filters.level,
          page: this.filters.page,
          limit: this.filters.limit
        })

        const { users, pagination } = response.data

        if (this.filters.page === 1) {
          // Fresh load - replace all users
          this.users = users
        } else {
          // Pagination - append users
          this.users.push(...users)
        }

        this.hasMore = pagination.hasMore
        this.totalCount = pagination.total

        return { success: true, users }
      } catch (error) {
        console.error('Fetch leaderboard error:', error)
        this.error = error.response?.data?.message || 'Failed to load leaderboard'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    async fetchUserRankInfo() {
      try {
        const response = await leaderboardAPI.getUserRankInfo()
        this.userRankInfo = response.data
        return { success: true, data: response.data }
      } catch (error) {
        console.error('Fetch user rank error:', error)
        return { success: false, error: error.response?.data?.message || 'Failed to load user rank' }
      }
    },

    async fetchTopAchievers(limit = 5) {
      try {
        const response = await leaderboardAPI.getTopAchievers(limit)
        this.topAchievers = response.data.users
        return { success: true, users: response.data.users }
      } catch (error) {
        console.error('Fetch top achievers error:', error)
        return { success: false, error: error.response?.data?.message || 'Failed to load top achievers' }
      }
    },

    async fetchLevelDistribution() {
      try {
        const response = await leaderboardAPI.getLevelDistribution()
        this.levelDistribution = response.data.distribution
        return { success: true, distribution: response.data.distribution }
      } catch (error) {
        console.error('Fetch level distribution error:', error)
        return { success: false, error: error.response?.data?.message || 'Failed to load level distribution' }
      }
    },

    // Load more users (pagination)
    async loadMore() {
      if (!this.hasMore || this.loading) return

      return await this.fetchLeaderboard({
        page: this.filters.page + 1
      })
    },

    // Refresh the leaderboard
    async refresh() {
      this.filters.page = 1
      this.hasMore = true
      return await this.fetchLeaderboard()
    },

    // Change filters and reload
    async changeFilters(newFilters) {
      this.filters = { ...this.filters, ...newFilters, page: 1 }
      this.users = []
      this.hasMore = true
      return await this.fetchLeaderboard()
    },

    // New search action
  async searchUsers(query) {
    if (!query.trim()) {
      this.searchResults = []
      this.isSearching = false
      return { success: true, users: [] }
    }

    this.isSearching = true
    try {
      const response = await leaderboardAPI.searchUsers(query, {
        period: this.filters.period,
        level: this.filters.level
      })
      
      this.searchResults = response.data.users
      return { success: true, users: response.data.users }
    } catch (error) {
      console.error('Search users error:', error)
      this.searchResults = []
      return { success: false, error: error.response?.data?.message || 'Search failed' }
    } finally {
      this.isSearching = false
    }
  },

  // Clear search
  clearSearch() {
    this.searchResults = []
    this.isSearching = false
  },

    // Clear data
    clearData() {
      this.users = []
      this.userRankInfo = null
      this.topAchievers = []
      this.levelDistribution = []
      this.filters.page = 1
      this.hasMore = true
      this.error = null
    },

    // Clear errors
    clearError() {
      this.error = null
    }
  }
})