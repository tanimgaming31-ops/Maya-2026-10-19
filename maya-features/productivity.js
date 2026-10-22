const PRODUCTIVITY_KEY = "maya_productivity_v1";

export function loadProductivity() {
  try {
    return JSON.parse(localStorage.getItem(PRODUCTIVITY_KEY)) || {
      reminders: [], alarms: [], timers: [], events: [], todos: []
    };
  } catch {
    return { reminders: [], alarms: [], timers: [], events: [], todos: [] };
  }
}

export function saveProductivity(data) {
  localStorage.setItem(PRODUCTIVITY_KEY, JSON.stringify(data));
}

export function createReminder({ title, datetime }) {
  if (!title || !datetime) throw new Error("Title and datetime required");
  const data = loadProductivity();
  const item = { id: crypto.randomUUID(), title, datetime, done: false, createdAt: new Date().toISOString() };
  data.reminders.push(item);
  saveProductivity(data);
  scheduleNotification(item);
  return item;
}

export function createAlarm({ title, hour, minute, repeat = "once" }) {
  if (hour == null || minute == null) throw new Error("Hour and minute required");
  const data = loadProductivity();
  const item = { id: crypto.randomUUID(), title: title || "Maya alarm", hour, minute, repeat, enabled: true, createdAt: new Date().toISOString() };
  data.alarms.push(item);
  saveProductivity(data);
  return item;
}

export function createTimer({ title, seconds }) {
  if (!seconds || seconds <= 0) throw new Error("Valid seconds required");
  const data = loadProductivity();
  const item = { id: crypto.randomUUID(), title: title || "Maya timer", seconds, startedAt: Date.now(), endsAt: Date.now() + seconds * 1000, done: false };
  data.timers.push(item);
  saveProductivity(data);
  setTimeout(() => {
    notifyUser(`${item.title} finished`);
    completeTimer(item.id);
  }, seconds * 1000);
  return item;
}

export function completeTimer(id) {
  const data = loadProductivity();
  const timer = data.timers.find(x => x.id === id);
  if (timer) timer.done = true;
  saveProductivity(data);
}

export function createCalendarEvent({ title, datetime, notes = "" }) {
  if (!title || !datetime) throw new Error("Title and datetime required");
  const data = loadProductivity();
  const item = { id: crypto.randomUUID(), title, datetime, notes, createdAt: new Date().toISOString() };
  data.events.push(item);
  saveProductivity(data);
  return item;
}

export function createTodo({ title, dueDate = null, priority = "normal" }) {
  if (!title || !title.trim()) throw new Error("Todo title required");
  const data = loadProductivity();
  const item = { id: crypto.randomUUID(), title: title.trim(), dueDate, priority, done: false, createdAt: new Date().toISOString() };
  data.todos.push(item);
  saveProductivity(data);
  return item;
}

export function completeTodo(id) {
  const data = loadProductivity();
  const todo = data.todos.find(x => x.id === id);
  if (!todo) return false;
  todo.done = true;
  saveProductivity(data);
  return true;
}

export function deleteTodo(id) {
  const data = loadProductivity();
  const before = data.todos.length;
  data.todos = data.todos.filter(x => x.id !== id);
  if (data.todos.length === before) return false;
  saveProductivity(data);
  return true;
}

export function listTodos() {
  return loadProductivity().todos;
}

export function listToday() {
  const today = new Date().toDateString();
  const data = loadProductivity();
  return {
    reminders: data.reminders.filter(x => new Date(x.datetime).toDateString() === today && !x.done),
    events: data.events.filter(x => new Date(x.datetime).toDateString() === today),
    todos: data.todos.filter(x => !x.done)
  };
}

function notifyUser(message) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Maya", { body: message });
  }
}

async function scheduleNotification(item) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") await Notification.requestPermission();
  const delay = new Date(item.datetime).getTime() - Date.now();
  if (delay > 0) setTimeout(() => notifyUser(item.title), delay);
}
