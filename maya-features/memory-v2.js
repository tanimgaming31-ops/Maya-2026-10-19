const MEMORY_KEY = "maya_memory_v2";
const MEMORY_VERSION = 2;

export function loadMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return { version: MEMORY_VERSION, items: [] };
    const data = JSON.parse(raw);
    if (data.version !== MEMORY_VERSION || !Array.isArray(data.items)) {
      return { version: MEMORY_VERSION, items: [] };
    }
    return data;
  } catch {
    return { version: MEMORY_VERSION, items: [] };
  }
}

export function saveMemory(memory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export function addMemory(text, category = "other", confidence = "high") {
  if (!text || !text.trim()) return null;
  const memory = loadMemory();
  const item = {
    id: crypto.randomUUID(),
    text: text.trim(),
    category,
    confidence,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  memory.items.push(item);
  saveMemory(memory);
  return item;
}

export function updateMemory(id, newText, category) {
  const memory = loadMemory();
  const item = memory.items.find(x => x.id === id);
  if (!item) return false;
  if (newText) item.text = newText.trim();
  if (category) item.category = category;
  item.updatedAt = new Date().toISOString();
  saveMemory(memory);
  return true;
}

export function deleteMemory(id) {
  const memory = loadMemory();
  const before = memory.items.length;
  memory.items = memory.items.filter(x => x.id !== id);
  if (memory.items.length === before) return false;
  saveMemory(memory);
  return true;
}

export function searchMemory(query) {
  const q = query ? query.toLowerCase().trim() : "";
  if (!q) return [];
  return loadMemory().items.filter(item =>
    item.text.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
  );
}

export function exportMemory() {
  const blob = new Blob([JSON.stringify(loadMemory(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `maya-memory-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importMemory(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported.items)) throw new Error("Invalid Maya memory file");
        saveMemory({ version: MEMORY_VERSION, items: imported.items });
        resolve(imported.items.length);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
