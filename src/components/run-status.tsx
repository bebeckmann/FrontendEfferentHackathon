"use client";

import { AlertTriangle, CheckCircle2, Clock3, RotateCcw } from "lucide-react";
import type { AgentRunResponse } from "@/lib/dto";

type RunStatusProps = {
  run: AgentRunResponse | null;
  isRunning: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

export function RunStatus({ run, isRunning, errorMessage, onRetry }: RunStatusProps) {
  return (
    <section className="surface status-panel" aria-live="polite">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Status</p>
          <h2>Run</h2>
        </div>
      </div>

      {errorMessage ? (
        <div className="notice error">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errorMessage}</span>
          <button type="button" className="secondary-button compact-button" onClick={onRetry} disabled={!run?.query}>
            <RotateCcw size={14} aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : isRunning ? (
        <div className="notice">
          <Clock3 size={18} aria-hidden="true" />
          <span>Answer will be available soon.</span>
        </div>
      ) : run ? (
        <div className="notice success">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{run.evidence.length} evidence images found.</span>
        </div>
      ) : (
        <div className="notice muted">
          <Clock3 size={18} aria-hidden="true" />
          <span>Ready for your question!</span>
        </div>
      )}
    </section>
  );
}
