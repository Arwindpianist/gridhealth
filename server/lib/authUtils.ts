import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from './supabase'

export interface UserRole {
  id: string
  user_id: string
  role: string
  organization_id?: string
  company_id?: string
  permissions?: any
  created_at: string
  updated_at: string
}

export async function getUserRole(): Promise<UserRole | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!user) return null

    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return userRole
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

export async function isAdmin(): Promise<boolean> {
  const userRole = await getUserRole()
  return userRole?.role === 'admin'
}

export async function isOwner(): Promise<boolean> {
  const userRole = await getUserRole()
  return userRole?.role === 'owner'
}

export async function isAdminOrOwner(): Promise<boolean> {
  const userRole = await getUserRole()
  return userRole?.role === 'admin' || userRole?.role === 'owner'
}

export async function hasPermission(permission: string): Promise<boolean> {
  const userRole = await getUserRole()
  if (!userRole) return false
  
  if (userRole.role === 'admin' || userRole.role === 'owner') return true
  
  return userRole.permissions?.[permission] === true
}
