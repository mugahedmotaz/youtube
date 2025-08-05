import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { scrapeYouTubeSearch, searchYouTubeInternal, getTrendingVideos, YouTubeVideo } from '@/lib/youtube-scraper'
import { rateLimiter } from '@/lib/rate-limiter'

// Simple in-memory cache
interface CacheEntry {
  data: YouTubeVideo[]
  timestamp: number
  source: string
}

const searchCache = new Map<string, CacheEntry>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes
const MAX_CACHE_SIZE = 100

// Clean expired cache entries
function cleanExpiredCache() {
  const now = Date.now()
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      searchCache.delete(key)
    }
  }
  
  // Limit cache size
  if (searchCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(searchCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE)
    toDelete.forEach(([key]) => searchCache.delete(key))
  }
}

// Get client IP for rate limiting
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = forwarded?.split(',')[0] || realIP || 'unknown'
  return clientIP
}

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 20 } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Clean expired cache entries
    cleanExpiredCache()

    // Create cache key
    const cacheKey = `${query.toLowerCase().trim()}-${maxResults}`
    
    // Check cache first
    const cachedResult = searchCache.get(cacheKey)
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      console.log('✅ Returning cached results for:', query)
      return NextResponse.json({ 
        videos: cachedResult.data, 
        source: `cached_${cachedResult.source}`,
        cached: true 
      })
    }

    // Rate limiting check
    const clientIP = getClientIP(request)
    
    // Cleanup old rate limit entries
    rateLimiter.cleanup()
    
    if (!rateLimiter.isAllowed(clientIP)) {
      const remainingRequests = rateLimiter.getRemainingRequests(clientIP)
      const waitTime = rateLimiter.getTimeUntilReset(clientIP)
      
      console.log(`🚫 Rate limit exceeded for IP: ${clientIP}, wait: ${waitTime}s`)
      
      // Return cached result if available, even if expired
      if (cachedResult) {
        console.log('📦 Returning expired cache due to rate limit')
        return NextResponse.json({ 
          videos: cachedResult.data, 
          source: `rate_limited_cache_${cachedResult.source}`,
          cached: true,
          rateLimited: true
        })
      }
      
      return NextResponse.json({ 
        error: 'طلبات كثيرة جداً. يرجى الانتظار قبل البحث مرة أخرى',
        errorEn: `Too many requests. Please wait ${waitTime} seconds before searching again`,
        remainingRequests,
        waitTime,
        rateLimited: true
      }, { status: 429 })
    }

    console.log('🔍 Searching for:', query)

    // Try multiple possible paths for yt-dlp
    const possiblePaths = [
      path.join(process.cwd(), 'bin', 'yt-dlp.exe'),
      path.join(process.cwd(), 'yt-dlp.exe'),
      'yt-dlp.exe',
      'yt-dlp'
    ]

    let ytDlpPath = ''
    for (const testPath of possiblePaths) {
      try {
        if (fs.existsSync(testPath)) {
          ytDlpPath = testPath
          console.log('✅ Found yt-dlp at:', ytDlpPath)
          break
        }
      } catch (e) {
        // Try next path
      }
    }

    if (!ytDlpPath) {
      console.log('❌ yt-dlp not found, using fallback')
      const fallbackVideos = await getRealYouTubeVideos(query, maxResults)
      
      // Cache the result
      searchCache.set(cacheKey, {
        data: fallbackVideos,
        timestamp: Date.now(),
        source: 'fallback'
      })
      
      return NextResponse.json({
        videos: fallbackVideos,
        source: 'fallback',
        cached: false,
        cacheInfo: {
          totalCacheEntries: searchCache.size,
          cacheKey: cacheKey
        }
      })
    }
    
    // Build yt-dlp search query
    const searchQuery = `ytsearch${maxResults}:${query}`

    const args = [
      '--dump-single-json',
      '--no-warnings',
      '--quiet',
      '--skip-download',
      '--extract-flat',
      '--no-check-certificate',
      searchQuery
    ]

    console.log('🚀 Running yt-dlp with args:', args)

    return new Promise((resolve) => {
      const ytDlp = spawn(ytDlpPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      })
      
      let output = ''
      let errorOutput = ''
      let timeoutId: NodeJS.Timeout

      // Set timeout for the process
      timeoutId = setTimeout(async () => {
        console.log('⏰ yt-dlp timeout, killing process')
        ytDlp.kill('SIGKILL')
        const timeoutVideos = await getRealYouTubeVideos(query, maxResults)
        
        // Cache the timeout fallback result
        searchCache.set(cacheKey, {
          data: timeoutVideos,
          timestamp: Date.now(),
          source: 'timeout_fallback'
        })
        
        resolve(NextResponse.json({
          videos: timeoutVideos,
          source: 'timeout_fallback',
          cached: false
        }))
      }, 30000) // 30 seconds timeout

      ytDlp.stdout.on('data', (data) => {
        output += data.toString()
      })

      ytDlp.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ytDlp.on('error', async (error) => {
        console.error('❌ yt-dlp spawn error:', error)
        clearTimeout(timeoutId)
        const errorVideos = await getRealYouTubeVideos(query, maxResults)
        
        // Cache the error fallback result
        searchCache.set(cacheKey, {
          data: errorVideos,
          timestamp: Date.now(),
          source: 'spawn_error_fallback'
        })
        
        resolve(NextResponse.json({
          videos: errorVideos,
          source: 'spawn_error_fallback',
          cached: false
        }))
      })

      ytDlp.on('close', async (code) => {
        clearTimeout(timeoutId)
        
        console.log('📊 yt-dlp exit code:', code)
        console.log('📝 yt-dlp output length:', output.length)
        console.log('🚨 yt-dlp error output:', errorOutput)

        if (code !== 0 || !output.trim()) {
          console.error('❌ yt-dlp failed, using fallback')
          const failedVideos = await getRealYouTubeVideos(query, maxResults)
          
          // Cache the failed fallback result
          searchCache.set(cacheKey, {
            data: failedVideos,
            timestamp: Date.now(),
            source: 'yt-dlp_failed_fallback'
          })
          
          resolve(NextResponse.json({
            videos: failedVideos,
            source: 'yt-dlp_failed_fallback',
            cached: false
          }))
          return
        }

        try {
          const json = JSON.parse(output)
          console.log('✅ Parsed JSON successfully')
          
          const entries = json.entries || []
          console.log('📹 Found entries:', entries.length)
          
          const videos = entries.map((video: any) => ({
            id: video.id,
            title: video.title || 'Unknown Title',
            thumbnail: video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`,
            duration: formatDuration(video.duration),
            uploader: video.uploader || video.channel || 'Unknown',
            view_count: video.view_count || 0,
            upload_date: video.upload_date,
            url: `https://www.youtube.com/watch?v=${video.id}`,
            webpage_url: `https://www.youtube.com/watch?v=${video.id}`
          }))

          console.log('✅ Successfully processed', videos.length, 'videos')
          
          // Cache the successful result
          searchCache.set(cacheKey, {
            data: videos,
            timestamp: Date.now(),
            source: 'yt-dlp'
          })
          
          resolve(NextResponse.json({ 
            videos, 
            source: 'yt-dlp',
            cached: false,
            cacheInfo: {
              totalCacheEntries: searchCache.size,
              cacheKey: cacheKey
            }
          }))
        } catch (error) {
          console.error('❌ JSON parse error:', error)
          console.log('Raw output:', output.substring(0, 500))
          const parseErrorVideos = await getRealYouTubeVideos(query, maxResults)
          
          // Cache the parse error fallback result
          searchCache.set(cacheKey, {
            data: parseErrorVideos,
            timestamp: Date.now(),
            source: 'parse_error_fallback'
          })
          
          resolve(NextResponse.json({ 
            videos: parseErrorVideos, 
            source: 'parse_error_fallback',
            cached: false
          }))
        }
      })
    })
  } catch (error) {
    console.error('❌ Search API error:', error)
    // Use default values since variables might not be available in catch scope
    const fallbackVideos = await getRealYouTubeVideos('trending', 20)
    return NextResponse.json(
      { 
        videos: fallbackVideos, 
        source: 'api_error_fallback',
        cached: false
      },
      { status: 200 } // Return 200 with fallback data instead of 500
    )
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Real YouTube videos using multiple fallback methods
async function getRealYouTubeVideos(query: string, maxResults: number = 20): Promise<YouTubeVideo[]> {
  console.log('🔍 Trying alternative YouTube search methods for:', query)
  
  // Method 1: Try YouTube internal API
  try {
    const internalResults = await searchYouTubeInternal(query, maxResults)
    if (internalResults.length > 0) {
      console.log('✅ YouTube internal API returned', internalResults.length, 'results')
      return internalResults
    }
  } catch (error) {
    console.log('⚠️ YouTube internal API failed:', error)
  }
  
  // Method 2: Try web scraping
  try {
    const scrapedResults = await scrapeYouTubeSearch(query, maxResults)
    if (scrapedResults.length > 0) {
      console.log('✅ YouTube scraping returned', scrapedResults.length, 'results')
      return scrapedResults
    }
  } catch (error) {
    console.log('⚠️ YouTube scraping failed:', error)
  }
  
  // Method 3: Return trending videos as final fallback
  console.log('🔥 Using trending videos as fallback')
  const trendingVideos = getTrendingVideos()
  
  // Add search indication to first video
  if (trendingVideos.length > 0) {
    trendingVideos[0] = {
      ...trendingVideos[0],
      title: `🔍 نتائج البحث عن "${query}" - ${trendingVideos[0].title}`
    }
  }
  
  return trendingVideos.slice(0, maxResults)
}
