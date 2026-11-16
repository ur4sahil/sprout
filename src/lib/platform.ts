// What kind of device and window the app is running in.

interface NavigatorLike {
  userAgent: string;
  maxTouchPoints?: number;
  standalone?: boolean;
}

// An iPad or iPhone. A modern iPad calls itself a Mac, so a Mac with a touch screen counts.
export function isIosDevice(nav: NavigatorLike): boolean {
  if (/iPad|iPhone|iPod/.test(nav.userAgent)) return true;
  return /Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1;
}

// Opened from its Home Screen icon, not in a browser tab.
export function isInstalled(nav: NavigatorLike, matches: (query: string) => boolean): boolean {
  return nav.standalone === true || matches('(display-mode: standalone)');
}

// In a Safari tab on an iPad or iPhone, the app shows only the install guide:
// anything made in the tab would be left behind when the app is installed.
export function needsInstallGuide(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const matches = (query: string): boolean => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  return isIosDevice(navigator as NavigatorLike) && !isInstalled(navigator as NavigatorLike, matches);
}
