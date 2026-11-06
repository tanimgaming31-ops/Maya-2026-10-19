let playwrightUrl;
export function initialize(data) { playwrightUrl = data.playwrightUrl; }
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'playwright') return { url: playwrightUrl, shortCircuit: true };
  return nextResolve(specifier, context);
}
