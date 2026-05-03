import { NextResponse } from "next/server";
import { signup, login, getSession, logout, getUserData, saveUserData } from "@/lib/auth";
import { cookies } from "next/headers";

const COOKIE_NAME = "am_session";

function setSessionCookie(token: string) {
  return {
    "Set-Cookie": `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`,
  };
}

function clearSessionCookie() {
  return {
    "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  };
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "signup") {
    const { email, password, name } = body;
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Alle Felder sind Pflichtfelder" }, { status: 400 });
    }
    const result = await signup(email, password, name);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ user: result.user }, {
      headers: setSessionCookie(result.token),
    });
  }

  if (action === "login") {
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: "E-Mail und Passwort sind erforderlich" }, { status: 400 });
    }
    const result = await login(email, password);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ user: result.user }, {
      headers: setSessionCookie(result.token),
    });
  }

  if (action === "logout") {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) await logout(token);
    return NextResponse.json({ ok: true }, { headers: clearSessionCookie() });
  }

  if (action === "me") {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ user: null });
    const user = await getSession(token);
    return NextResponse.json({ user });
  }

  if (action === "save_data") {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    const user = await getSession(token);
    if (!user) return NextResponse.json({ error: "Sitzung abgelaufen" }, { status: 401 });
    const ok = await saveUserData(user.id, body.data ?? {});
    return NextResponse.json({ ok });
  }

  if (action === "load_data") {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    const user = await getSession(token);
    if (!user) return NextResponse.json({ error: "Sitzung abgelaufen" }, { status: 401 });
    const data = await getUserData(user.id);
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
}
