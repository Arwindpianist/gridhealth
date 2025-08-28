import { NextRequest, NextResponse } from 'next/server'

interface GitHubRelease {
  id: number
  tag_name: string
  name: string
  body: string
  published_at: string
  assets: Array<{
    id: number
    name: string
    size: number
    download_count: number
    browser_download_url: string
  }>
}

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
    // First, get local versions from dynamic scanning
    const localVersions = await getDynamicVersions()
    let localLatest: AgentVersion | null = null
    let localData: any = null
    
    if (localVersions.status === 200) {
      localData = await localVersions.json()
      localLatest = localData.latest
      if (localLatest) {
        console.log(`Latest local version: ${localLatest.version}`)
      }
    }

    // Then, try to fetch releases from GitHub API
    const githubResponse = await fetch(
      'https://api.github.com/repos/Arwindpianist/gridhealth/releases',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GridHealth-Agent'
        }
      }
    )

    if (githubResponse.ok) {
      const releases: GitHubRelease[] = await githubResponse.json()
      
      // Filter and map releases to our format
      const githubVersions: AgentVersion[] = releases
        .filter(release => release.tag_name.startsWith('v'))
        .map(release => {
          // Find the main agent zip file
          const agentAsset = release.assets.find(asset => 
            asset.name.includes('GridHealth-Agent') && asset.name.endsWith('.zip')
          )
          
          if (!agentAsset) return null
          
          return {
            version: release.tag_name,
            downloadUrl: agentAsset.browser_download_url,
            fileName: agentAsset.name,
            fileSize: agentAsset.size,
            releaseDate: release.published_at,
            releaseNotes: getShortReleaseNotes(release.tag_name, release.body),
            downloadCount: agentAsset.download_count,
            githubUrl: `https://github.com/Arwindpianist/gridhealth/releases/tag/${release.tag_name}`
          }
        })
        .filter((version): version is AgentVersion => version !== null)
        .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())

      if (githubVersions.length > 0) {
        const githubLatest = githubVersions[0]
        console.log(`Latest GitHub version: ${githubLatest.version}`)
        
        // Compare versions and prioritize the newer one
        if (localLatest && isVersionNewer(localLatest.version, githubLatest.version)) {
          console.log(`Local version ${localLatest.version} is newer than GitHub ${githubLatest.version}, using local`)
          return NextResponse.json({
            latest: localLatest,
            all: localData.all,
            totalReleases: localData.totalReleases,
            source: 'local-prioritized'
          })
        } else {
          console.log(`GitHub version ${githubLatest.version} is newer or equal to local ${localLatest?.version || 'none'}, using GitHub`)
          return NextResponse.json({
            latest: githubLatest,
            all: githubVersions,
            totalReleases: githubVersions.length,
            source: 'github'
          })
        }
      }
    }

    // If GitHub fails or no releases found, use local versions
    if (localLatest) {
      console.log('GitHub API failed, using local versions')
      return NextResponse.json({
        latest: localLatest,
        all: localData.all,
        totalReleases: localData.totalReleases,
        source: 'local-fallback'
      })
    }

    // If both fail, use fallback
    console.log('Both local and GitHub failed, using fallback')
    return getFallbackVersions()

  } catch (error) {
    console.error('Error in version detection:', error)
    // Try to use local versions as fallback
    try {
      const localVersions = await getDynamicVersions()
      if (localVersions.status === 200) {
        return localVersions
      }
    } catch (localError) {
      console.error('Local version fallback also failed:', localError)
    }
    
    // Final fallback
    return getFallbackVersions()
  }
}

