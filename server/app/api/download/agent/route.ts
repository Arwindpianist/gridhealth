import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    // Try multiple path resolution methods for the latest version
    const possiblePaths = [
      join(process.cwd(), '..', 'agent', 'release'),
      join(process.cwd(), 'agent', 'release'),
      join(__dirname, '..', '..', '..', '..', 'agent', 'release'),
      'C:/Users/arwin/Desktop/ADPMC/gridhealth/agent/release' // Fallback absolute path
    ]
    
    let agentReleasePath = ''
    let zipPath = ''
    
    for (const path of possiblePaths) {
      try {
        console.log(`Trying path: ${path}`)
        if (existsSync(path)) {
          const releases = readdirSync(path, { withFileTypes: true })
            .filter((dirent: any) => dirent.isDirectory() && dirent.name.startsWith('GridHealth-Agent-'))
            .sort((a: any, b: any) => {
              // Sort by version (newest first)
              const aVersion = a.name.replace('GridHealth-Agent-', '')
              const bVersion = b.name.replace('GridHealth-Agent-', '')
              return bVersion.localeCompare(aVersion)
            })
          
          if (releases.length > 0) {
            const latestRelease = releases[0]
            zipPath = join(path, `${latestRelease.name}.zip`)
            if (existsSync(zipPath)) {
              agentReleasePath = path
              console.log(`Found latest release at: ${zipPath}`)
              break
            }
          }
        }
      } catch (error) {
        console.log(`Path ${path} not accessible:`, error instanceof Error ? error.message : String(error))
        continue
      }
    }
    
    if (!zipPath || !existsSync(zipPath)) {
      console.error('No accessible agent release found')
      return NextResponse.json(
        { error: 'No agent release found' },
        { status: 404 }
      )
    }
    
    // Read the zip file
    const zipBuffer = readFileSync(zipPath)
    
    // Return the file as a download
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="GridHealth-Agent-latest.zip"',
        'Content-Length': zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error serving agent download:', error)
    return NextResponse.json(
      { error: 'Failed to serve agent download' },
      { status: 500 }
    )
  }
} 