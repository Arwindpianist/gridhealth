import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface AgentVersion {
  version: string
  downloadUrl: string
  fileName: string
  fileSize: number
  releaseDate: string
  releaseNotes: string
  downloadCount: number
  githubUrl: string
}

export async function GET(request: NextRequest) {
  try {
    const downloadsPath = path.join(process.cwd(), 'public', 'downloads', 'agent')
    
    // Check if downloads directory exists
    try {
      await fs.access(downloadsPath)
    } catch (error) {
      console.error('Downloads directory not found:', downloadsPath)
      return NextResponse.json({ error: 'Downloads directory not found' }, { status: 404 })
    }

    // Read all version directories
    const versionDirs = await fs.readdir(downloadsPath)
    const versions: AgentVersion[] = []

    for (const versionDir of versionDirs) {
      // Skip non-version directories
      if (!versionDir.startsWith('v') || !versionDir.includes('.')) {
        continue
      }

      const versionPath = path.join(downloadsPath, versionDir)
      const versionStat = await fs.stat(versionPath)
      
      if (!versionStat.isDirectory()) {
        continue
      }

      // Look for the ZIP file in this version directory
      const files = await fs.readdir(versionPath)
      const zipFile = files.find(file => file.endsWith('.zip'))
      
      if (!zipFile) {
        continue
      }

      const zipPath = path.join(versionPath, zipFile)
      const zipStat = await fs.stat(zipPath)
      
      // Create version object
      const version: AgentVersion = {
        version: versionDir,
        downloadUrl: `/api/download/agent/${versionDir}`,
        fileName: zipFile,
        fileSize: zipStat.size,
        releaseDate: versionStat.mtime.toISOString(),
        releaseNotes: getReleaseNotes(versionDir),
        downloadCount: 0, // This could be tracked in a database later
        githubUrl: `https://github.com/Arwindpianist/gridhealth/releases/tag/${versionDir}`
      }

      versions.push(version)
    }

    // Sort versions by semantic version (newest first)
    versions.sort((a, b) => {
      const versionA = a.version.replace('v', '').split('.').map(Number)
      const versionB = b.version.replace('v', '').split('.').map(Number)
      
      for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
        const numA = versionA[i] || 0
        const numB = versionB[i] || 0
        if (numA !== numB) {
          return numB - numA // Descending order (newest first)
        }
      }
      return 0
    })

    if (versions.length === 0) {
      return NextResponse.json({ error: 'No agent versions found' }, { status: 404 })
    }

    const latestVersion = versions[0]
    
    return NextResponse.json({
      latest: latestVersion,
      all: versions,
      totalReleases: versions.length,
      source: 'dynamic-scan'
    })

  } catch (error) {
    console.error('Error scanning agent versions:', error)
    return NextResponse.json({ error: 'Failed to scan agent versions' }, { status: 500 })
  }
}

function getReleaseNotes(version: string): string {
  // Generate release notes based on version
  const versionNum = version.replace('v', '')
  
  switch (versionNum) {
    case '1.0.3':
      return 'Enhanced health monitoring, improved performance, bug fixes, and security improvements'
    case '1.0.2':
      return 'Fixed license validation issue - corrected API endpoint configuration mismatch'
    case '1.0.1':
      return 'Fixed license validation and improved system tray functionality'
    case '1.0.0':
      return 'Initial release with system tray application and real-time monitoring'
    default:
      return `GridHealth Agent ${version} release`
  }
}
