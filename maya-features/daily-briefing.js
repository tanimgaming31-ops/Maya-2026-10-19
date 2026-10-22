import { listToday } from "./productivity.js";
import { loadMemory } from "./memory-v2.js";

export function buildDailyBriefing() {
  const now = new Date();
  const today = listToday();
  const memory = loadMemory();
  const importantMemories = memory.items
    .filter(item => ["routine", "plan", "goal", "study", "health", "finance"].includes(item.category))
    .slice(0, 5);
  const lines = [];
  lines.push(`Today is ${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`);
  if (today.reminders.length) lines.push(`You have ${today.reminders.length} reminder(s) today.`);
  if (today.events.length) lines.push(`You have ${today.events.length} calendar event(s) today.`);
  if (today.todos.length) lines.push(`You have ${today.todos.length} unfinished to-do item(s).`);
  if (importantMemories.length) {
    lines.push("Important things Maya remembers:");
    importantMemories.forEach(item => lines.push(`- ${item.text}`));
  }
  if (lines.length === 1) lines.push("You have no reminders, events, or to-do items for today.");
  return lines.join("\n");
}

export function showDailyBriefing() {
  const text = buildDailyBriefing();
  alert(text);
  return text;
}
