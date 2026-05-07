"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AnswerPanel } from "@/components/answer-panel";
import { EvidenceGallery } from "@/components/evidence-gallery";
import { getRun } from "@/lib/api-client";

export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const { data, isLoading, error } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId),
    enabled: Boolean(runId)
  });

  return (
    <main className="workspace-shell">
      <section className="workspace-header compact">
        <Link href="/" className="ghost-link">
          <ArrowLeft size={18} aria-hidden="true" />
          Zurueck
        </Link>
        <div className="header-meta">
          <span>{runId}</span>
        </div>
      </section>
      {error ? <div className="notice error">Run konnte nicht geladen werden.</div> : null}
      <section className="result-panel single">
        <AnswerPanel run={data ?? null} history={data ? [data] : []} isRunning={isLoading} />
        <EvidenceGallery evidence={data?.evidence ?? []} isRunning={isLoading} />
      </section>
    </main>
  );
}
