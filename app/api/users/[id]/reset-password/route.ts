import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/password-reset";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("NOT_FOUND");
    if (!user.active) {
      throw new Error("Cannot reset password for inactive users");
    }

    const { email } = await sendPasswordResetEmail(user.email);

    return jsonOk({
      message: `Password reset email sent to ${email}.`,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
