// Extraction monitoring and analytics service

interface ExtractionAttempt {
  url: string;
  platform: string;
  method: string;
  success: boolean;
  error?: string;
  timestamp: number;
  duration: number;
}

class ExtractionMonitor {
  private attempts: ExtractionAttempt[] = [];
  private readonly MAX_HISTORY = 100;

  logAttempt(attempt: Omit<ExtractionAttempt, 'timestamp'>) {
    const record: ExtractionAttempt = {
      ...attempt,
      timestamp: Date.now(),
    };

    this.attempts.push(record);

    // Keep only last MAX_HISTORY attempts
    if (this.attempts.length > this.MAX_HISTORY) {
      this.attempts = this.attempts.slice(-this.MAX_HISTORY);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      const emoji = attempt.success ? '✅' : '❌';
      console.log(
        `[Extraction Monitor] ${emoji} ${attempt.platform} via ${attempt.method} (${attempt.duration}ms)`,
        attempt.error ? `Error: ${attempt.error}` : ''
      );
    }
  }

  getStats() {
    const now = Date.now();
    const last24h = this.attempts.filter(a => now - a.timestamp < 24 * 60 * 60 * 1000);
    const lastHour = this.attempts.filter(a => now - a.timestamp < 60 * 60 * 1000);

    const successRate24h = last24h.length > 0
      ? (last24h.filter(a => a.success).length / last24h.length) * 100
      : 0;

    const successRateHour = lastHour.length > 0
      ? (lastHour.filter(a => a.success).length / lastHour.length) * 100
      : 0;

    const byPlatform = last24h.reduce((acc, attempt) => {
      if (!acc[attempt.platform]) {
        acc[attempt.platform] = { total: 0, success: 0 };
      }
      acc[attempt.platform].total++;
      if (attempt.success) acc[attempt.platform].success++;
      return acc;
    }, {} as Record<string, { total: number; success: number }>);

    const byMethod = last24h.reduce((acc, attempt) => {
      if (!acc[attempt.method]) {
        acc[attempt.method] = { total: 0, success: 0 };
      }
      acc[attempt.method].total++;
      if (attempt.success) acc[attempt.method].success++;
      return acc;
    }, {} as Record<string, { total: number; success: number }>);

    const commonErrors = last24h
      .filter(a => !a.success && a.error)
      .reduce((acc, attempt) => {
        const error = attempt.error || 'Unknown';
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      total24h: last24h.length,
      totalHour: lastHour.length,
      successRate24h: Math.round(successRate24h),
      successRateHour: Math.round(successRateHour),
      byPlatform,
      byMethod,
      commonErrors,
      recentAttempts: this.attempts.slice(-10),
    };
  }

  getRecommendation(platform: string): string {
    const stats = this.getStats();
    const platformStats = stats.byPlatform[platform];

    if (!platformStats || platformStats.total < 3) {
      return 'Not enough data to provide recommendations';
    }

    const successRate = (platformStats.success / platformStats.total) * 100;

    if (successRate > 80) {
      return '✅ Extraction working well for this platform';
    } else if (successRate > 50) {
      return '⚠️ Moderate success rate. Consider using manual description paste if extraction fails.';
    } else {
      return '❌ Low success rate. We recommend using the manual description paste method for this platform.';
    }
  }

  clear() {
    this.attempts = [];
  }
}

export const extractionMonitor = new ExtractionMonitor();

// Helper to track extraction performance
export async function trackExtraction<T>(
  url: string,
  platform: string,
  method: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    extractionMonitor.logAttempt({
      url,
      platform,
      method,
      success: true,
      duration,
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    extractionMonitor.logAttempt({
      url,
      platform,
      method,
      success: false,
      error: error.message || 'Unknown error',
      duration,
    });

    throw error;
  }
}
