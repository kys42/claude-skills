import { useEffect, useState } from 'react';

import { WEB_FONTS_CSS } from './theme';

/** Subsetted Google Fonts on the web; text shows in the fallback serif until they arrive. */
export function useAppFonts(): boolean {
  const [ready] = useState(true);
  useEffect(() => {
    if (document.querySelector(`link[href="${WEB_FONTS_CSS}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = WEB_FONTS_CSS;
    document.head.appendChild(link);
  }, []);
  return ready;
}
