"use client";

import { FormEvent, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { AudioRecorder } from "./audio-recorder";

type QueryComposerProps = {
  disabled: boolean;
  onSubmitText: (query: string) => void;
  onSubmitAudio: (audio: Blob) => void;
};

export function QueryComposer({ disabled, onSubmitText, onSubmitAudio }: QueryComposerProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim() || disabled) return;
    onSubmitText(query.trim());
    setQuery("");
  }

  return (
    <section className="composer surface" aria-labelledby="composer-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Query</p>
          <h2 id="composer-title">Frage stellen</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="composer-form">
        <label htmlFor="query-input" className="field-label">
          Text
        </label>
        <textarea
          id="query-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Welche Risiken werden im Vertrag genannt?"
          rows={7}
          disabled={disabled}
        />
        <div className="composer-actions">
          <button type="button" className="icon-button" onClick={() => setQuery("")} disabled={disabled || !query}>
            <Trash2 size={18} aria-hidden="true" />
            <span className="sr-only">Eingabe leeren</span>
          </button>
          <button type="submit" className="primary-button" disabled={disabled || !query.trim()}>
            <Send size={18} aria-hidden="true" />
            Absenden
          </button>
        </div>
      </form>

      <div className="divider" />

      <AudioRecorder disabled={disabled} onSubmitAudio={onSubmitAudio} />
    </section>
  );
}
