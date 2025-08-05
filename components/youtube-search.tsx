"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Play, Eye, Calendar, User, Clock, Loader2 } from "lucide-react"
import Image from "next/image"

interface Video {
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

interface YouTubeSearchProps {
  language: "ar" | "en"
  onDownload: (item: {
    id: string
    title: string
    type: "video" | "audio"
    quality?: string
    url: string
  }) => void
}

export function YouTubeSearch({ language, onDownload }: YouTubeSearchProps) {
  const [query, setQuery] = useState("")
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [searchSource, setSearchSource] = useState<string>('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [searchInfo, setSearchInfo] = useState<{
    cached: boolean
    source: string
    cacheInfo?: any
  } | null>(null)

  const texts = {
    ar: {
      title: "البحث في يوتيوب",
      description: "ابحث عن الفيديوهات وحملها مباشرة",
      placeholder: "ابحث عن فيديوهات يوتيوب...",
      searchButton: "بحث",
      searching: "جاري البحث...",
      downloadVideo: "تحميل فيديو",
      downloadAudio: "تحميل صوت",
      downloading: "جاري التحميل...",
      views: "مشاهدة",
      noResults: "لا توجد نتائج",
      errorMessage: "حدث خطأ في البحث",
      tryAgain: "حاول مرة أخرى",
      duration: "المدة",
      uploader: "القناة",
      uploadDate: "تاريخ النشر"
    },
    en: {
      title: "YouTube Search",
      description: "Search for videos and download them directly",
      placeholder: "Search YouTube videos...",
      searchButton: "Search",
      searching: "Searching...",
      downloadVideo: "Download Video",
      downloadAudio: "Download Audio",
      downloading: "Downloading...",
      views: "views",
      noResults: "No results found",
      errorMessage: "Search error occurred",
      tryAgain: "Try again",
      duration: "Duration",
      uploader: "Channel",
      uploadDate: "Upload Date"
    }
  }

  const t = texts[language]

  // Get search suggestions
  const getSuggestions = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const response = await fetch(`/api/suggestions?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error('Failed to get suggestions:', error)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setQuery(value)
    setSelectedSuggestionIndex(-1)
    
    // Debounce suggestions
    const timeoutId = setTimeout(() => {
      getSuggestions(value)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        searchVideos()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex])
        } else {
          searchVideos()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  // Select a suggestion
  const selectSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    // No auto-search - user needs to click search button
  }

  const searchVideos = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError("")
    setVideos([])
    setSearchInfo(null)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), maxResults: 20 })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle rate limiting specifically
        if (response.status === 429 && data.rateLimited) {
          const waitTime = data.waitTime || 60
          const errorMsg = language === 'ar' 
            ? `طلبات كثيرة جداً. يرجى الانتظار ${waitTime} ثانية قبل البحث مرة أخرى`
            : `Too many requests. Please wait ${waitTime} seconds before searching again`
          throw new Error(errorMsg)
        }
        throw new Error(data.error || 'Search failed')
      }

      // Store search information
      setSearchInfo({
        cached: data.cached || false,
        source: data.source || 'unknown',
        cacheInfo: data.cacheInfo
      })
      
      // Show if results are cached
      if (data.cached) {
        console.log('📦 Using cached results')
      }
      
      setVideos(data.videos || [])
    } catch (err: any) {
      setError(err.message || t.errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (video: Video, type: "video" | "audio") => {
    const downloadId = `${video.id}-${type}`
    
    setDownloadingIds(prev => new Set([...prev, downloadId]))

    try {
      await onDownload({
        id: video.id,
        title: video.title,
        type: type,
        quality: type === "video" ? "720p" : "best",
        url: video.webpage_url
      })
    } catch (error) {
      console.error('Download error:', error)
    } finally {
      // Remove from downloading set after a delay
      setTimeout(() => {
        setDownloadingIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(downloadId)
          return newSet
        })
      }, 2000)
    }
  }

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const formatUploadDate = (dateString: string) => {
    if (!dateString) return language === 'ar' ? 'غير محدد' : 'Unknown'
    
    try {
      // Handle different date formats
      let date: Date
      
      // Format: YYYYMMDD (from yt-dlp)
      if (dateString.length === 8 && /^\d{8}$/.test(dateString)) {
        const year = dateString.substring(0, 4)
        const month = dateString.substring(4, 6)
        const day = dateString.substring(6, 8)
        date = new Date(`${year}-${month}-${day}`)
      }
      // Format: YYYY-MM-DD or other ISO formats
      else if (dateString.includes('-')) {
        date = new Date(dateString)
      }
      // Format: relative time (e.g., "2 years ago")
      else if (dateString.includes('ago') || dateString.includes('منذ')) {
        return dateString
      }
      // Default: try to parse as-is
      else {
        date = new Date(dateString)
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString || (language === 'ar' ? 'غير محدد' : 'Unknown')
      }
      
      // Calculate relative time
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (language === 'ar') {
        if (diffDays === 1) return 'منذ يوم واحد'
        if (diffDays < 7) return `منذ ${diffDays} أيام`
        if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`
        if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`
        return `منذ ${Math.floor(diffDays / 365)} سنوات`
      } else {
        if (diffDays === 1) return '1 day ago'
        if (diffDays < 7) return `${diffDays} days ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
        return `${Math.floor(diffDays / 365)} years ago`
      }
      
    } catch (error) {
      console.log('Date parsing error:', error, 'for date:', dateString)
      return dateString || (language === 'ar' ? 'غير محدد' : 'Unknown')
    }
  }



  return (
    <Card className="w-full" dir={language === "ar" ? "rtl" : "ltr"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input with Suggestions */}
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder={t.placeholder}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => query.length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="flex-1"
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                      index === selectedSuggestionIndex ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={searchVideos} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.searching}
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                {t.searchButton}
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-center py-4">
            <p className="text-destructive mb-2">{error}</p>
            <Button variant="outline" onClick={searchVideos}>
              {t.tryAgain}
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">{t.searching}</p>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && videos.length === 0 && query && (
          <div className="text-center py-8">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t.noResults}</p>
          </div>
        )}

        {/* Search Info */}
        {searchInfo && videos.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {searchInfo.cached ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 dark:text-green-400">
                      {language === 'ar' ? 'نتائج محفوظة (سريعة)' : 'Cached Results (Fast)'}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-600 dark:text-blue-400">
                      {language === 'ar' ? 'نتائج جديدة' : 'Fresh Results'}
                    </span>
                  </>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'مصدر:' : 'Source:'} {searchInfo.source}
              </div>
            </div>
          </div>
        )}

        {/* Video Results */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <Image
                    src={video.thumbnail || '/placeholder-video.svg'}
                    alt={video.title}
                    width={320}
                    height={180}
                    className="w-full h-48 object-cover"
                    unoptimized
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder-video.svg'
                    }}
                  />
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs">
                    {video.duration}
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 leading-tight">
                    {video.title}
                  </h3>
                  
                  <div className="space-y-2 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="truncate">{video.uploader}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{formatViewCount(video.view_count)} {t.views}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatUploadDate(video.upload_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Download Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleDownload(video, "video")}
                      disabled={downloadingIds.has(`${video.id}-video`)}
                    >
                      {downloadingIds.has(`${video.id}-video`) ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          {t.downloading}
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 mr-1" />
                          {t.downloadVideo}
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleDownload(video, "audio")}
                      disabled={downloadingIds.has(`${video.id}-audio`)}
                    >
                      {downloadingIds.has(`${video.id}-audio`) ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          {t.downloading}
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 mr-1" />
                          {t.downloadAudio}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
