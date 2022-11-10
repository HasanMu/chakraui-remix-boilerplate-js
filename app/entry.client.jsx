const { RemixBrowser } = require("@remix-run/react");

const { startTransition, StrictMode, useState } = require("react");

const { hydrateRoot } = require("react-dom/client");

import { CacheProvider } from '@emotion/react';
import { ClientStyleContext } from './context';
import createEmotionCache from './createEmotionCache';

function ClientCacheProvider({ children }) {
  const [cache, setCache] = useState(createEmotionCache())

  function reset() {
    setCache(createEmotionCache())
  }

  return (
    <ClientStyleContext.Provider value={{ reset }}>
      <CacheProvider value={cache}>{children}</CacheProvider>
    </ClientStyleContext.Provider>
  )
}

function hydrate() {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <ClientCacheProvider>
          <RemixBrowser />
        </ClientCacheProvider>
      </StrictMode>
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  window.setTimeout(hydrate, 1);
}
