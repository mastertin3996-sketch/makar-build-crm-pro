import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "makar-build-crm-dev-secret-change-me"
);

const PUBLIC_PATHS = ["/login"];

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("mbc_access")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = await isAuthed(req);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Залогінений на сторінці входу → на головну
  if (authed && isPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Незалогінений на захищеній сторінці → на вхід
  if (!authed && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Не чіпаємо статику, API-роутів немає; інше — під захистом
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|bg-lion.png|.*\\.svg$).*)"],
};
