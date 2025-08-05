import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    console.log('🔍 Getting suggestions for:', query)

    // Try YouTube's suggestion API
    try {
      const suggestionUrl = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`
      
      const response = await fetch(suggestionUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      if (response.ok) {
        const text = await response.text()
        
        // Parse JSONP response - format is: window.google.ac.h(["query",[["suggestion1"],["suggestion2"],...]])
        const jsonMatch = text.match(/\[.*\]/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          const suggestions = parsed[1]?.map((item: any) => item[0]).filter((s: string) => s) || []
          
          console.log('✅ Got', suggestions.length, 'suggestions from YouTube')
          return NextResponse.json({ 
            suggestions: suggestions.slice(0, 10), // Limit to 10 suggestions
            source: 'youtube'
          })
        }
      }
    } catch (error) {
      console.log('⚠️ YouTube suggestions failed:', error)
    }

    // Fallback: Generate suggestions based on common search patterns
    const fallbackSuggestions = generateFallbackSuggestions(query)
    console.log('🔄 Using fallback suggestions')
    
    return NextResponse.json({ 
      suggestions: fallbackSuggestions,
      source: 'fallback'
    })

  } catch (error) {
    console.error('❌ Suggestions API error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}

function generateFallbackSuggestions(query: string): string[] {
  const queryLower = query.toLowerCase()
  
  // Common YouTube search patterns
  const patterns = [
    `${query} music`,
    `${query} video`,
    `${query} official`,
    `${query} lyrics`,
    `${query} live`,
    `${query} cover`,
    `${query} remix`,
    `${query} tutorial`,
    `${query} full`,
    `${query} hd`
  ]

  // Popular Arabic search terms
  const arabicPatterns = [
    `${query} أغنية`,
    `${query} فيديو`,
    `${query} كليب`,
    `${query} مباشر`,
    `${query} كاملة`,
    `${query} جديد`,
    `${query} حفلة`,
    `${query} شرح`,
    `${query} درس`,
    `${query} مترجم`
  ]

  // Popular searches based on query
  const popularSuggestions: { [key: string]: string[] } = {
    'music': ['music 2024', 'music video', 'music mix', 'music playlist', 'music live'],
    'song': ['songs 2024', 'songs playlist', 'songs mix', 'songs karaoke', 'songs lyrics'],
    'video': ['video funny', 'video tutorial', 'video game', 'video music', 'video viral'],
    'موسيقى': ['موسيقى هادئة', 'موسيقى حماسية', 'موسيقى عربية', 'موسيقى كلاسيكية', 'موسيقى رومانسية'],
    'أغنية': ['أغنية جديدة', 'أغنية حزينة', 'أغنية رومانسية', 'أغنية شعبية', 'أغنية عربية'],
    'فيلم': ['فيلم عربي', 'فيلم كوميدي', 'فيلم أكشن', 'فيلم رومانسي', 'فيلم جديد']
  }

  let suggestions: string[] = []

  // Add pattern-based suggestions
  if (queryLower.length > 0) {
    // Check if query contains Arabic characters
    const hasArabic = /[\u0600-\u06FF]/.test(query)
    
    if (hasArabic) {
      suggestions.push(...arabicPatterns.slice(0, 5))
    } else {
      suggestions.push(...patterns.slice(0, 5))
    }
  }

  // Add popular suggestions for specific terms
  for (const [term, termSuggestions] of Object.entries(popularSuggestions)) {
    if (queryLower.includes(term.toLowerCase())) {
      suggestions.push(...termSuggestions.slice(0, 3))
      break
    }
  }

  // Remove duplicates and limit results
  return [...new Set(suggestions)].slice(0, 8)
}
