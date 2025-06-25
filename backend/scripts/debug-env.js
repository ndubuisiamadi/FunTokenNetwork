// scripts/debug-env.js
require('dotenv').config()

console.log('🔍 Debugging environment variables...')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY)
console.log('SENDGRID_API_KEY length:', process.env.SENDGRID_API_KEY?.length)
console.log('SENDGRID_API_KEY first 10 chars:', process.env.SENDGRID_API_KEY?.substring(0, 10))
console.log('SENDGRID_API_KEY last 10 chars:', process.env.SENDGRID_API_KEY?.substring(-10))
console.log('Raw SENDGRID_API_KEY:', JSON.stringify(process.env.SENDGRID_API_KEY))

// Check if it starts with SG.
if (process.env.SENDGRID_API_KEY) {
  console.log('Starts with SG.:', process.env.SENDGRID_API_KEY.startsWith('SG.'))
} else {
  console.log('❌ SENDGRID_API_KEY is undefined!')
}