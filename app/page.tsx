"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Youtube, AlertTriangle, Globe, Search, Link } from "lucide-react"
import { VideoInfo } from "@/components/video-info"
import { PlaylistInfo } from "@/components/playlist-info"
import { ThemeToggle } from "@/components/theme-toggle"
import { DownloadPercentage } from "@/components/download-percentage"
import { YouTubeSearch } from "@/components/youtube-search"
import Footer from "../components/footer"

interface VideoData {
  id: string
  title: string
  thumbnail: string
  duration: string
  author?: string
  viewCount?: string
  formats: Array<{
    quality: string
    format: string
    url: string
    itag?: number
  }>
}

interface PlaylistData {
  id: string
  title: string
  videos: VideoData[]
}

interface DownloadItem {
  id: string
  title: string
  type: "video" | "audio"
  quality?: string
  status: "pending" | "downloading" | "completed" | "failed"
  progress: number
  speed?: string
  eta?: string
  downloadedSize?: string
  totalSize?: string
}

export default function HomePage() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null)
  const [error, setError] = useState("")
  const [language, setLanguage] = useState<"ar" | "en">("ar")
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [activeTab, setActiveTab] = useState<"search" | "url">("search")

  const isValidYouTubeUrl = (url: string) => {
    const patterns = [
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=.+/,
      /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=.+/,
      /^https?:\/\/youtu\.be\/.+/,
    ]
    return patterns.some((pattern) => pattern.test(url))
  }

  const isPlaylistUrl = (url: string) => {
    return url.includes("playlist?list=") || url.includes("&list=")
  }

  const fetchVideoInfo = async () => {
    if (!url.trim()) {
      setError(language === "ar" ? "يرجى إدخال رابط YouTube" : "Please enter a YouTube URL")
      return
    }

    if (!isValidYouTubeUrl(url)) {
      setError(language === "ar" ? "يرجى إدخال رابط YouTube صحيح" : "Please enter a valid YouTube URL")
      return
    }

    setLoading(true)
    setError("")
    setVideoData(null)
    setPlaylistData(null)

    try {
      const endpoint = isPlaylistUrl(url) ? "/api/playlist-info" : "/api/video-info"
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response")
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (isPlaylistUrl(url)) {
        setPlaylistData(data)
      } else {
        setVideoData(data)
      }
    } catch (err: any) {
      setError(
        language === "ar"
          ? `فشل في جلب معلومات الفيديو: ${err.message}`
          : `Failed to fetch video information: ${err.message}`,
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (item: {
    id: string
    title: string
    type: "video" | "audio"
    quality?: string
    url: string
  }) => {
    const downloadId = `${item.id}-${Date.now()}`
    
    // Add to downloads list
    const newDownload: DownloadItem = {
      id: downloadId,
      title: item.title,
      type: item.type,
      quality: item.quality,
      status: "downloading",
      progress: 0
    }
    
    setDownloads(prev => [...prev, newDownload])

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: item.id,
          title: item.title,
          type: item.type === "audio" ? "mp3" : "mp4",
          quality: item.quality,
          url: item.url,
          downloadId: downloadId
        }),
      })

      if (!response.ok) {
        throw new Error("Download failed")
      }

      if (!response.body) {
        throw new Error("No response body")
      }

      const reader = response.body.getReader()
      const contentLength = +(response.headers.get('Content-Length') || 0)
      let receivedLength = 0
      const chunks = []
      let lastUpdateTime = Date.now()
      let startTime = Date.now()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        receivedLength += value.length

        // Update progress more frequently and accurately
        const now = Date.now()
        if (now - lastUpdateTime > 100 || contentLength > 0) { // Update every 100ms
          const progress = contentLength > 0 
            ? Math.round((receivedLength / contentLength) * 100)
            : Math.round((receivedLength / (1024 * 1024)) * 10) // Estimate for unknown size
          
          const elapsedSeconds = (now - startTime) / 1000
          const speed = elapsedSeconds > 0 
            ? `${(receivedLength / 1024 / 1024 / elapsedSeconds).toFixed(1)} MB/s`
            : undefined
          
          const eta = contentLength > 0 && receivedLength > 0 && elapsedSeconds > 0
            ? (() => {
                const remainingBytes = contentLength - receivedLength
                const bytesPerSecond = receivedLength / elapsedSeconds
                const remainingSeconds = Math.round(remainingBytes / bytesPerSecond)
                const minutes = Math.floor(remainingSeconds / 60)
                const seconds = remainingSeconds % 60
                return `${minutes}:${seconds.toString().padStart(2, '0')}`
              })()
            : undefined
          
          const formatBytes = (bytes: number) => {
            const units = ['B', 'KB', 'MB', 'GB']
            let unitIndex = 0
            let size = bytes
            while (size >= 1024 && unitIndex < units.length - 1) {
              size /= 1024
              unitIndex++
            }
            return `${size.toFixed(1)} ${units[unitIndex]}`
          }
          
          const downloadedSize = formatBytes(receivedLength)
          const totalSize = contentLength > 0 ? formatBytes(contentLength) : undefined

          setDownloads(prev => prev.map(d => 
            d.id === downloadId 
              ? { 
                  ...d, 
                  progress: Math.min(progress, 100), 
                  speed,
                  eta,
                  downloadedSize,
                  totalSize,
                  status: "downloading" as const
                } 
              : d
          ))
          
          lastUpdateTime = now
        }
      }

      // Create download link
      const blob = new Blob(chunks)
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.type === "audio" ? "mp3" : "mp4"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)

      // Mark as completed
      setDownloads(prev => prev.map(d => 
        d.id === downloadId ? { ...d, status: "completed", progress: 100 } : d
      ))

    } catch (err: any) {
      setDownloads(prev => prev.map(d => 
        d.id === downloadId ? { ...d, status: "failed" } : d
      ))
    }
  }

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "ar" ? "en" : "ar"))
  }

  const texts = {
    ar: {
      title: "محمل فيديوهات يوتيوب",
      description: "محمل حديث لفيديوهات وقوائم التشغيل من يوتيوب مع عرض نسبة التحميل.",
      warning: "يرجى التأكد من حصولك على إذن لتحميل المحتوى والامتثال لشروط خدمة يوتيوب.",
      cardTitle: "معلومات فيديوهات وقوائم تشغيل يوتيوب",
      placeholder: "الصق رابط يوتيوب هنا (فيديو أو قائمة تشغيل)...",
      fetchButton: "جلب المعلومات",
      fetching: "جاري الجلب...",
      searchTab: "البحث",
      urlTab: "الرابط المباشر",
    },
    en: {
      title: "YouTube Downloader",
      description: "Modern YouTube video and playlist downloader with download progress display.",
      warning: "Please ensure you have permission to download content and comply with YouTube's Terms of Service.",
      cardTitle: "YouTube Videos & Playlists Info",
      placeholder: "Paste YouTube URL here (video or playlist)...",
      fetchButton: "Fetch Info",
      fetching: "Fetching...",
      searchTab: "Search",
      urlTab: "Direct URL",
    },
  }

  const t = texts[language]

  return (
    <div className="min-h-screen bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Mobile-Friendly Header */}
        <div className="relative mb-8 p-6 rounded-2xl bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-red-950/20 dark:via-background dark:to-orange-950/20 border border-red-100 dark:border-red-900/20 shadow-lg">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-50">
            <div className="w-full h-full bg-gradient-to-br from-red-100/20 to-orange-100/20 dark:from-red-900/10 dark:to-orange-900/10"></div>
          </div>
          
          {/* Header Content */}
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500 shadow-lg">
                <Youtube className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
                  {t.title}
                </h1>
                <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                  {language === "ar" ? "حمل فيديوهات يوتيوب بجودة عالية" : "Download YouTube videos in high quality"}
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleLanguage}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Globe className="w-4 h-4 mr-1" />
                <span className="hidden xs:inline">
                  {language === "ar" ? "English" : "عربي"}
                </span>
                <span className="xs:hidden">
                  {language === "ar" ? "EN" : "ع"}
                </span>
              </Button>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-red-200 dark:border-red-800">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
            <Button
              variant={activeTab === "search" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("search")}
              className="rounded-md"
            >
              <Search className="w-4 h-4 mr-1" />
              {t.searchTab}
            </Button>
            <Button
              variant={activeTab === "url" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("url")}
              className="rounded-md"
            >
              <Link className="w-4 h-4 mr-1" />
              {t.urlTab}
            </Button>
          </div>
        </div>

        {/* YouTube Search Component */}
        {activeTab === "search" && (
          <div className="mb-8">
            <YouTubeSearch 
              language={language}
              onDownload={handleDownload}
            />
          </div>
        )}

        {/* URL Input Card */}
        {activeTab === "url" && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              {t.cardTitle}
            </CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={t.placeholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && fetchVideoInfo()}
                className="flex-1"
              />
              <Button onClick={fetchVideoInfo} disabled={loading}>
                {loading ? t.fetching : t.fetchButton}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {t.warning}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        )}

        {/* Video Info */}
        {videoData && (
          <VideoInfo 
            video={videoData} 
            onDownload={handleDownload} 
          />
        )}

        {/* Playlist Info */}
        {playlistData && (
          <PlaylistInfo 
            playlist={playlistData} 
            onDownload={handleDownload} 
          />
        )}

        {/* Download Progress - Before Footer */}
        <DownloadPercentage downloads={downloads} />

        <Footer />
      </div>
    </div>
  )
}
