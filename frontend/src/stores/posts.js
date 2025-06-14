// src/stores/posts.js
import { defineStore } from 'pinia'
import { postsAPI } from '@/services/api'

export const usePostsStore = defineStore('posts', {
  state: () => ({
    posts: [],
    loading: false,
    error: null,
    hasMore: true,
    currentPage: 1,
    creating: false,
    createError: null
  }),

  getters: {
    sortedPosts: (state) => {
      return [...state.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    },
    
    getPostById: (state) => (id) => {
      return state.posts.find(post => post.id === id)
    }
  },

  actions: {
    // Fetch posts for the feed
    async fetchFeed(page = 1, limit = 10) {
      // Don't show loading for page > 1 (pagination)
      if (page === 1) {
        this.loading = true
      }
      this.error = null

      try {
        console.log(`Fetching feed - page: ${page}, limit: ${limit}`)
        const response = await postsAPI.getFeed(page, limit)
        const { posts, pagination } = response.data

        console.log('Feed response:', { posts, pagination })

        if (page === 1) {
          // Fresh load - replace all posts
          this.posts = posts
        } else {
          // Pagination - append posts
          this.posts.push(...posts)
        }

        this.currentPage = pagination.page
        this.hasMore = pagination.hasMore

        return { success: true, posts }
      } catch (error) {
        console.error('Fetch feed error:', error)
        this.error = error.response?.data?.message || 'Failed to load posts'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Create a new post
    async createPost(postData) {
      this.creating = true
      this.createError = null

      try {
        console.log('Creating post with data:', postData)
        const response = await postsAPI.createPost(postData)
        const newPost = response.data.post

        console.log('Post created successfully:', newPost)

        // Add the new post to the beginning of the feed
        this.posts.unshift(newPost)

        return { success: true, post: newPost }
      } catch (error) {
        console.error('Create post error:', error)
        this.createError = error.response?.data?.message || 'Failed to create post'
        return { success: false, error: this.createError }
      } finally {
        this.creating = false
      }
    },

    // Like a post
    async likePost(postId) {
      try {
        await postsAPI.likePost(postId)
        
        // Update the post in the store
        const post = this.posts.find(p => p.id === postId)
        if (post) {
          post.isLiked = true
          post.likesCount = (post.likesCount || 0) + 1
        }

        return { success: true }
      } catch (error) {
        console.error('Like post error:', error)
        return { success: false, error: error.response?.data?.message || 'Failed to like post' }
      }
    },

    // Unlike a post
    async unlikePost(postId) {
      try {
        await postsAPI.unlikePost(postId)
        
        // Update the post in the store
        const post = this.posts.find(p => p.id === postId)
        if (post) {
          post.isLiked = false
          post.likesCount = Math.max(0, (post.likesCount || 0) - 1)
        }

        return { success: true }
      } catch (error) {
        console.error('Unlike post error:', error)
        return { success: false, error: error.response?.data?.message || 'Failed to unlike post' }
      }
    },

    // Delete a post
    async deletePost(postId) {
      try {
        await postsAPI.deletePost(postId)
        
        // Remove the post from the store
        this.posts = this.posts.filter(p => p.id !== postId)

        return { success: true }
      } catch (error) {
        console.error('Delete post error:', error)
        return { success: false, error: error.response?.data?.message || 'Failed to delete post' }
      }
    },

    // Load more posts (pagination)
    async loadMore() {
      if (!this.hasMore || this.loading) return

      return await this.fetchFeed(this.currentPage + 1)
    },

    // Refresh the feed
    async refresh() {
      this.currentPage = 1
      this.hasMore = true
      return await this.fetchFeed(1)
    },

    // Clear all posts
    clearPosts() {
      this.posts = []
      this.currentPage = 1
      this.hasMore = true
      this.error = null
    },

    // Clear errors
    clearError() {
      this.error = null
      this.createError = null
    }
  }
})