async function getDynamicVersions() {
  try {
    // Import the dynamic versions API
    const { promises: fs } = await import('fs')
    const path = await import('path')
    
    const downloadsPath = path.join(process.cwd(), 'public', 'downloads', 'agent')
    
    // Check if downloads directory exists
    try {
      await fs.access(downloadsPath)
    } catch (error) {
      console.error('Downloads directory not found:', downloadsPath)
      return getFallbackVersions()
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
        downloadCount: 0,
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

    if (versions.length > 0) {
      const latestVersion = versions[0]
      console.log(`Latest agent version from dynamic scan: ${latestVersion.version}`)
      
      return NextResponse.json({
        latest: latestVersion,
        all: versions,
        totalReleases: versions.length,
        source: 'dynamic-scan'
      })
    }

    // If dynamic scan fails, use fallback
    console.log('Dynamic scan failed, using fallback data')
    return getFallbackVersions()

  } catch (error) {
    console.error('Error in dynamic version scanning:', error)
    return getFallbackVersions()
  }
}

function isVersionNewer(versionA: string, versionB: string): boolean {
  // Remove 'v' prefix and split by dots
  const partsA = versionA.replace('v', '').split('.').map(Number)
  const partsB = versionB.replace('v', '').split('.').map(Number)
  
  // Compare each part
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA > numB) return true
    if (numA < numB) return false
  }
  
  // If all parts are equal, versionA is not newer
  return false
}

function getShortReleaseNotes(version: string, fullNotes: string): string {
  // If no notes, return a short description
  if (!fullNotes || fullNotes.trim() === '') {
    return `GridHealth Agent ${version} release`
  }
  
  // Take first line or first 100 characters, whichever is shorter
  const firstLine = fullNotes.split('\n')[0].trim()
  if (firstLine.length <= 100) {
    return firstLine
  }
  
  return firstLine.substring(0, 97) + '...'
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

function getFallbackVersions() {
  console.log('Using fallback version data')
  
  const fallbackVersions: AgentVersion[] = [
    {
      version: "v1.0.3",
      downloadUrl: "https://gridhealth.arwindpianist.store/api/download/agent/v1.0.3",
      fileName: "GridHealth-Agent-v1.0.3.zip",
      fileSize: 69206016,
      releaseDate: "2025-08-26T23:30:00.000Z",
      releaseNotes: "Enhanced health monitoring, improved performance, bug fixes, and security improvements",
      downloadCount: 0,
      githubUrl: "https://github.com/Arwindpianist/gridhealth/releases/tag/v1.0.3"
    },
    {
      version: "v1.0.2",
      downloadUrl: "https://gridhealth.arwindpianist.store/api/download/agent/v1.0.2",
      fileName: "GridHealth-Agent-v1.0.2.zip",
      fileSize: 73400320,
      releaseDate: "2025-08-24T15:40:00.000Z",
      releaseNotes: "Fixed license validation issue - corrected API endpoint configuration mismatch",
      downloadCount: 0,
      githubUrl: "https://github.com/Arwindpianist/gridhealth/releases/tag/v1.0.2"
    },
    {
      version: "v1.0.1",
      downloadUrl: "https://github.com/Arwindpianist/gridhealth/releases/download/v1.0.1/GridHealth-Agent-v1.0.1.zip",
      fileName: "GridHealth-Agent-v1.0.1.zip",
      fileSize: 73114548,
      releaseDate: "2025-08-21T16:08:00.000Z",
      releaseNotes: "Fixed license validation and improved system tray functionality",
      downloadCount: 0,
      githubUrl: "https://github.com/Arwindpianist/gridhealth/releases/tag/v1.0.1"
    },
    {
      version: "v1.0.0",
      downloadUrl: "https://github.com/Arwindpianist/gridhealth/releases/download/v1.0.0/GridHealth-Agent-v1.0.0.zip",
      fileName: "GridHealth-Agent-v1.0.0.zip",
      fileSize: 69259530,
      releaseDate: "2025-08-21T11:48:00.000Z",
      releaseNotes: "Initial release with system tray application and real-time monitoring",
      downloadCount: 0,
      githubUrl: "https://github.com/Arwindpianist/gridhealth/releases/tag/v1.0.0"
    }
  ]
  
  return NextResponse.json({
    latest: fallbackVersions[0],
    all: fallbackVersions,
    totalReleases: fallbackVersions.length,
    source: 'fallback'
  })
} 