import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Try multiple possible paths for AGENT_SKILL.md
    const possiblePaths = [
      path.join(process.cwd(), '..', 'AGENT_SKILL.md'),  // One level up (monorepo)
      path.join(process.cwd(), 'AGENT_SKILL.md'),        // Same directory (deployed)
      path.join(process.cwd(), 'public', 'AGENT_SKILL.md'), // Public directory
    ]
    
    let content = null
    for (const filePath of possiblePaths) {
      try {
        content = fs.readFileSync(filePath, 'utf8')
        break
      } catch {
        continue
      }
    }
    
    if (!content) {
      throw new Error('File not found')
    }
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    return new NextResponse('Skill documentation not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
}
