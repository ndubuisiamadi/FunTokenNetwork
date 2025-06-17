// src/services/search.js
import { api } from './api'

export const searchAPI = {
  // Global search across posts, users, and communities
  globalSearch: (query, filters = {}) => {
    const params = new URLSearchParams({
      q: query,
      ...filters
    })
    return api.get(`/search?${params}`)
  },
  
  // Search specific types
  searchPosts: (query, page = 1, limit = 10) => 
    api.get(`/search/posts?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
    
  searchUsers: (query, page = 1, limit = 10) => 
    api.get(`/search/users?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
    
  searchCommunities: (query, page = 1, limit = 10) => 
    api.get(`/search/communities?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`)
}