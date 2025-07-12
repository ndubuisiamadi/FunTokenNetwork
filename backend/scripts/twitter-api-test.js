// Twttr API Specific Tester for Your Basic Plan
// ==============================================

class TwttrAPITester {
  constructor() {
    // Your actual API key from the subscription
    this.apiKey = '13b3f730e0msh1ff628e420c105ap163a6fjsnc80771ebc4a4' // Update with your real key
    this.baseURL = 'https://twitter241.p.rapidapi.com'
    this.headers = {
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': 'twitter241.p.rapidapi.com',
      'Content-Type': 'application/json'
    }
    
    // Test data - known user IDs for testing
    this.testUsers = {
      'ND': '744609635676602368',
    }
  }

  async makeRequest(endpoint, params = {}) {
    const startTime = Date.now()
    
    try {
      let url = `${this.baseURL}${endpoint}`
      
      if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString()
        url += `?${queryString}`
      }
      
      console.log(`🔄 Request: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      })
      
      const responseTime = Date.now() - startTime
      let data
      
      try {
        data = await response.json()
      } catch (e) {
        data = await response.text()
      }
      
      console.log(`⏱️  Response time: ${responseTime}ms`)
      console.log(`📊 Status: ${response.status}`)
      
      return {
        success: response.ok,
        status: response.status,
        data,
        responseTime,
        url
      }
      
    } catch (error) {
      console.error(`❌ Request failed:`, error.message)
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      }
    }
  }

  async testGetFollowings(userId, count = 20) {
    console.log(`\n🔍 Testing: Get Followings for User ID ${userId}`)
    console.log('================================================')
    
    const result = await this.makeRequest('/followings', {
      user: userId,
      count: count
    })
    
    if (result.success) {
      console.log(`✅ Success! Got followings data`)
      
      // Analyze the response structure
      this.analyzeFollowingsData(result.data)
      
      return {
        passed: true,
        followingsCount: this.extractFollowingsCount(result.data),
        sampleData: this.extractSampleFollowing(result.data),
        responseTime: result.responseTime
      }
    } else {
      console.log(`❌ Failed: ${result.status} - ${result.error || 'Unknown error'}`)
      if (result.data) {
        console.log(`📄 Response:`, JSON.stringify(result.data, null, 2))
      }
      
      return {
        passed: false,
        error: result.error || `HTTP ${result.status}`,
        responseData: result.data
      }
    }
  }

  async testGetFollowers(userId, count = 20) {
    console.log(`\n🔍 Testing: Get Followers for User ID ${userId}`)
    console.log('===============================================')
    
    // Try the followers endpoint (might be similar to followings)
    const result = await this.makeRequest('/followers', {
      user: userId,
      count: count
    })
    
    if (result.success) {
      console.log(`✅ Success! Got followers data`)
      
      this.analyzeFollowersData(result.data)
      
      return {
        passed: true,
        followersCount: this.extractFollowersCount(result.data),
        sampleData: this.extractSampleFollower(result.data),
        responseTime: result.responseTime
      }
    } else {
      console.log(`❌ Failed: ${result.status} - ${result.error || 'Unknown error'}`)
      if (result.data) {
        console.log(`📄 Response:`, JSON.stringify(result.data, null, 2))
      }
      
      return {
        passed: false,
        error: result.error || `HTTP ${result.status}`,
        responseData: result.data
      }
    }
  }

  async testUserLookup(username) {
    console.log(`\n🔍 Testing: User Lookup for @${username}`)
    console.log('=========================================')
    
    // Try different possible endpoints for user lookup
    const possibleEndpoints = [
      '/user-info',
      '/user',
      '/profile',
      '/user-details'
    ]
    
    for (const endpoint of possibleEndpoints) {
      console.log(`Trying endpoint: ${endpoint}`)
      
      const result = await this.makeRequest(endpoint, {
        username: username
      })
      
      if (result.success) {
        console.log(`✅ Success with ${endpoint}!`)
        console.log(`📄 User data:`, JSON.stringify(result.data, null, 2))
        
        return {
          passed: true,
          endpoint: endpoint,
          userData: result.data,
          responseTime: result.responseTime
        }
      } else {
        console.log(`❌ ${endpoint} failed: ${result.status}`)
      }
    }
    
    return {
      passed: false,
      error: 'No working user lookup endpoint found'
    }
  }

  analyzeFollowingsData(data) {
    console.log('🔍 Analyzing Followings Data Structure:')
    console.log(`📍 Response type: ${typeof data}`)
    console.log(`📍 Keys:`, Object.keys(data || {}))
    
    if (data && typeof data === 'object') {
      // Look for followings array in different possible locations
      const possibleArrays = ['followings', 'data', 'users', 'results', 'following']
      
      for (const key of possibleArrays) {
        if (data[key] && Array.isArray(data[key])) {
          console.log(`✅ Found followings array at: ${key} (${data[key].length} items)`)
          
          if (data[key].length > 0) {
            console.log(`📄 Sample following:`, JSON.stringify(data[key][0], null, 2))
          }
          break
        }
      }
      
      // Check if the data itself is an array
      if (Array.isArray(data)) {
        console.log(`✅ Data is directly an array (${data.length} items)`)
        if (data.length > 0) {
          console.log(`📄 Sample following:`, JSON.stringify(data[0], null, 2))
        }
      }
    }
  }

  analyzeFollowersData(data) {
    console.log('🔍 Analyzing Followers Data Structure:')
    console.log(`📍 Response type: ${typeof data}`)
    console.log(`📍 Keys:`, Object.keys(data || {}))
    
    if (data && typeof data === 'object') {
      const possibleArrays = ['followers', 'data', 'users', 'results']
      
      for (const key of possibleArrays) {
        if (data[key] && Array.isArray(data[key])) {
          console.log(`✅ Found followers array at: ${key} (${data[key].length} items)`)
          
          if (data[key].length > 0) {
            console.log(`📄 Sample follower:`, JSON.stringify(data[key][0], null, 2))
          }
          break
        }
      }
      
      if (Array.isArray(data)) {
        console.log(`✅ Data is directly an array (${data.length} items)`)
        if (data.length > 0) {
          console.log(`📄 Sample follower:`, JSON.stringify(data[0], null, 2))
        }
      }
    }
  }

  extractFollowingsCount(data) {
    if (Array.isArray(data)) return data.length
    if (data?.followings?.length) return data.followings.length
    if (data?.data?.length) return data.data.length
    if (data?.users?.length) return data.users.length
    return 0
  }

  extractFollowersCount(data) {
    if (Array.isArray(data)) return data.length
    if (data?.followers?.length) return data.followers.length
    if (data?.data?.length) return data.data.length
    if (data?.users?.length) return data.users.length
    return 0
  }

  extractSampleFollowing(data) {
    if (Array.isArray(data) && data.length > 0) return data[0]
    if (data?.followings?.[0]) return data.followings[0]
    if (data?.data?.[0]) return data.data[0]
    if (data?.users?.[0]) return data.users[0]
    return null
  }

  extractSampleFollower(data) {
    if (Array.isArray(data) && data.length > 0) return data[0]
    if (data?.followers?.[0]) return data.followers[0]
    if (data?.data?.[0]) return data.data[0]
    if (data?.users?.[0]) return data.users[0]
    return null
  }

  // Test if we can verify following relationships
  async testFollowVerification(targetUserId, followerUsername) {
    console.log(`\n🎯 Testing Follow Verification`)
    console.log(`Target User ID: ${targetUserId}`)
    console.log(`Looking for follower: @${followerUsername}`)
    console.log('===========================================')
    
    // Get followers of the target user
    const followersResult = await this.testGetFollowers(targetUserId, 100)
    
    if (!followersResult.passed) {
      console.log(`❌ Cannot verify - failed to get followers`)
      return { canVerify: false, reason: 'Failed to fetch followers' }
    }
    
    // Try to find the follower in the list
    const followers = this.extractFollowersArray(followersResult)
    
    if (!followers || followers.length === 0) {
      console.log(`❌ Cannot verify - no followers data`)
      return { canVerify: false, reason: 'No followers data available' }
    }
    
    // Look for the follower
    const isFollowing = followers.some(follower => {
      const username = follower.username || follower.screen_name || follower.handle
      return username && username.toLowerCase() === followerUsername.toLowerCase()
    })
    
    console.log(`${isFollowing ? '✅' : '❌'} Verification result: ${followerUsername} ${isFollowing ? 'IS' : 'IS NOT'} following`)
    
    return {
      canVerify: true,
      isFollowing,
      followersSampled: followers.length,
      confidence: followers.length >= 50 ? 'high' : 'medium'
    }
  }

  extractFollowersArray(result) {
    // Extract actual followers array from the test result
    if (result.sampleData && Array.isArray(result.sampleData)) {
      return result.sampleData
    }
    return []
  }

  async runComprehensiveTest() {
    console.log('🚀 Starting Comprehensive Twttr API Test (Basic Plan)')
    console.log('====================================================\n')
    
    const results = {
      tests: [],
      overall: { passed: 0, total: 0 }
    }
    
    // Test 1: Get followings for different users
    console.log('📋 TEST 1: Testing Followings Endpoint')
    for (const [username, userId] of Object.entries(this.testUsers)) {
      const result = await this.testGetFollowings(userId, 20)
      results.tests.push({
        name: `Get followings for @${username}`,
        passed: result.passed,
        details: result
      })
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limiting
    }
    
    // Test 2: Get followers for different users  
    console.log('\n📋 TEST 2: Testing Followers Endpoint')
    for (const [username, userId] of Object.entries(this.testUsers)) {
      const result = await this.testGetFollowers(userId, 20)
      results.tests.push({
        name: `Get followers for @${username}`,
        passed: result.passed,
        details: result
      })
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Test 3: User lookup
    console.log('\n📋 TEST 3: Testing User Lookup')
    for (const username of Object.keys(this.testUsers)) {
      const result = await this.testUserLookup(username)
      results.tests.push({
        name: `User lookup for @${username}`,
        passed: result.passed,
        details: result
      })
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Test 4: Follow verification test
    console.log('\n📋 TEST 4: Testing Follow Verification Capability')
    const verificationResult = await this.testFollowVerification('44196397', 'jack') // Check if @jack follows @elonmusk
    results.tests.push({
      name: 'Follow verification capability',
      passed: verificationResult.canVerify,
      details: verificationResult
    })
    
    // Calculate results
    results.overall.total = results.tests.length
    results.overall.passed = results.tests.filter(t => t.passed).length
    results.overall.score = (results.overall.passed / results.overall.total * 100).toFixed(1)
    
    // Generate report
    this.generateReport(results)
    
    return results
  }

  generateReport(results) {
    console.log('\n📊 TWTTR API TEST REPORT (Basic Plan)')
    console.log('=====================================')
    
    console.log(`\n📈 Overall Results: ${results.overall.passed}/${results.overall.total} tests passed (${results.overall.score}%)`)
    
    console.log('\n📋 Test Results:')
    results.tests.forEach((test, index) => {
      const emoji = test.passed ? '✅' : '❌'
      console.log(`${emoji} ${index + 1}. ${test.name}`)
    })
    
    // Determine production readiness
    const productionReady = parseFloat(results.overall.score) >= 70
    
    console.log('\n🎯 PRODUCTION ASSESSMENT:')
    if (productionReady) {
      console.log('✅ PRODUCTION READY!')
      console.log('✅ This API can be used for your gumball task system')
      console.log('\n💡 NEXT STEPS:')
      console.log('1. Update your backend API key')
      console.log('2. Deploy the task verification system')
      console.log('3. Create test tasks for users')
      console.log('4. Monitor usage and consider upgrading plan if needed')
    } else {
      console.log('❌ NOT PRODUCTION READY')
      console.log('⚠️  Issues found with this API')
      console.log('\n🔄 RECOMMENDATIONS:')
      console.log('1. Try different endpoints or parameters')
      console.log('2. Contact API provider for support')
      console.log('3. Consider upgrading to PRO plan ($25/month)')
      console.log('4. Look for alternative APIs')
    }
    
    console.log('\n💰 COST ANALYSIS:')
    console.log(`Current plan: Basic ($1/month)`)
    console.log(`Rate limits: Check API documentation`)
    console.log(`Estimated monthly cost for your use case: $1-25`)
  }
}

// Run the test
async function testTwttrAPI() {
  const tester = new TwttrAPITester()
  
  console.log('⚠️  IMPORTANT: Update the API key in the code with your actual subscription key!')
  console.log('Your current API key should replace: 13b3f730e0msh1ff628e420c105ap163a6fjsnc80771ebc4a4\n')
  
  return await tester.runComprehensiveTest()
}

module.exports = { TwttrAPITester, testTwttrAPI }

if (require.main === module) {
  testTwttrAPI()
}