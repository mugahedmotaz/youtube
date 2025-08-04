"use client"

import { useState, useEffect } from "react"
import { DownloadPercentage } from "./download-percentage"
import { Button } from "@/components/ui/button"

export function TestProgress() {
  const [downloads, setDownloads] = useState<any[]>([])

  const startTestDownload = () => {
    const testDownload = {
      id: `test-${Date.now()}`,
      title: "فيديو تجريبي للاختبار",
      type: "video" as const,
      quality: "720p",
      status: "downloading" as const,
      progress: 0,
      speed: "1.2 MB/s",
      eta: "02:30"
    }

    setDownloads(prev => [...prev, testDownload])

    // Simulate progress updates
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 10
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setDownloads(prev => prev.map(d => 
          d.id === testDownload.id 
            ? { ...d, status: "completed", progress: 100 }
            : d
        ))
      } else {
        setDownloads(prev => prev.map(d => 
          d.id === testDownload.id 
            ? { 
                ...d, 
                progress, 
                speed: `${(Math.random() * 3 + 0.5).toFixed(1)} MB/s`,
                eta: `${Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
              }
            : d
        ))
      }
    }, 1000)
  }

  return (
    <div className="p-4">
      <Button onClick={startTestDownload} className="mb-4">
        اختبار عرض النسبة المئوية
      </Button>
      <DownloadPercentage downloads={downloads} />
    </div>
  )
}
