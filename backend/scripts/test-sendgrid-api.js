// scripts/test-sendgrid-api.js
require('dotenv').config()
const sgMail = require('@sendgrid/mail')

async function testSendGridAPI() {
  try {
    console.log('🧪 Testing SendGrid Web API...')
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    const msg = {
      to: 'nnamadi69@gmail.com',
      from: process.env.FROM_EMAIL, // Must be verified in SendGrid
      subject: 'Test Email via SendGrid API',
      text: 'This is a test email sent via SendGrid Web API!',
      html: '<h1>Success!</h1><p>Your SendGrid Web API is working perfectly!</p>'
    }

    const result = await sgMail.send(msg)
    console.log('✅ SendGrid API test successful!')
    console.log('📧 Message ID:', result[0].headers['x-message-id'])
    console.log('🎉 Check your email inbox!')

  } catch (error) {
    console.error('❌ SendGrid API test failed:')
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    if (error.response) {
      console.error('Response body:', error.response.body)
    }
  }
}

testSendGridAPI()