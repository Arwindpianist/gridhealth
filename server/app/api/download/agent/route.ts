import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const agentReleasePath = join(process.cwd(), '..', 'agent', 'release')
    
    // Get all directories in the release folder and find the latest version
    const releases = readdirSync(agentReleasePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('GridHealth-Agent-'))
      .map(dirent => dirent.name.replace('GridHealth-Agent-', ''))
      .sort((a, b) => {
        // Simple version comparison
        const aParts = a.replace('v', '').split('.').map(Number)
        const bParts = b.replace('v', '').split('.').map(Number)
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aPart = aParts[i] || 0
          const bPart = bParts[i] || 0
          if (aPart !== bPart) return bPart - aPart
        }
        return 0
      })

    if (releases.length === 0) {
      return NextResponse.json(
        { error: 'No agent releases found' },
        { status: 404 }
      )
    }

    const latestVersion = releases[0]
    
    // Redirect to the latest version
    return NextResponse.redirect(
      new URL(`/api/download/agent/${latestVersion}`, request.url)
    )
  } catch (error) {
    console.error('Error redirecting to latest agent version:', error)
    return NextResponse.json(
      { error: 'Failed to get latest agent version' },
      { status: 500 }
    )
  }
} 