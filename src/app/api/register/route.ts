import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    if (isRateLimited(`register:${ip}`, 5, 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { name, email, newsletter } = await req.json();
    if (!email || !email.includes("@") || email.length > 320) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || name.length > 200) {
      return NextResponse.json({ error: "Valid name required" }, { status: 400 });
    }

    const sheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK;
    if (sheetWebhook) {
      try {
        const sheetRes = await fetch(sheetWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            newsletter: Boolean(newsletter),
            source: "carousel-in",
          }),
          redirect: "manual",
        });
        if (sheetRes.status === 302 || sheetRes.status === 301) {
          const redirectUrl = sheetRes.headers.get("location");
          if (redirectUrl) {
            await fetch(redirectUrl);
          }
        }
      } catch {
        // Logging failure should not block registration.
      }
    }

    if (newsletter) {
      try {
        await fetch("https://angelinayang.substack.com/api/v1/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            first_url: "https://carousel.twosetai.com",
            first_referrer: "carousel-in",
          }),
        });
      } catch {
        // Substack failure should not block registration.
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
