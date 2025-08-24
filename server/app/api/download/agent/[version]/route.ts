import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { version: string } }
) {
  try {
    const version = params.version
    
    // Path to the specific agent release zip file in public downloads
    const zipPath = join(process.cwd(), 'public', 'downloads', 'agent', version, `GridHealth-Agent-${version}.zip`)
    
    // Check if the file exists
    if (!existsSync(zipPath)) {
      return NextResponse.json(
        { error: `Agent version ${version} not found` },
        { status: 404 }
      )
    }
    
    // Read the zip file
    const zipBuffer = readFileSync(zipPath)
    
    // Return the file as a download
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="GridHealth-Agent-${version}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error(`Error serving agent download for version ${params.version}:`, error)
    return NextResponse.json(
      { error: 'Failed to serve agent download' },
      { status: 500 }
    )
  }
} 