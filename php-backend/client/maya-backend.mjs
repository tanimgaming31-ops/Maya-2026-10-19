/**
 * Opt-in frontend adapter ONLY. Intentionally not injected in existing
 * index.html: all legacy Maya UI, calls, Gemini keys and Memory Packs untouched.
 * NEVER send the user's Gemini API key here. Pass a separate backend token.
 */
export function createMayaBackend({ baseUrl, token }) {
  if (typeof baseUrl !== "string" || typeof token !== "string" || token.length < 32) {
    throw new Error("Backend URL and independent token are required");
  }
  const endpoint = new URL(baseUrl.replace(/\/$/, "") + "/");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if (endpoint.protocol !== "https:" && !(local && endpoint.protocol === "http:")) {
    throw new Error("HTTPS is required for a remote Maya backend");
  }
  async function request(path, body) {
    if (!/^\/v1\/[A-Za-z0-9/_?=%&+.-]+$/.test(path)) throw new Error("Invalid API path");
    const reply = await fetch(new URL(path.slice(1), endpoint), {
      method: body === undefined ? "GET" : "POST",
      credentials: "omit",
      cache: "no-store",
      headers: {
        Authorization: "Bearer " + token,
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    let data;
    try { data = await reply.json(); } catch { throw new Error("Non-JSON backend response"); }
    if (!reply.ok || !data.ok) throw new Error("Maya backend: " + (data.error || reply.status));
    return data;
  }
  return Object.freeze({
    diagnostics: () => request("/v1/diagnostics"),
    searchMemory: q => request("/v1/memories/search?q=" + encodeURIComponent(q)),
    saveMemoryWithConsent: text => request("/v1/memories", { text }),
    saveBackupWithConsent: payload => request("/v1/backups", { consent: true, payload }),
    downloadLatestBackup: () => request("/v1/backups/latest"),
    planReadOnlyTask: (goal, steps) => request("/v1/tasks", { goal, steps }),
    taskHistory: () => request("/v1/tasks"),
    queueRoutine: (message, due_at) => request("/v1/routines", { message, due_at }),
    queuedRoutineEvents: () => request("/v1/events"),
    storeExtractedDocumentWithConsent: (title, text) => request("/v1/documents", { title, text, consent: true }),
    findInDocuments: q => request("/v1/documents/search?q=" + encodeURIComponent(q)),
    storeMessageDraftWithConsent: (incoming, draft) => request("/v1/messages/drafts", { incoming, draft, consent: true }),
    suggestNativeAction: (type, detail) => request("/v1/native/suggestions", { type, detail }),
    reportFailure: (source, code, retryable) => request("/v1/failures", { source, code, retryable })
  });
}
