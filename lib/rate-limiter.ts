// نظام تحديد معدل الطلبات للحماية من الإساءة
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []

    // إزالة الطلبات القديمة
    const validRequests = requests.filter((time) => now - time < this.windowMs)

    if (validRequests.length >= this.maxRequests) {
      return false
    }

    validRequests.push(now)
    this.requests.set(identifier, validRequests)

    return true
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    const validRequests = requests.filter((time) => now - time < this.windowMs)

    return Math.max(0, this.maxRequests - validRequests.length)
  }

  getTimeUntilReset(identifier: string): number {
    const requests = this.requests.get(identifier) || []
    if (requests.length === 0) return 0
    
    const oldestRequest = Math.min(...requests)
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest)
    return Math.max(0, Math.ceil(timeUntilReset / 1000)) // Return seconds
  }

  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now()
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter((time) => now - time < this.windowMs)
      if (validRequests.length === 0) {
        this.requests.delete(identifier)
      } else {
        this.requests.set(identifier, validRequests)
      }
    }
  }
}

export const rateLimiter = new RateLimiter(8, 60000) // 8 طلبات في الدقيقة - أكثر تحفظاً لتجنب حظر YouTube
