// src/services/emailService.js - SendGrid API Version
require('dotenv').config() // Load environment variables
const sgMail = require('@sendgrid/mail')

class EmailService {
  constructor() {
    this.initTransporter()
  }

  initTransporter() {
    try {
      console.log('🔍 Loading SendGrid API key from environment...')
      
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SENDGRID_API_KEY is required')
      }

      if (!process.env.SENDGRID_API_KEY.startsWith('SG.')) {
        throw new Error('Invalid SendGrid API key format')
      }

      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      console.log('✅ SendGrid Web API initialized')

    } catch (error) {
      console.error('❌ Failed to initialize SendGrid:', error.message)
    }
  }

  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  async sendVerificationEmail(email, code, username = '') {
    console.log('📧 EMAIL SERVICE - sendVerificationEmail called')
    console.log('  To:', email)
    console.log('  Code:', code)
    console.log('  Username:', username)

    const msg = {
      to: email,
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME || 'FunNetwork'
      },
      subject: 'Verify Your Email - FunNetwork',
      text: `Your verification code is: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Welcome to FunNetwork!</h1>
            <p style="color: #666; font-size: 16px;">Please verify your email address</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h2 style="color: #333; margin-bottom: 10px;">Your verification code is:</h2>
            <div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes</p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p>If you didn't request this verification, please ignore this email.</p>
            <p>Need help? Contact us at support@funnetwork.com</p>
          </div>
        </div>
      `
    }

    try {
      console.log('📤 Attempting to send email via SendGrid API...')
      const result = await sgMail.send(msg)
      console.log('✅ Verification email sent successfully to:', email)
      console.log('📧 Message ID:', result[0].headers['x-message-id'])
      return { success: true, messageId: result[0].headers['x-message-id'] }
    } catch (error) {
      console.error('❌ Failed to send verification email:', error)
      console.error('❌ Error details:', error.response?.body || error.message)
      return { success: false, error: error.message }
    }
  }

  async sendWelcomeEmail(email, username) {
    const msg = {
      to: email,
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME || 'FunNetwork'
      },
      subject: 'Welcome to FunNetwork!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333;">Welcome to FunNetwork, ${username}! 🎉</h1>
          </div>
          
          <div style="padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Your email has been successfully verified! You're now part of the FunNetwork community.
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Get started by completing your profile and connecting with friends.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Thanks for joining us!<br>
              The FunNetwork Team
            </p>
          </div>
        </div>
      `
    }

    try {
      await sgMail.send(msg)
      console.log('✅ Welcome email sent via SendGrid API to:', email)
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error)
    }
  }
}

module.exports = new EmailService()