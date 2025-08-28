import nodemailer from 'nodemailer'

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'gridhealth@arwindpianist.store',
    pass: process.env.SMTP_PASS || ''
  }
}

// Create transporter
const transporter = nodemailer.createTransport(emailConfig)

/**
 * Send email notification
 * @param to - Recipient email address
 * @param title - Email title/subject
 * @param message - Email message content
 * @param type - Notification type for template selection
 * @param additionalData - Additional data for template rendering
 */
export async function sendEmailNotification(
  to: string, 
  title: string, 
  message: string, 
  type: string = 'general',
  additionalData: Record<string, any> = {}
): Promise<boolean> {
  try {
    // Generate subject and HTML content based on type
    let subject: string
    let html: string
    
    switch (type) {
      case 'critical_health': {
        const deviceName = additionalData.deviceName || 'Unknown Device'
        const healthScore = additionalData.healthScore || 0
        subject = `🚨 Critical Health Alert: ${deviceName}`
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">🚨 Critical Health Alert</h1>
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #dc3545;">Device: ${deviceName}</h2>
              <p><strong>Health Score:</strong> <span style="color: #dc3545; font-size: 18px;">${healthScore}/100</span></p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Alert Message:</strong></p>
                <p style="margin: 10px 0 0 0;">${message}</p>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #856404;">⚠️ Immediate Action Required</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Check the device immediately</li>
                  <li>Review system resources and performance</li>
                  <li>Restart critical services if necessary</li>
                  <li>Contact IT support if issues persist</li>
                </ul>
              </div>
              
              <p style="color: #6c757d; font-size: 14px;">
                This is an automated alert from GridHealth. Please do not reply to this email.
              </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">
                GridHealth - Proactive Device Monitoring
              </p>
            </div>
          </div>
        `
        break
      }
      
      case 'device_offline': {
        const deviceName = additionalData.deviceName || 'Unknown Device'
        subject = `⚠️ Device Offline: ${deviceName}`
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ffc107; color: #212529; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">⚠️ Device Offline Alert</h1>
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #ffc107;">Device: ${deviceName}</h2>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Alert Message:</strong></p>
                <p style="margin: 10px 0 0 0;">${message}</p>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #856404;">🔍 Troubleshooting Steps</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Check if the device is powered on</li>
                  <li>Verify network connectivity</li>
                  <li>Check if the GridHealth agent is running</li>
                  <li>Restart the device if necessary</li>
                </ul>
              </div>
              
              <p style="color: #6c757d; font-size: 14px;">
                This is an automated alert from GridHealth. Please do not reply to this email.
              </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">
                GridHealth - Proactive Device Monitoring
              </p>
            </div>
          </div>
        `
        break
      }
      
      case 'license_expiry': {
        const organizationName = additionalData.organizationName || 'Unknown Organization'
        const expiryDate = additionalData.expiryDate || 'Unknown'
        subject = `📅 License Expiry Warning: ${organizationName}`
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">📅 License Expiry Warning</h1>
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #17a2b8;">Organization: ${organizationName}</h2>
              <p><strong>Expiry Date:</strong> <span style="color: #dc3545; font-size: 18px;">${expiryDate}</span></p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Warning Message:</strong></p>
                <p style="margin: 10px 0 0 0;">${message}</p>
              </div>
              
              <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #0c5460;">💡 Action Required</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Renew your license before expiry</li>
                  <li>Contact sales team for renewal options</li>
                  <li>Ensure uninterrupted monitoring service</li>
                </ul>
              </div>
              
              <p style="color: #6c757d; font-size: 14px;">
                This is an automated alert from GridHealth. Please do not reply to this email.
              </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">
                GridHealth - Proactive Device Monitoring
              </p>
            </div>
          </div>
        `
        break
      }
      
      default: {
        subject = title
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #6c757d; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">${title}</h1>
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd;">
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;">${message}</p>
              </div>
              
              <p style="color: #6c757d; font-size: 14px;">
                This is an automated alert from GridHealth. Please do not reply to this email.
              </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">
                GridHealth - Proactive Device Monitoring
              </p>
            </div>
          </div>
        `
      }
    }

    // Send email
    const info = await transporter.sendMail({
      from: `"GridHealth" <${emailConfig.auth.user}>`,
      to: to,
      subject: subject,
      html: html,
      text: message // Plain text fallback
    })

    console.log(`✅ Email notification sent to ${to}:`, info.messageId)
    return true

  } catch (error) {
    console.error(`❌ Failed to send email notification to ${to}:`, error)
    return false
  }
}

/**
 * Send bulk email notifications
 * @param recipients - Array of recipient email addresses
 * @param title - Email title/subject
 * @param message - Email message content
 * @param type - Notification type for template selection
 * @param additionalData - Additional data for template rendering
 */
export async function sendBulkEmailNotifications(
  recipients: string[],
  title: string,
  message: string,
  type: string = 'general',
  additionalData: Record<string, any> = {}
): Promise<{ success: string[], failed: string[] }> {
  const success: string[] = []
  const failed: string[] = []

  for (const recipient of recipients) {
    try {
      const result = await sendEmailNotification(recipient, title, message, type, additionalData)
      if (result) {
        success.push(recipient)
      } else {
        failed.push(recipient)
      }
    } catch (error) {
      console.error(`Error sending email to ${recipient}:`, error)
      failed.push(recipient)
    }
  }

  console.log(`📧 Bulk email results: ${success.length} successful, ${failed.length} failed`)
  return { success, failed }
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    await transporter.verify()
    console.log('✅ Email configuration is valid')
    return true
  } catch (error) {
    console.error('❌ Email configuration is invalid:', error)
    return false
  }
}

export default {
  sendEmailNotification,
  sendBulkEmailNotifications,
  testEmailConfiguration
}
