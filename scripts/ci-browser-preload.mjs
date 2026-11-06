// Select installed browser tooling without changing the smoke test or its assertions.
import { createRequire, register } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const packagePath = require.resolve('playwright/package.json', {
  paths: [process.env.MAYA_PLAYWRIGHT_TOOLS || process.cwd()],
});
const playwrightUrl = new URL('./index.mjs', pathToFileURL(packagePath)).href;
register('./ci-browser-resolve.mjs', import.meta.url, { data: { playwrightUrl } });
const { chromium } = await import(playwrightUrl);
const launch = chromium.launch.bind(chromium);
chromium.launch = options => {
  const defaults = {};
  if (process.env.MAYA_CHROMIUM_EXECUTABLE) defaults.executablePath = process.env.MAYA_CHROMIUM_EXECUTABLE;
  if (process.env.HTTPS_PROXY) defaults.proxy = {
    server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1',
  };
  return launch({ ...defaults, ...options });
};
