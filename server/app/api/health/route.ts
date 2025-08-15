import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'GridHealth API',
    version: '1.0.0'
  })
}

export async function POST() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'GridHealth API',
    version: '1.0.0'
  })
} 