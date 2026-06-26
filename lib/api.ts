import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  ) {
    return jsonError("A record with that value already exists", 409);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2022") {
      return jsonError(
        "Database schema is out of date. Apply pending migrations (npx prisma migrate deploy) and try again.",
        500
      );
    }
    if (error.code === "P2003") {
      return jsonError("Related record not found", 400);
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error(error);
    return jsonError(
      "Invalid aircraft data. Check crew and utilization fields, then try again.",
      400
    );
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }
    if (error.message === "FORBIDDEN") {
      return jsonError("Forbidden", 403);
    }
    if (error.message === "NOT_FOUND" || error.message === "NO_AIRCRAFT") {
      return jsonError("Not found", 404);
    }
    if (isUserFacingErrorMessage(error.message)) {
      return jsonError(error.message, 400);
    }
    console.error(error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
  return jsonError("Internal server error", 500);
}

function isUserFacingErrorMessage(message: string): boolean {
  if (message.length > 240) return false;
  if (/findUnique|undefined|prisma|TypeError/i.test(message)) return false;
  return true;
}
