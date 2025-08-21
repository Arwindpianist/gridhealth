import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

interface AgentVersion {
  version: string
  downloadUrl: string
  fileName: string
  fileSize: number
  releaseDate: string
  releaseNotes: string
}

export async function GET(request: NextRequest) {
  try {
    const agentReleasePath = join(process.cwd(), '..', 'agent', 'release')
    
    // Get all directories in the release folder
    const releases = readdirSync(agentReleasePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('GridHealth-Agent-'))
      .map(dirent => {
        const version = dirent.name.replace('GridHealth-Agent-', '')
        const zipPath = join(agentReleasePath, `${dirent.name}.zip`)
        
        try {
          const stats = statSync(zipPath)
          return {
            version,
            downloadUrl: `/api/download/agent/${version}`,
            fileName: `${dirent.name}.zip`,
            fileSize: stats.size,
            releaseDate: stats.mtime.toISOString(),
            releaseNotes: getReleaseNotes(version)
          }
        } catch (error) {
          console.warn(`Could not get stats for ${zipPath}:`, error)
          return null
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => compareVersions(b.version, a.version)) // Sort by version (newest first)

    if (releases.length === 0) {
      return NextResponse.json(
        { error: 'No agent releases found' },
        { status: 404 }
      )
    }

    const latestVersion = releases[0]
    
    return NextResponse.json({
      latest: latestVersion,
      all: releases,
      totalReleases: releases.length
    })
  } catch (error) {
    console.error('Error getting agent version:', error)
    return NextResponse.json(
      { error: 'Failed to get agent version information' },
      { status: 500 }
    )
  }
}

function getReleaseNotes(version: string): string {
  const releaseNotes: Record<string, string> = {
    'v1.0.1': 'Fixed license validation endpoint, improved error handling, and enhanced system tray functionality',
    'v1.0.0': 'Initial release with system tray application, real-time monitoring, and professional installer'
  }
  
  return releaseNotes[version] || `GridHealth Agent ${version} release`
}

function compareVersions(a: string, b: string): number {
  // Remove 'v' prefix and split by dots
  const aParts = a.replace('v', '').split('.').map(Number)
  const bParts = b.replace('v', '').split('.').map(Number)
  
  // Compare major, minor, patch versions
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0
    const bPart = bParts[i] || 0
    
    if (aPart !== bPart) {
      return aPart - bPart
    }
  }
  
  return 0
} 