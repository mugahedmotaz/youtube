"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileVideo,
  Music
} from "lucide-react"

interface SimpleProgressProps {
  downloads: Array<{
    id: string
    title: string
    type: "video" | "audio"
    quality?: string
    status: "pending" | "downloading" | "completed" | "failed"
    progress: number
    speed?: string
    eta?: string
  }>
}

export function SimpleProgress({ downloads }: SimpleProgressProps) {
  if (downloads.length === 0) {
    return null
  }

  const getStatusIcon = (status: string, type: "video" | "audio") => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "downloading":
        return <Download className="w-4 h-4 text-blue-500 animate-pulse" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return type === "video" ? <FileVideo className="w-4 h-4" /> : <Music className="w-4 h-4" />
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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          التحميلات ({downloads.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {downloads.map((download) => (
          <div key={download.id} className="border rounded-lg p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getStatusIcon(download.status, download.type)}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate" title={download.title}>
                    {download.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {download.type === "video" ? download.quality : "MP3"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getStatusText(download.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar - Only show for downloading */}
            {download.status === "downloading" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-blue-600">
                    {download.progress.toFixed(1)}%
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {download.speed && (
                      <span>السرعة: {download.speed}</span>
                    )}
                    {download.eta && (
                      <span>الوقت المتبقي: {download.eta}</span>
                    )}
                  </div>
                </div>
                <Progress 
                  value={download.progress} 
                  className="h-3"
                />
              </div>
            )}

            {/* Completed Status */}
            {download.status === "completed" && (
              <div className="text-sm text-green-600 font-medium">
                ✅ تم التحميل بنجاح - {download.progress}%
              </div>
            )}

            {/* Failed Status */}
            {download.status === "failed" && (
              <div className="text-sm text-red-600 font-medium">
                ❌ فشل التحميل
              </div>
            )}

            {/* Pending Status */}
            {download.status === "pending" && (
              <div className="text-sm text-yellow-600 font-medium">
                ⏳ في الانتظار...
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
