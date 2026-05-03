import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";

// ── Types ────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  watchlists?: { name: string; items: string[] }[];
  portfolioData?: string; // JSON string
}

interface DB {
  users: User[];
  sessions: { token: string; userId: string; expiresAt: string }[];
}

// ── File path ────────────────────────────────────────────────────
const DB_PATH = path.join(process.cwd(), "data", "users.json");

// ── Read / Write DB ──────────────────────────────────────────────
async function readDB(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    const empty: DB = { users: [], sessions: [] };
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function writeDB(db: DB): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

// ── Password hashing ────────────────────────────────────────────
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuf, testBuf);
}

// ── Token generation ─────────────────────────────────────────────
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// ── Public API ───────────────────────────────────────────────────
export async function signup(email: string, password: string, name: string): Promise<{ token: string; user: { id: string; email: string; name: string } } | { error: string }> {
  const db = await readDB();

  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { error: "E-Mail bereits registriert" };
  }

  if (password.length < 6) {
    return { error: "Passwort muss mindestens 6 Zeichen lang sein" };
  }

  const user: User = {
    id: randomBytes(8).toString("hex"),
    email: email.toLowerCase(),
    name,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    watchlists: [{ name: "Main", items: [] }],
  };

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  db.users.push(user);
  db.sessions.push({ token, userId: user.id, expiresAt });
  await writeDB(db);

  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export async function login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string; name: string } } | { error: string }> {
  const db = await readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Falsche E-Mail oder Passwort" };
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.sessions.push({ token, userId: user.id, expiresAt });
  await writeDB(db);

  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export async function getSession(token: string): Promise<{ id: string; email: string; name: string } | null> {
  const db = await readDB();
  const session = db.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
  if (!session) return null;

  const user = db.users.find(u => u.id === session.userId);
  if (!user) return null;

  return { id: user.id, email: user.email, name: user.name };
}

export async function logout(token: string): Promise<void> {
  const db = await readDB();
  db.sessions = db.sessions.filter(s => s.token !== token);
  await writeDB(db);
}

export async function getUserData(userId: string): Promise<{ watchlists?: { name: string; items: string[] }[]; portfolioData?: string } | null> {
  const db = await readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return null;
  return { watchlists: user.watchlists, portfolioData: user.portfolioData };
}

export async function saveUserData(userId: string, data: { watchlists?: { name: string; items: string[] }[]; portfolioData?: string }): Promise<boolean> {
  const db = await readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return false;
  if (data.watchlists !== undefined) user.watchlists = data.watchlists;
  if (data.portfolioData !== undefined) user.portfolioData = data.portfolioData;
  await writeDB(db);
  return true;
}
