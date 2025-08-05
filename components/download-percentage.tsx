"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, CheckCircle, AlertCircle, Clock, Pause, Play, X, RotateCcw } from "lucide-react"
import { useState, useEffect } from "react"

interface DownloadPercentageProps {
  downloads: Array<{
    id: string
    title: string
    type: "video" | "audio"
    quality?: string
    status: "pending" | "downloading" | "paused" | "completed" | "failed" | "cancelled"
    progress: number
    speed?: string
    eta?: string
    downloadedSize?: string
    totalSize?: string
    startTime?: number
    remainingBytes?: number
    averageSpeed?: string
  }>
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
}

export function DownloadPercentage({ downloads, onPause, onResume, onCancel, onRetry }: DownloadPercentageProps) {
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({})

  // Update elapsed time for active downloads
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTimes(prev => {
        const updated = { ...prev }
        downloads.forEach(download => {
          if (download.status === 'downloading' && download.startTime) {
            updated[download.id] = Date.now() - download.startTime
          }
        })
        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [downloads])

  if (downloads.length === 0) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />
      case "downloading":
        return <Download className="w-5 h-5 text-blue-500 animate-pulse" />
      case "paused":
        return <Pause className="w-5 h-5 text-orange-500" />
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case "cancelled":
        return <X className="w-5 h-5 text-gray-500" />
      default:
        return <Download className="w-5 h-5" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "في الانتظار"
      case "downloading":
        return "جاري التحميل"
      case "paused":
        return "متوقف مؤقتاً"
      case "completed":
        return "مكتمل"
      case "failed":
        return "فشل"
      case "cancelled":
        return "ملغي"
      default:
        return status
    }
  }

  const getProgressColor = (progress: number, status: string) => {
    if (status === 'failed') return 'bg-red-500'
    if (status === 'paused') return 'bg-orange-500'
    if (status === 'cancelled') return 'bg-gray-500'
    if (progress < 25) return 'bg-blue-400'
    if (progress < 50) return 'bg-blue-500'
    if (progress < 75) return 'bg-blue-600'
    return 'bg-green-500'
  }

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
  }

  const calculateRemainingTime = (progress: number, elapsedTime: number) => {
    if (progress <= 0) return 'غير محدد'
    const totalEstimatedTime = (elapsedTime / progress) * 100
    const remainingTime = totalEstimatedTime - elapsedTime
    return formatTime(remainingTime)
  }

  return (
    <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardTitle className="flex items-center justify-between text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <Download className="w-6 h-6" />
            حالة التحميلات ({downloads.length})
          </div>
          <div className="text-sm font-normal">
            {downloads.filter(d => d.status === 'downloading').length} نشط
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {downloads.map((download) => (
          <div key={download.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            {/* Title and Status Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getStatusIcon(download.status)}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg truncate mb-1" title={download.title}>
                    {download.title}
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {download.type === "video" ? `فيديو ${download.quality}` : "صوت MP3"}
                    </Badge>
                    <Badge 
                      variant={download.status === "completed" ? "default" : download.status === "failed" ? "destructive" : "outline"} 
                      className="text-xs"
                    >
                      {getStatusText(download.status)}
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
                {download.status === "failed" && onRetry && (
                  <Button size="sm" variant="outline" onClick={() => onRetry(download.id)}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
                {(download.status === "downloading" || download.status === "paused" || download.status === "pending") && onCancel && (
                  <Button size="sm" variant="destructive" onClick={() => onCancel(download.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Enhanced Progress Display for Active Downloads */}
            {(download.status === "downloading" || download.status === "paused") && (
              <div className="space-y-4">
                {/* Progress Circle and Percentage */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>
                    <div 
                      className={`absolute inset-0 w-32 h-32 rounded-full border-8 border-t-transparent transition-all duration-500 ${getProgressColor(download.progress, download.status)}`}
                      style={{
                        transform: `rotate(${(download.progress / 100) * 360 - 90}deg)`,
                        borderTopColor: 'transparent'
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">
                          {Math.round(download.progress)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {download.status === "paused" ? "متوقف" : "جاري التحميل"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linear Progress Bar */}
                <div className="space-y-2">
                  <Progress 
                    value={download.progress} 
                    className="h-3 bg-gray-200 dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span className="font-medium">{Math.round(download.progress)}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Detailed Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {/* Download Speed */}
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="font-bold text-green-600 text-lg">
                      {download.speed || download.averageSpeed || "0 KB/s"}
                    </div>
                    <div className="text-xs text-muted-foreground">السرعة</div>
                  </div>
                  
                  {/* Time Remaining */}
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="font-bold text-orange-600 text-lg">
                      {download.eta || (elapsedTimes[download.id] ? calculateRemainingTime(download.progress, elapsedTimes[download.id]) : "غير محدد")}
                    </div>
                    <div className="text-xs text-muted-foreground">الوقت المتبقي</div>
                  </div>
                  
                  {/* Downloaded Size */}
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="font-bold text-blue-600 text-lg">
                      {download.downloadedSize || "غير محدد"}
                    </div>
                    <div className="text-xs text-muted-foreground">تم تحميله</div>
                  </div>
                  
                  {/* Total Size */}
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="font-bold text-purple-600 text-lg">
                      {download.totalSize || "غير محدد"}
                    </div>
                    <div className="text-xs text-muted-foreground">الحجم الكلي</div>
                  </div>
                </div>

                {/* Elapsed Time */}
                {elapsedTimes[download.id] && (
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      الوقت المنقضي: <span className="font-medium">{formatTime(elapsedTimes[download.id])}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Completed Status */}
            {download.status === "completed" && (
              <div className="text-center py-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-green-600 mb-2">
                  100% مكتمل
                </div>
                <div className="text-green-700 dark:text-green-300 font-medium">
                  تم التحميل بنجاح!
                </div>
                {download.totalSize && (
                  <div className="text-sm text-muted-foreground mt-2">
                    حجم الملف: {download.totalSize}
                  </div>
                )}
              </div>
            )}

            {/* Failed Status */}
            {download.status === "failed" && (
              <div className="text-center py-6 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-red-600 mb-2">
                  فشل التحميل
                </div>
                <div className="text-red-700 dark:text-red-300 font-medium mb-3">
                  حدث خطأ أثناء التحميل
                </div>
                {onRetry && (
                  <Button onClick={() => onRetry(download.id)} variant="outline" className="text-red-600 border-red-300">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    إعادة المحاولة
                  </Button>
                )}
              </div>
            )}

            {/* Cancelled Status */}
            {download.status === "cancelled" && (
              <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <X className="w-16 h-16 text-gray-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-600 mb-2">
                  تم الإلغاء
                </div>
                <div className="text-gray-700 dark:text-gray-300 font-medium">
                  تم إلغاء التحميل
                </div>
              </div>
            )}

            {/* Pending Status */}
            {download.status === "pending" && (
              <div className="text-center py-6 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-3 animate-pulse" />
                <div className="text-2xl font-bold text-yellow-600 mb-2">
                  في الانتظار
                </div>
                <div className="text-yellow-700 dark:text-yellow-300 font-medium">
                  في انتظار بدء التحميل...
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
