import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import { useApp } from '../context/AppContext';
import { installUrduText, setUrduState } from './urduText';

let loading: Promise<boolean> | null = null;

/** Loads the Nastaliq faces once. The package is imported lazily and only from here. */
function loadUrduFont(): Promise<boolean> {
  if (!loading) {
    loading = (async () => {
      try {
        // A lazy require inside this branch: Metro bundles the package but does not evaluate it until here.
        const pkg = require('@expo-google-fonts/noto-nastaliq-urdu');
        await Font.loadAsync({
          NotoNastaliqUrdu_400Regular: pkg.NotoNastaliqUrdu_400Regular,
          NotoNastaliqUrdu_500Medium: pkg.NotoNastaliqUrdu_500Medium,
          NotoNastaliqUrdu_700Bold: pkg.NotoNastaliqUrdu_700Bold,
        });
        return true;
      } catch {
        loading = null; // allow a retry on the next switch to ur
        return false;
      }
    })();
  }
  return loading;
}

/**
 * Mount once under AppProvider. For `ur` it loads Noto Nastaliq Urdu in the background (never blocks
 * the app: until it is ready the current family keeps rendering), then switches the app's text over.
 * For every other language it does nothing and the font package is never imported.
 */
export function useUrduFont(): { urduFontReady: boolean } {
  const { lang } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (lang !== 'ur') {
      setUrduState('', false);
      setReady(false);
      return;
    }
    let cancelled = false;
    loadUrduFont().then((ok) => {
      if (cancelled || !ok) return;
      installUrduText();
      setUrduState('ur', true);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return { urduFontReady: lang === 'ur' && ready };
}
