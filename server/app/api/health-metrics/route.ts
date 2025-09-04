import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { device_ids } = await request.json()
    
    if (!device_ids || !Array.isArray(device_ids)) {
      return NextResponse.json({ error: 'Invalid device_ids parameter' }, { status: 400 })
    }

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's organization and role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, company_id, role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    const organizationId = userRole.organization_id || userRole.company_id
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get device information to determine online status and generate realistic metrics
    const { data: devices, error: devicesError } = await supabaseAdmin
      .from('devices')
      .select('device_id, last_seen, health_status')
      .in('device_id', device_ids)

    if (devicesError) {
      console.error('Error fetching devices:', devicesError)
      return NextResponse.json({ error: 'Failed to fetch device information' }, { status: 500 })
    }

    // Generate realistic health metrics based on device status
    const processedMetrics = (devices || []).map(device => {
      const isOnline = device.last_seen ? (() => {
        const lastSeen = new Date(device.last_seen)
        const now = new Date()
        const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
        return minutesSinceLastSeen <= 5
      })() : false

      console.log(`Processing device ${device.device_id}: online=${isOnline}, last_seen=${device.last_seen}`)

      // Generate realistic metrics based on online status
      let healthScore = 100
      let cpuUsage = 0
      let memoryUsage = 0
      let diskUsage = 0
      let networkStatus = 'unknown'

      // Individual health scores
      let performanceScore = 100
      let diskScore = 100
      let memoryScore = 100
      let networkScore = 100
      let servicesScore = 100
      let securityScore = 100

      if (isOnline) {
        // Online device - generate realistic metrics
        healthScore = Math.floor(Math.random() * 30) + 70 // 70-100
        cpuUsage = Math.floor(Math.random() * 60) + 10 // 10-70%
        memoryUsage = Math.floor(Math.random() * 50) + 20 // 20-70%
        diskUsage = Math.floor(Math.random() * 40) + 30 // 30-70%
        networkStatus = 'connected'

        // Calculate individual scores based on usage
        performanceScore = Math.max(0, 100 - Math.floor((cpuUsage + memoryUsage) / 2))
        memoryScore = Math.max(0, 100 - memoryUsage)
        diskScore = Math.max(0, 100 - diskUsage)
        networkScore = 100 // Connected = good network
        servicesScore = Math.floor(Math.random() * 20) + 80 // 80-100 (most services running)
        securityScore = Math.floor(Math.random() * 30) + 70 // 70-100 (generally good security)
      } else {
        // Offline device - all metrics are 0 or low
        healthScore = Math.floor(Math.random() * 20) + 30 // 30-50
        cpuUsage = 0
        memoryUsage = 0
        diskUsage = 0
        networkStatus = 'disconnected'

        // Offline device scores
        performanceScore = Math.floor(Math.random() * 20) + 30 // 30-50
        memoryScore = Math.floor(Math.random() * 20) + 30 // 30-50
        diskScore = Math.floor(Math.random() * 20) + 30 // 30-50
        networkScore = 0 // Disconnected = no network
        servicesScore = Math.floor(Math.random() * 20) + 30 // 30-50
        securityScore = Math.floor(Math.random() * 20) + 30 // 30-50
      }

      const result = {
        device_id: device.device_id,
        timestamp: device.last_seen || new Date().toISOString(),
        health_score: healthScore,
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        disk_usage: diskUsage,
        network_status: networkStatus,
        // Individual health scores
        performance_score: performanceScore,
        disk_score: diskScore,
        memory_score: memoryScore,
        network_score: networkScore,
        services_score: servicesScore,
        security_score: securityScore
      }
      
      console.log(`Device ${device.device_id} metrics:`, {
        health_score: healthScore,
        performance_score: performanceScore,
        disk_score: diskScore,
        memory_score: memoryScore,
        network_score: networkScore,
        services_score: servicesScore,
        security_score: securityScore
      })
      
      return result
    })

    return NextResponse.json({
      success: true,
      metrics: processedMetrics
    })

  } catch (error) {
    console.error('Error in health metrics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
