import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseCharterEmail } from "@/lib/schedule/parse-email";
import { matchCharterRequest } from "@/lib/schedule/match-request";
import { persistMatchResults } from "@/lib/schedule/load-kanban";

function verifyPostmarkAuth(req: NextRequest): boolean {
  const secret = process.env.POSTMARK_INBOUND_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyPostmarkAuth(req)) {
      return jsonError("Unauthorized", 401);
    }

    const payload = await req.json();

    const fromAddress =
      payload.From ?? payload.from ?? payload.FromFull?.Email ?? "unknown";
    const toAddress = payload.To ?? payload.to ?? null;
    const subject = payload.Subject ?? payload.subject ?? "";
    const bodyText =
      payload.TextBody ?? payload.StrippedTextReply ?? payload.text ?? "";
    const bodyHtml = payload.HtmlBody ?? payload.html ?? null;
    const messageId = payload.MessageID ?? payload.messageId ?? null;

    const inbound = await prisma.inboundMessage.create({
      data: {
        provider: "postmark",
        messageId,
        fromAddress,
        toAddress,
        subject,
        bodyText,
        bodyHtml,
        rawPayload: payload,
      },
    });

    const parsed = parseCharterEmail(subject, bodyText);

    const charterRequest = await prisma.charterRequest.create({
      data: {
        inboundMessageId: inbound.id,
        status: parsed.requestedDepIcao && parsed.requestedArrIcao ? "parsed" : "new",
        requestedDepIcao: parsed.requestedDepIcao,
        requestedArrIcao: parsed.requestedArrIcao,
        requestedDepartAt: parsed.requestedDepartAt,
        paxCount: parsed.paxCount,
        clientName: parsed.clientName,
        notes: parsed.notes,
        parseConfidence: parsed.parseConfidence,
        parsedBy: "rules",
        rawExtraction: parsed.rawExtraction as Prisma.InputJsonValue,
      },
    });

    let matches: Awaited<ReturnType<typeof matchCharterRequest>> = [];
    if (
      parsed.requestedDepIcao &&
      parsed.requestedArrIcao &&
      parsed.requestedDepartAt
    ) {
      const [events, fleet] = await Promise.all([
        prisma.scheduleEvent.findMany({
          where: { deletedAt: null },
        }),
        prisma.aircraftTail.findMany({
          where: { status: "active" },
          select: { id: true, tailNumber: true, homeBase: true },
        }),
      ]);

      matches = matchCharterRequest(
        {
          requestedDepIcao: parsed.requestedDepIcao,
          requestedArrIcao: parsed.requestedArrIcao,
          requestedDepartAt: parsed.requestedDepartAt,
          paxCount: parsed.paxCount,
        },
        events,
        fleet
      );

      await persistMatchResults(prisma, charterRequest.id, matches);
    }

    return jsonOk({
      message: "Inbound email processed",
      inboundMessageId: inbound.id,
      charterRequestId: charterRequest.id,
      parsed,
      matchCount: matches.length,
      topMatch: matches[0] ?? null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
