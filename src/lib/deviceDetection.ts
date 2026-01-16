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

export function openInBrowser(url: string): void {
  const device = detectDevice();

  if (device.isMobile) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    link.style.display = 'none';
    document.body.appendChild(link);

    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
