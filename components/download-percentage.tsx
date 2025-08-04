"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Download, CheckCircle, AlertCircle, Clock } from "lucide-react"

interface DownloadPercentageProps {
  downloads: Array<{
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
  }>
}

export function DownloadPercentage({ downloads }: DownloadPercentageProps) {
  if (downloads.length === 0) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />
      case "downloading":
        return <Download className="w-5 h-5 text-blue-500 animate-bounce" />
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-500" />
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
      case "completed":
        return "مكتمل"
      case "failed":
        return "فشل"
      default:
        return status
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress < 25) return "bg-red-500"
    if (progress < 50) return "bg-orange-500"
    if (progress < 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800">
      <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Download className="w-6 h-6" />
          حالة التحميلات ({downloads.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {downloads.map((download) => (
          <div key={download.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
            {/* Title and Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getStatusIcon(download.status)}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base truncate" title={download.title}>
                    {download.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {download.type === "video" ? `فيديو ${download.quality}` : "صوت MP3"}
                    </Badge>
                    <Badge 
                      variant={download.status === "completed" ? "default" : "outline"} 
                      className="text-xs"
                    >
                      {getStatusText(download.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Display */}
            {download.status === "downloading" && (
              <div className="space-y-3">
                {/* Large Percentage Display */}
                <div className="text-center mb-4">
                  <div className="text-6xl font-bold text-primary mb-2">
                    {Math.round(download.progress)}%
                  </div>
                  <div className="text-lg text-muted-foreground mb-2">
                    يتم تحميل الفيديو...
                  </div>
                  {(download.downloadedSize && download.totalSize) && (
                    <div className="text-sm text-muted-foreground">
                      {download.downloadedSize} من {download.totalSize}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <Progress 
                    value={download.progress} 
                    className="h-4 bg-gray-200 dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Speed, ETA, and Size Info */}
                {(download.speed || download.eta || download.downloadedSize || download.totalSize) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {download.speed && (
                      <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <div className="font-medium text-green-600">{download.speed}</div>
                        <div className="text-xs text-muted-foreground">السرعة</div>
                      </div>
                    )}
                    {download.eta && (
                      <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                        <div className="font-medium text-orange-600">{download.eta}</div>
                        <div className="text-xs text-muted-foreground">الوقت المتبقي</div>
                      </div>
                    )}
                    {download.downloadedSize && (
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                        <div className="font-medium text-blue-600">{download.downloadedSize}</div>
                        <div className="text-xs text-muted-foreground">تم تحميله</div>
                      </div>
                    )}
                    {download.totalSize && (
                      <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded">
                        <div className="font-medium text-purple-600">{download.totalSize}</div>
                        <div className="text-xs text-muted-foreground">الحجم الكلي</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Completed Status */}
            {download.status === "completed" && (
              <div className="text-center py-4">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  ✅ 100%
                </div>
                <div className="text-green-700 dark:text-green-300 font-medium">
                  تم التحميل بنجاح!
                </div>
              </div>
            )}

            {/* Failed Status */}
            {download.status === "failed" && (
              <div className="text-center py-4">
                <div className="text-2xl font-bold text-red-600 mb-2">
                  ❌ فشل
                </div>
                <div className="text-red-700 dark:text-red-300 font-medium">
                  فشل في التحميل
                </div>
              </div>
            )}

            {/* Pending Status */}
            {download.status === "pending" && (
              <div className="text-center py-4">
                <div className="text-2xl font-bold text-yellow-600 mb-2">
                  ⏳ 0%
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
