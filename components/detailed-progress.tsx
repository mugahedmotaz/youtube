"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Pause, 
  Play, 
  X,
  FileVideo,
  Music,
  Wifi,
  HardDrive
} from "lucide-react"

interface DetailedProgressProps {
  downloads: Array<{
    id: string
    title: string
    type: "video" | "audio"
    quality?: string
    status: "pending" | "downloading" | "completed" | "failed" | "paused"
    progress: number
    speed?: string
    eta?: string
    downloadedSize?: string
    totalSize?: string
  }>
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
}

export function DetailedProgress({ downloads, onPause, onResume, onCancel }: DetailedProgressProps) {
  if (downloads.length === 0) {
    return null
  }

  const formatBytes = (bytes: string) => {
    if (!bytes) return ""
    const num = parseFloat(bytes)
    if (isNaN(num)) return bytes
    
    const units = ['B', 'KB', 'MB', 'GB']
    let unitIndex = 0
    let size = num
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const getProgressColor = (progress: number) => {
    if (progress < 25) return "text-red-500"
    if (progress < 50) return "text-orange-500"
    if (progress < 75) return "text-yellow-500"
    return "text-green-500"
  }

  const getStatusIcon = (status: string, type: "video" | "audio") => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />
      case "downloading":
        return <Download className="w-5 h-5 text-blue-500 animate-pulse" />
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case "paused":
        return <Pause className="w-5 h-5 text-orange-500" />
      default:
        return type === "video" ? <FileVideo className="w-5 h-5" /> : <Music className="w-5 h-5" />
    }
  }

  return (
    <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Download className="w-6 h-6" />
          تفاصيل التحميلات ({downloads.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {downloads.map((download) => (
          <div 
            key={download.id} 
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm"
          >
            {/* Header with Title and Controls */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getStatusIcon(download.status, download.type)}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg truncate mb-2" title={download.title}>
                    {download.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">
                      {download.type === "video" ? (
                        <><FileVideo className="w-3 h-3 mr-1" /> فيديو {download.quality}</>
                      ) : (
                        <><Music className="w-3 h-3 mr-1" /> صوت MP3</>
                      )}
                    </Badge>
                    <Badge 
                      variant={download.status === "completed" ? "default" : "outline"}
                      className={`text-sm ${
                        download.status === "downloading" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                        download.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                        download.status === "failed" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                        download.status === "paused" ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" :
                        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}
                    >
                      {download.status === "pending" && "في الانتظار"}
                      {download.status === "downloading" && "جاري التحميل"}
                      {download.status === "completed" && "مكتمل"}
                      {download.status === "failed" && "فشل"}
                      {download.status === "paused" && "متوقف"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center gap-2">
                {download.status === "downloading" && onPause && (
                  <Button size="sm" variant="outline" onClick={() => onPause(download.id)}>
                    <Pause className="w-4 h-4" />
                  </Button>
                )}
                {download.status === "paused" && onResume && (
                  <Button size="sm" variant="outline" onClick={() => onResume(download.id)}>
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                {onCancel && (download.status === "downloading" || download.status === "paused" || download.status === "pending") && (
                  <Button size="sm" variant="outline" onClick={() => onCancel(download.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Section */}
            {(download.status === "downloading" || download.status === "paused") && (
              <div className="space-y-4">
                {/* Large Progress Display */}
                <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className={`text-5xl font-bold mb-2 ${getProgressColor(download.progress)}`}>
                    {download.progress.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    نسبة التحميل
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <Progress 
                    value={download.progress} 
                    className="h-3 bg-gray-200 dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {download.speed && (
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <Wifi className="w-5 h-5 mx-auto mb-1 text-green-600" />
                      <div className="font-semibold text-green-700 dark:text-green-300">
                        {download.speed}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        السرعة
                      </div>
                    </div>
                  )}
                  
                  {download.eta && (
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                      <div className="font-semibold text-orange-700 dark:text-orange-300">
                        {download.eta}
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        الوقت المتبقي
                      </div>
                    </div>
                  )}
                  
                  {download.totalSize && (
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <HardDrive className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                      <div className="font-semibold text-blue-700 dark:text-blue-300">
                        {formatBytes(download.totalSize)}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        الحجم الكلي
                      </div>
                    </div>
                  )}
                  
                  {download.downloadedSize && (
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <Download className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <div className="font-semibold text-purple-700 dark:text-purple-300">
                        {formatBytes(download.downloadedSize)}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        تم تحميله
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Messages */}
            {download.status === "completed" && (
              <div className="text-center py-6 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <div className="text-xl font-bold text-green-700 dark:text-green-300 mb-1">
                  تم التحميل بنجاح!
                </div>
                <div className="text-green-600 dark:text-green-400">
                  100% - اكتمل التحميل
                </div>
              </div>
            )}

            {download.status === "failed" && (
              <div className="text-center py-6 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                <div className="text-xl font-bold text-red-700 dark:text-red-300 mb-1">
                  فشل في التحميل
                </div>
                <div className="text-red-600 dark:text-red-400">
                  يرجى المحاولة مرة أخرى
                </div>
              </div>
            )}

            {download.status === "pending" && (
              <div className="text-center py-6 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <Clock className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300 mb-1">
                  في انتظار بدء التحميل
                </div>
                <div className="text-yellow-600 dark:text-yellow-400">
                  سيبدأ التحميل قريباً...
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
