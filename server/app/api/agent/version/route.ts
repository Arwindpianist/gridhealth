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
    // Fetch releases from GitHub API
    const githubResponse = await fetch(
      'https://api.github.com/repos/Arwindpianist/gridhealth/releases',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GridHealth-Agent'
        }
      }
    )

    if (!githubResponse.ok) {
      console.error('GitHub API error:', githubResponse.status, githubResponse.statusText)
      // Fallback to hardcoded data if GitHub API fails
      return getFallbackVersions()
    }

    const releases: GitHubRelease[] = await githubResponse.json()
    
    // Filter and map releases to our format
    const agentVersions: AgentVersion[] = releases
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

    if (agentVersions.length === 0) {
      console.log('No agent releases found, using fallback data')
      return getFallbackVersions()
    }

    const latestVersion = agentVersions[0]
    console.log(`Latest agent version from GitHub: ${latestVersion.version}`)
    
    return NextResponse.json({
      latest: latestVersion,
      all: agentVersions,
      totalReleases: agentVersions.length,
      source: 'github'
    })
  } catch (error) {
    console.error('Error fetching GitHub releases:', error)
    // Fallback to hardcoded data if GitHub API fails
    return getFallbackVersions()
  }
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

function getFallbackVersions() {
  console.log('Using fallback version data')
  
  const fallbackVersions: AgentVersion[] = [
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