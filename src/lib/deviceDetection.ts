export interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isTablet: boolean;
  browser: string;
  os: string;
}

export function detectDevice(): DeviceInfo {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';

  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /android/i.test(userAgent);
  const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent);

  const isMobile = (isIOS || isAndroid) && !isTablet;

  let browser = 'unknown';
  if (/chrome|chromium|crios/i.test(userAgent)) {
    browser = 'chrome';
  } else if (/firefox|fxios/i.test(userAgent)) {
    browser = 'firefox';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browser = 'safari';
  } else if (/edg/i.test(userAgent)) {
    browser = 'edge';
  } else if (/samsung/i.test(userAgent)) {
    browser = 'samsung';
  }

  let os = 'unknown';
  if (isIOS) {
    os = 'ios';
  } else if (isAndroid) {
    os = 'android';
  } else if (/windows/i.test(userAgent)) {
    os = 'windows';
  } else if (/mac/i.test(userAgent)) {
    os = 'macos';
  } else if (/linux/i.test(userAgent)) {
    os = 'linux';
  }

  return {
    isMobile,
    isIOS,
    isAndroid,
    isTablet,
    browser,
    os,
  };
}

export function shouldForceBrowserOpen(): boolean {
  const device = detectDevice();
  return device.isMobile;
}

export function buildMobileFriendlyUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    const device = detectDevice();

    if (device.isIOS) {
      urlObj.searchParams.set('browser', 'safari');
    } else if (device.isAndroid) {
      urlObj.searchParams.set('browser', 'android');
    }

    return urlObj.toString();
  } catch {
    return url;
  }
}

export async function openInBrowser(url: string): Promise<void> {
  const device = detectDevice();

  if (device.isMobile) {
    try {
      const { Browser } = await import('@capacitor/browser');
      const { Capacitor } = await import('@capacitor/core');

      if (Capacitor.isNativePlatform()) {
        console.log('🌐 Opening in Capacitor Browser (NOT Amazon app) to preserve affiliate tracking');
        await Browser.open({
          url,
          presentationStyle: 'popover',
          toolbarColor: '#FF6B35'
        });
        return;
      }
    } catch (error) {
      console.log('⚠️ Capacitor Browser not available, using fallback');
    }

    console.log('🌐 Opening in mobile browser window');
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    console.log('🌐 Opening in desktop browser');
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
