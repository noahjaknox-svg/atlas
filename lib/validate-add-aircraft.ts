import { prisma } from "@/lib/db";
import { findFbosAtAirport } from "@/lib/fbo-airport-lookup";

const ICAO_RE = /^[A-Z0-9]{3,4}$/;

export type ValidatedAddAircraftInput = {
  aircraftModel: string;
  aircraftMasterId: string;
  proposedHomeBase: string;
  fboName: string;
  usageType: "part_91" | "part_91_135";
  manufacturer: string;
  model: string;
};

export type ValidateAddAircraftResult =
  | { ok: true; data: ValidatedAddAircraftInput }
  | { ok: false; error: string };

/** Validate add-aircraft payload against warehouse and airport data. */
export async function validateAddAircraftBody(
  body: Record<string, unknown>
): Promise<ValidateAddAircraftResult> {
  const aircraftMasterId = String(body.aircraftMasterId ?? "").trim();
  if (!aircraftMasterId) {
    return { ok: false, error: "Select an aircraft model from the warehouse." };
  }

  const warehouse = await prisma.aircraftType.findUnique({
    where: { id: aircraftMasterId },
    select: {
      id: true,
      status: true,
      displayName: true,
      manufacturer: true,
      model: true,
    },
  });
  if (!warehouse) {
    return {
      ok: false,
      error: "Selected aircraft model was not found in the warehouse.",
    };
  }
  if (warehouse.status !== "published") {
    return {
      ok: false,
      error: "Selected aircraft model is not published in the warehouse.",
    };
  }

  const proposedHomeBase = String(
    body.proposedHomeBase ?? body.proposedHomeBaseIcao ?? ""
  )
    .trim()
    .toUpperCase();
  if (!proposedHomeBase) {
    return { ok: false, error: "Enter a home base airport code." };
  }
  if (!ICAO_RE.test(proposedHomeBase)) {
    return {
      ok: false,
      error: "Home base must be a valid 3–4 character airport code (e.g. SDL or KSDL).",
    };
  }

  const fboName = String(body.fboName ?? "").trim();
  if (!fboName) {
    return { ok: false, error: "Select an FBO at the home base." };
  }

  const fbos = await findFbosAtAirport(proposedHomeBase);
  if (fbos.length === 0) {
    return {
      ok: false,
      error: `No FBO pricing found for ${proposedHomeBase}. Add the airport in Data Hub first.`,
    };
  }
  const fboMatch = fbos.find((f) => f.fboName.toLowerCase() === fboName.toLowerCase());
  if (!fboMatch) {
    const names = fbos.map((f) => f.fboName).join(", ");
    return {
      ok: false,
      error: `FBO "${fboName}" was not found at ${proposedHomeBase}. Available: ${names}.`,
    };
  }

  const usageType: "part_91" | "part_91_135" =
    body.usageType === "part_91_135" ? "part_91_135" : "part_91";

  const aircraftModel =
    String(body.aircraftModel ?? "").trim() ||
    warehouse.displayName?.trim() ||
    `${warehouse.manufacturer} ${warehouse.model}`.trim();

  return {
    ok: true,
    data: {
      aircraftModel,
      aircraftMasterId: warehouse.id,
      proposedHomeBase,
      fboName: fboMatch.fboName,
      usageType,
      manufacturer: warehouse.manufacturer ?? "",
      model: warehouse.model ?? "",
    },
  };
}
