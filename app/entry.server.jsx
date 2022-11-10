const { PassThrough } = require("stream");

const { Response } = require("@remix-run/node");

const { RemixServer } = require("@remix-run/react");

const isbot = require("isbot");

const { renderToPipeableStream, renderToString } = require("react-dom/server");

import { ServerStyleContext } from "./context";
import createEmotionCache from "./createEmotionCache";
import { CacheProvider } from "@emotion/react";
import createEmotionServer from "@emotion/server/create-instance";

const ABORT_DELAY = 5000;

export default function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext
) {
  const cache = createEmotionCache();
  const { extractCriticalToChunks } = createEmotionServer(cache);

  const html = renderToString(
    <ServerStyleContext.Provider value={null}>
      <CacheProvider value={cache}>
        <RemixServer context={remixContext} url={request.url} />
      </CacheProvider>
    </ServerStyleContext.Provider>
  );

  const chunks = extractCriticalToChunks(html);

  const markup = (
    <ServerStyleContext.Provider value={chunks.styles}>
      <CacheProvider value={cache}>
        <RemixServer context={remixContext} url={request.url} />
      </CacheProvider>
    </ServerStyleContext.Provider>
  );

  return isbot(request.headers.get("user-agent"))
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
        markup
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
        markup
      );
}

function handleBotRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
  markup
) {
  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      markup,
      {
        onAllReady() {
          const body = new PassThrough();

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          didError = true;

          console.error(error);
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
  markup
) {
  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      markup,
      {
        onShellReady() {
          const body = new PassThrough();

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(err) {
          reject(err);
        },
        onError(error) {
          didError = true;

          console.error(error);
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
