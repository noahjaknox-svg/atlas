import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const comments = await prisma.proposalComment.findMany({
      where: { proposalId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return jsonOk(
      comments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        userId: c.userId,
        userName: c.user.name,
      }))
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireInternalUser();
    const { id } = await params;
    const body = await request.json();
    const text = body.body?.toString().trim();
    if (!text) return jsonError("Comment body required", 400);

    const comment = await prisma.proposalComment.create({
      data: { proposalId: id, userId: user.id, body: text },
      include: { user: { select: { id: true, name: true } } },
    });

    return jsonOk({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      userId: comment.userId,
      userName: comment.user.name,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
