import { supabaseAdmin } from './supabase'
import { sendEmailNotification } from './email'

/**
 * Check for devices with critical health and send notifications
 */
export async function checkCriticalHealth(organizationId: string) {
  try {
    // Get devices with low health scores
    const { data: criticalDevices, error: devicesError } = await supabaseAdmin
      .from('devices')
      .select(`
        device_id,
        device_name,
        health_score,
        health_status,
        license_key
      `)
      .eq('is_active', true)
      .lt('health_score', 50) // Critical threshold

    if (devicesError) {
      console.error('Error fetching critical devices:', devicesError)
      return
    }

    if (!criticalDevices || criticalDevices.length === 0) {
      return
    }

    // Get users who should be notified
    const { data: notificationSettings, error: settingsError } = await supabaseAdmin
      .from('notification_settings')
      .select(`
        user_id,
        email_notifications,
        critical_health_threshold
      `)
      .eq('organization_id', organizationId)
      .eq('email_notifications', true)

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError)
      return
    }

    // Send notifications for each critical device
    for (const device of criticalDevices) {
      for (const setting of notificationSettings || []) {
        if (device.health_score <= (setting.critical_health_threshold || 30)) {
          // Create notification record
          const { error: notificationError } = await supabaseAdmin
            .from('notifications')
            .insert([{
              organization_id: organizationId,
              user_id: setting.user_id,
              type: 'critical_health',
              title: 'Critical Device Health Alert',
              message: `Device ${device.device_name} has critical health score: ${device.health_score}/100`,
              device_id: device.device_id,
              health_score: device.health_score,
              status: 'pending'
            }])

          if (notificationError) {
            console.error('Error creating notification:', notificationError)
            continue
          }

          // Send email notification
          try {
            await sendEmailNotification(
              setting.user_id, // This should be an email address
              'Critical Device Health Alert',
              `Device ${device.device_name} has critical health score: ${device.health_score}/100`,
              'critical_health',
              {
                deviceName: device.device_name,
                healthScore: device.health_score
              }
            )
          } catch (emailError) {
            console.error('Error sending email notification:', emailError)
          }
        }
      }
    }

    console.log(`✅ Critical health check completed for ${criticalDevices.length} devices`)
  } catch (error) {
    console.error('Error in checkCriticalHealth:', error)
  }
}
