// backend/src/services/twitterVerificationService.js
// Twitter Verification Service

class TwitterVerificationService {
  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY
    this.baseURL = 'https://twitter241.p.rapidapi.com'
    this.headers = {
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': 'twitter241.p.rapidapi.com',
      'Content-Type': 'application/json'
    }
  }

  async makeAPIRequest(endpoint, params = {}, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        let url = `${this.baseURL}${endpoint}`
        
        if (Object.keys(params).length > 0) {
          const queryString = new URLSearchParams(params).toString()
          url += `?${queryString}`
        }

        console.log(`🔄 [Attempt ${attempt}] ${endpoint}`)

        const response = await fetch(url, {
          method: 'GET',
          headers: this.headers,
          timeout: 15000
        })

        let data
        try {
          data = await response.json()
        } catch (e) {
          data = await response.text()
        }

        if (response.ok) {
          console.log(`✅ Success: ${endpoint}`)
          return { success: true, data, status: response.status }
        } else {
          console.log(`❌ HTTP Error ${response.status}: ${endpoint}`)
          if (attempt === retries) {
            return { success: false, error: `HTTP ${response.status}`, data }
          }
        }

      } catch (error) {
        console.log(`❌ Request Error: ${error.message}`)
        if (attempt === retries) {
          return { success: false, error: error.message }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }

  // 🎯 CORE METHOD: Verify using user's following list
  async verifyUserFollowsTarget(userTwitterId, targetUsername) {
    try {
      console.log(`🔍 Checking if user ${userTwitterId} follows @${targetUsername}`)

      // First, try with just 3 most recent followings (should be faster and cheaper)
      console.log('🚀 Checking 3 most recent followings...')
      const result = await this.makeAPIRequest('/followings', {
        user: userTwitterId,
        count: 3
      })

      if (!result.success) {
        return {
          verified: false,
          reason: `Failed to get user's following list: ${result.error}`,
          confidence: 'low'
        }
      }

      // 🐛 DEBUG: Log the actual API response structure
      console.log('🐛 DEBUG: API Response structure:', JSON.stringify(result.data, null, 2))

      const following = this.extractFollowingFromResponse(result.data)
      
      // 🐛 DEBUG: Log what we extracted
      console.log('🐛 DEBUG: Extracted following array length:', following ? following.length : 'null/undefined')
      console.log('🐛 DEBUG: Following accounts:', following ? following.map(f => this.extractUsernameFromAccount(f)) : 'none')
      
      if (!following || following.length === 0) {
        return {
          verified: false,
          reason: 'No following data available for user. User may have private account or no followings.',
          confidence: 'low',
          debug: {
            apiResponseKeys: Object.keys(result.data || {}),
            rawResponse: result.data
          }
        }
      }

      console.log(`📊 Checking ${following.length} recent followings for @${targetUsername}`)

      // Search for target account in user's following list
      const targetLower = targetUsername.toLowerCase()
      console.log(`🎯 Looking for target: "${targetLower}"`)
      
      let foundMatch = false
      const isFollowing = following.some((account, index) => {
        const username = this.extractUsernameFromAccount(account)
        console.log(`  ${index + 1}. Checking: "${username}" vs "${targetLower}"`)
        
        const matches = username && username === targetLower
        if (matches) {
          console.log(`✅ MATCH FOUND: ${username} === ${targetLower}`)
          foundMatch = true
        }
        return matches
      })

      if (isFollowing && foundMatch) {
        console.log(`✅ Verification SUCCESS: User follows @${targetUsername}`)
        return {
          verified: true,
          reason: `User is following @${targetUsername}`,
          confidence: 'high',
          followingCount: following.length,
          sampleFollowing: following.map(f => this.extractUsernameFromAccount(f))
        }
      }

      // If not found in recent 3, the user might not have followed recently
      // or might have many followings. Let's provide helpful feedback.
      console.log(`❌ @${targetUsername} not found in ${following.length} recent followings`)
      const foundUsernames = following.map(f => this.extractUsernameFromAccount(f)).filter(Boolean)
      
      return {
        verified: false,
        reason: `@${targetUsername} not found in recent followings. Please make sure you followed the account and try again. Recent followings: ${foundUsernames.map(u => '@' + u).join(', ')}`,
        confidence: 'medium',
        followingCount: following.length,
        sampleFollowing: foundUsernames,
        suggestion: 'Make sure you followed the account and wait a few seconds before verifying'
      }

    } catch (error) {
      console.error('❌ Follow verification failed:', error.message)
      return {
        verified: false,
        reason: `Verification failed: ${error.message}`,
        confidence: 'low'
      }
    }
  }

  // Extract following list from API response
  extractFollowingFromResponse(data) {
    console.log('🔍 Attempting to extract following list from response...')
    
    try {
      // Handle the specific Twitter API v2 response structure
      if (data && data.result && data.result.timeline && data.result.timeline.instructions) {
        const instructions = data.result.timeline.instructions
        
        for (const instruction of instructions) {
          if (instruction.entries && Array.isArray(instruction.entries)) {
            const users = []
            
            for (const entry of instruction.entries) {
              // Skip cursor entries
              if (entry.entryId && entry.entryId.startsWith('cursor-')) {
                continue
              }
              
              // Extract user from the complex nested structure
              const userResult = entry.content?.itemContent?.user_results?.result
              if (userResult && userResult.core && userResult.core.screen_name) {
                users.push({
                  username: userResult.core.screen_name,
                  screen_name: userResult.core.screen_name,
                  name: userResult.core.name,
                  rest_id: userResult.rest_id
                })
              }
            }
            
            if (users.length > 0) {
              // Limit to exactly 3 most recent followings
              const limitedUsers = users.slice(0, 3)
              console.log(`✅ Found ${users.length} users, limiting to ${limitedUsers.length} most recent`)
              console.log('📋 Recent usernames:', limitedUsers.map(u => u.username).join(', '))
              return limitedUsers
            }
          }
        }
      }

      // Fallback: try simpler structure paths
      const possiblePaths = [
        'result',
        'data',
        'following', 
        'users',
        'followings',
        'friends'
      ]

      for (const path of possiblePaths) {
        const value = this.getNestedValue(data, path)
        if (Array.isArray(value) && value.length > 0) {
          console.log(`✅ Found following array at path: ${path}, length: ${value.length}`)
          return value
        }
      }

      // If data itself is an array
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ Data itself is an array, length: ${data.length}`)
        return data
      }

      console.log('❌ No following array found in any expected path')
      console.log('Available keys in response:', Object.keys(data || {}))
      
      return []
      
    } catch (error) {
      console.error('Error parsing response:', error)
      return []
    }
  }

  // Helper to get nested object values by string path
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null
    }, obj)
  }

  // Extract username from account object
  extractUsernameFromAccount(account) {
    if (!account || typeof account !== 'object') {
      return null
    }

    // For the specific Twitter API response format
    if (account.username) {
      return account.username.toLowerCase()
    }
    
    if (account.screen_name) {
      return account.screen_name.toLowerCase()
    }

    // Try other possible username fields for backwards compatibility
    const usernameFields = [
      'handle',
      'name',
      'user_name',
      'screenName',
      'login',
      'account_name'
    ]

    for (const field of usernameFields) {
      const value = account[field]
      if (value && typeof value === 'string') {
        // Remove @ symbol if present and return lowercase
        return value.replace('@', '').toLowerCase()
      }
    }

    console.log('⚠️ Could not extract username from account:', account)
    return null
  }

  // Test if user's Twitter ID is valid
  async validateUserTwitterId(userTwitterId) {
    try {
      console.log(`🔍 Validating user Twitter ID: ${userTwitterId}`)
      
      const result = await this.makeAPIRequest('/followings', {
        user: userTwitterId,
        count: 3  // Just need to verify the ID works, don't need many
      })

      if (result.success) {
        const following = this.extractFollowingFromResponse(result.data)
        return {
          valid: true,
          followingCount: following ? following.length : 0,
          message: 'User Twitter ID is valid'
        }
      } else {
        return {
          valid: false,
          error: result.error,
          message: 'Invalid Twitter ID or account is private'
        }
      }

    } catch (error) {
      return {
        valid: false,
        error: error.message,
        message: 'Failed to validate Twitter ID'
      }
    }
  }

  // Health check for the API
  async healthCheck() {
    try {
      const result = await this.makeAPIRequest('/followings', {
        user: '783214', // @twitter account
        count: 3
      }, 1)
      
      return {
        status: result.success ? 'healthy' : 'unhealthy',
        error: result.success ? null : result.error,
        timestamp: new Date().toISOString(),
        provider: 'twitter241.p.rapidapi.com'
      }

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        provider: 'twitter241.p.rapidapi.com'
      }
    }
  }
}

module.exports = TwitterVerificationService