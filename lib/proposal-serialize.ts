/** Serialize Prisma proposal graph for client components (Decimals → strings). */
export function serializeForClient<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (v !== null && typeof v === "object" && typeof v.toString === "function") {
        const s = v.toString();
        if (s && /^\d+(\.\d+)?$/.test(s) && typeof v.toFixed === "function") {
          return s;
        }
      }
      return v;
    })
  ) as T;
}
