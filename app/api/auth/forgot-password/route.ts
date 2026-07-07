import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/password-reset";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    await sendPasswordResetEmail(email);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not send reset email";
    if (message === "Supabase is not configured") {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({
    message: "If an account exists for that email, a password reset link has been sent.",
  });
}
