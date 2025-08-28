import { supabaseAdmin } from './supabase'

/**
 * Update license usage statistics for an organization
 */
export async function updateLicenseUsageStats(organizationId: string) {
  try {
    // Get all active licenses for the organization
    const { data: licenses, error: licensesError } = await supabaseAdmin
      .from('licenses')
      .select('license_key, device_limit, status')
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    if (licensesError) {
      console.error('Error fetching licenses:', licensesError)
      return
    }

    // Calculate total device limit
    const totalDeviceLimit = licenses.reduce((sum, license) => sum + license.device_limit, 0)

    // Count active devices
    const { data: activeDevices, error: devicesError } = await supabaseAdmin
      .from('devices')
      .select('device_id')
      .eq('license_key', licenses.map(l => l.license_key))
      .eq('is_active', true)

    if (devicesError) {
      console.error('Error counting active devices:', devicesError)
      return
    }

    const activeDeviceCount = activeDevices.length
    const unusedDevices = Math.max(0, totalDeviceLimit - activeDeviceCount)

    // Update or create license usage record
    const { error: upsertError } = await supabaseAdmin
      .from('license_usage')
      .upsert([{
        organization_id: organizationId,
        license_key: licenses[0]?.license_key || 'unknown',
        active_devices: activeDeviceCount,
        total_devices: totalDeviceLimit,
        unused_devices: unusedDevices,
        last_updated: new Date().toISOString()
      }], {
        onConflict: 'organization_id'
      })

    if (upsertError) {
      console.error('Error updating license usage:', upsertError)
    } else {
      console.log(`✅ License usage updated: ${activeDeviceCount}/${totalDeviceLimit} devices active`)
    }
  } catch (error) {
    console.error('Error in updateLicenseUsageStats:', error)
  }
}
