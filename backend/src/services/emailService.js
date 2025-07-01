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

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken, username = '') {
    console.log('📧 EMAIL SERVICE - sendPasswordResetEmail called')
    console.log('  To:', email)
    console.log('  Token:', resetToken.substring(0, 10) + '...')
    console.log('  Username:', username)

    // Construct reset URL (update with your actual frontend domain)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://192.168.0.159:5173'}/reset-password?token=${resetToken}`

    const msg = {
      to: email,
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME || 'FunNetwork'
      },
      subject: 'Reset Your Password - FunNetwork',
      text: `Reset your password by clicking this link: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Password Reset Request</h1>
            <p style="color: #666; font-size: 16px;">We received a request to reset your password</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
              Hello${username ? ' ' + username : ''},
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
              Someone requested a password reset for your FunNetwork account. If this was you, click the button below to reset your password. If you didn't request this, you can safely ignore this email.
            </p>
            <div style="text-align: center;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Reset Your Password
              </a>
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <p style="color: #856404; font-size: 14px; margin: 0;">
              ⚠️ <strong>Security Notice:</strong> This link will expire in 1 hour for your security.
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
            <p style="margin-top: 20px;">
              If you didn't request this password reset, please ignore this email or contact our support team.
            </p>
            <p>Need help? Contact us at ${process.env.SUPPORT_EMAIL || 'support@funnetwork.com'}</p>
          </div>
        </div>
      `
    }

    try {
      console.log('📤 Sending password reset email via SendGrid...')
      const result = await sgMail.send(msg)
      console.log('✅ Password reset email sent successfully:', result[0].statusCode)
      return { success: true, messageId: result[0].headers['x-message-id'] }
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error)
      
      if (error.response) {
        console.error('SendGrid error details:', error.response.body)
      }
      
      throw new Error('Failed to send password reset email: ' + error.message)
    }
  }

  // Send password change confirmation email
  async sendPasswordChangeConfirmationEmail(email, username = '') {
    console.log('📧 EMAIL SERVICE - sendPasswordChangeConfirmationEmail called')
    console.log('  To:', email)
    console.log('  Username:', username)

    const msg = {
      to: email,
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME || 'FunNetwork'
      },
      subject: 'Password Changed Successfully - FunNetwork',
      text: `Your password has been changed successfully. If you did not make this change, please contact support immediately.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Password Changed</h1>
            <p style="color: #666; font-size: 16px;">Your password has been updated successfully</p>
          </div>
          
          <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin-bottom: 30px; text-align: center;">
            <div style="color: #155724; font-size: 48px; margin-bottom: 10px;">✓</div>
            <p style="color: #155724; font-size: 16px; font-weight: bold; margin: 0;">
              Your password has been changed successfully!
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">
              Hello${username ? ' ' + username : ''},
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              This email confirms that your FunNetwork account password was successfully changed on ${new Date().toLocaleString()}.
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
              You can now use your new password to log into your account.
            </p>
          </div>
          
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <p style="color: #721c24; font-size: 14px; margin: 0;">
              🚨 <strong>Didn't change your password?</strong> If you did not make this change, please contact our support team immediately at ${process.env.SUPPORT_EMAIL || 'support@funnetwork.com'}
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>This is an automated security notification. Please do not reply to this email.</p>
            <p>Need help? Contact us at ${process.env.SUPPORT_EMAIL || 'support@funnetwork.com'}</p>
          </div>
        </div>
      `
    }

    try {
      console.log('📤 Sending password change confirmation email via SendGrid...')
      const result = await sgMail.send(msg)
      console.log('✅ Password change confirmation email sent successfully:', result[0].statusCode)
      return { success: true, messageId: result[0].headers['x-message-id'] }
    } catch (error) {
      console.error('❌ Failed to send password change confirmation email:', error)
      
      if (error.response) {
        console.error('SendGrid error details:', error.response.body)
      }
      
      throw new Error('Failed to send password change confirmation email: ' + error.message)
    }
  }
}

module.exports = new EmailService()