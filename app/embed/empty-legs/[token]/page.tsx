import type { Metadata } from "next";
import { EmptyLegsEmbedClient } from "@/components/public/empty-legs-embed-client";

export const metadata: Metadata = {
  title: "Empty Legs",
  robots: { index: false, follow: false },
};

export default async function EmptyLegsEmbedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <EmptyLegsEmbedClient token={token} />
    </div>
  );
}
