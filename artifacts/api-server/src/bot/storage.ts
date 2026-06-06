import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../data/usernames.json");

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]), "utf-8");
  }
}

export function loadUsernames(): string[] {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function saveUsernames(usernames: string[]): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(usernames, null, 2), "utf-8");
}

export function getStock(): number {
  return loadUsernames().length;
}

export function popUsername(): string | null {
  const list = loadUsernames();
  if (list.length === 0) return null;
  const username = list.shift()!;
  saveUsernames(list);
  return username;
}

export function addUsernames(newOnes: string[]): number {
  const list = loadUsernames();
  const cleaned = newOnes
    .map((u) => u.trim())
    .filter((u) => u.length > 0);
  const merged = [...list, ...cleaned];
  saveUsernames(merged);
  return cleaned.length;
}

export function deleteFirst(count: number): number {
  const list = loadUsernames();
  const removed = Math.min(count, list.length);
  saveUsernames(list.slice(removed));
  return removed;
}

export function viewList(limit = 20): string[] {
  return loadUsernames().slice(0, limit);
}
