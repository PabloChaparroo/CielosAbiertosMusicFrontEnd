type FullscreenElementWithWebkit = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocumentWithWebkit = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

/** Requests browser fullscreen; it must be called directly from a user action. */
export async function enterBrowserFullscreen(): Promise<boolean> {
  const element = document.documentElement as FullscreenElementWithWebkit;
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen({ navigationUI: "hide" });
      return true;
    }
    if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
      return true;
    }
  } catch {
    // Keep the in-app presentation mode available if the browser denies fullscreen.
  }
  return false;
}

export async function exitBrowserFullscreen(): Promise<void> {
  const fullscreenDocument = document as FullscreenDocumentWithWebkit;
  try {
    if (document.exitFullscreen && document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (
      fullscreenDocument.webkitExitFullscreen &&
      fullscreenDocument.webkitFullscreenElement
    ) {
      await fullscreenDocument.webkitExitFullscreen();
    }
  } catch {
    // The browser may already have exited fullscreen (for example, with Escape).
  }
}

export function isBrowserFullscreen(): boolean {
  const fullscreenDocument = document as FullscreenDocumentWithWebkit;
  return Boolean(document.fullscreenElement || fullscreenDocument.webkitFullscreenElement);
}
