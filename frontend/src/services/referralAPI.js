import api from './api'

export const referralAPI = {
  // Get my referral data
  getMyReferralData: () => api.get('/referrals/me'),
  
  // Generate referral code
  generateReferralCode: () => api.post('/referrals/generate-code'),
  
  // Track referral click
  trackReferralClick: (referralCode) => 
    api.post(`/referrals/track/${referralCode}`),
  
  // Validate referral code
  validateReferralCode: (referralCode) => 
    api.get(`/referrals/validate/${referralCode}`),
  
  // Get leaderboard
  getLeaderboard: (limit = 20) => 
    api.get(`/referrals/leaderboard?limit=${limit}`)
}