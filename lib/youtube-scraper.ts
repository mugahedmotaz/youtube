// YouTube search scraper utility
export interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  duration: string
  uploader: string
  view_count: number
  upload_date: string
  url: string
  webpage_url: string
}

// Scrape YouTube search results using web scraping
export async function scrapeYouTubeSearch(query: string, maxResults: number = 20): Promise<YouTubeVideo[]> {
  try {
    console.log('🌐 Attempting to scrape YouTube search for:', query)
    
    // Use YouTube's search URL
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    
    // Extract video data from YouTube's initial data
    const scriptMatch = html.match(/var ytInitialData = ({.*?});/)
    if (!scriptMatch) {
      throw new Error('Could not find YouTube initial data')
    }
    
    const initialData = JSON.parse(scriptMatch[1])
    const contents = initialData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents
    
    if (!contents) {
      throw new Error('Could not find search results in YouTube data')
    }
    
    const videos: YouTubeVideo[] = []
    
    for (const item of contents) {
      if (item.videoRenderer) {
        const video = item.videoRenderer
        const videoId = video.videoId
        
        if (videoId && videos.length < maxResults) {
          videos.push({
            id: videoId,
            title: video.title?.runs?.[0]?.text || video.title?.simpleText || 'Unknown Title',
            thumbnail: video.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            duration: video.lengthText?.simpleText || '0:00',
            uploader: video.ownerText?.runs?.[0]?.text || 'Unknown',
            view_count: parseViewCount(video.viewCountText?.simpleText || '0'),
            upload_date: video.publishedTimeText?.simpleText || '',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            webpage_url: `https://www.youtube.com/watch?v=${videoId}`
          })
        }
      }
    }
    
    console.log('✅ Successfully scraped', videos.length, 'videos')
    return videos
    
  } catch (error) {
    console.error('❌ YouTube scraping failed:', error)
    return []
  }
}

// Alternative method using YouTube's internal API
export async function searchYouTubeInternal(query: string, maxResults: number = 20): Promise<YouTubeVideo[]> {
  try {
    console.log('🔍 Using YouTube internal API for:', query)
    
    // YouTube's internal search API endpoint
    const apiUrl = 'https://www.youtube.com/youtubei/v1/search'
    const params = {
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20231201.01.00'
        }
      },
      query: query,
      params: 'EgIQAQ%3D%3D' // Filter for videos only
    }
    
    const response = await fetch(`${apiUrl}?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(params)
    })
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents
    
    if (!contents) {
      throw new Error('No search results found')
    }
    
    const videos: YouTubeVideo[] = []
    
    for (const item of contents) {
      if (item.videoRenderer && videos.length < maxResults) {
        const video = item.videoRenderer
        const videoId = video.videoId
        
        if (videoId) {
          videos.push({
            id: videoId,
            title: video.title?.runs?.[0]?.text || video.title?.simpleText || 'Unknown Title',
            thumbnail: video.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            duration: video.lengthText?.simpleText || '0:00',
            uploader: video.ownerText?.runs?.[0]?.text || 'Unknown',
            view_count: parseViewCount(video.viewCountText?.simpleText || '0'),
            upload_date: video.publishedTimeText?.simpleText || '',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            webpage_url: `https://www.youtube.com/watch?v=${videoId}`
          })
        }
      }
    }
    
    console.log('✅ Internal API returned', videos.length, 'videos')
    return videos
    
  } catch (error) {
    console.error('❌ YouTube internal API failed:', error)
    return []
  }
}

// Parse view count text to number
function parseViewCount(viewText: string): number {
  if (!viewText) return 0
  
  const cleanText = viewText.replace(/[^\d.KMB]/gi, '')
  const number = parseFloat(cleanText)
  
  if (cleanText.includes('K')) return Math.floor(number * 1000)
  if (cleanText.includes('M')) return Math.floor(number * 1000000)
  if (cleanText.includes('B')) return Math.floor(number * 1000000000)
  
  return Math.floor(number) || 0
}

// Get trending videos as fallback
export function getTrendingVideos(): YouTubeVideo[] {
  return [
    {
      id: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      duration: '3:32',
      uploader: 'Rick Astley',
      view_count: 1400000000,
      upload_date: '2009-10-25',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      webpage_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      id: 'kJQP7kiw5Fk',
      title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
      thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg',
      duration: '4:42',
      uploader: 'Luis Fonsi',
      view_count: 8200000000,
      upload_date: '2017-01-12',
      url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      webpage_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk'
    },
    {
      id: 'fJ9rUzIMcZQ',
      title: 'Queen - Bohemian Rhapsody (Official Video)',
      thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg',
      duration: '5:55',
      uploader: 'Queen Official',
      view_count: 1900000000,
      upload_date: '2008-10-01',
      url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
      webpage_url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ'
    },
    {
      id: 'JGwWNGJdvx8',
      title: 'Ed Sheeran - Shape of You (Official Video)',
      thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg',
      duration: '3:53',
      uploader: 'Ed Sheeran',
      view_count: 6000000000,
      upload_date: '2017-01-30',
      url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8',
      webpage_url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8'
    },
    {
      id: 'YQHsXMglC9A',
      title: 'Adele - Hello (Official Music Video)',
      thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
      duration: '6:07',
      uploader: 'Adele',
      view_count: 3400000000,
      upload_date: '2015-10-22',
      url: 'https://www.youtube.com/watch?v=YQHsXMglC9A',
      webpage_url: 'https://www.youtube.com/watch?v=YQHsXMglC9A'
    }
  ]
}
