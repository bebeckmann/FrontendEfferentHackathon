"use client";

import { FormEvent, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { AudioRecorder } from "./audio-recorder";

type QueryComposerProps = {
  disabled: boolean;
  onSubmitText: (query: string) => void;
  onSubmitAudio: (audio: Blob) => void;
};

export function QueryComposer({
  disabled,
  onSubmitText,
  onSubmitAudio,
}: QueryComposerProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery || disabled) return;

    onSubmitText(trimmedQuery);
    setQuery("");
  }

  return (
    <section className="surface status-panel" aria-label="Nachricht verfassen">
      <form onSubmit={handleSubmit} className="chat-composer-form">
        <button
          type="button"
          className="chat-icon-button"
          onClick={() => setQuery("")}
          disabled={disabled || !query}
          aria-label={query ? "Eingabe leeren" : "Aktion öffnen"}
        >
          {query ? (
            <Trash2 size={22} aria-hidden="true" />
          ) : (
            <Plus size={28} aria-hidden="true" />
          )}
        </button>

        <input
          id="query-input"
          className="chat-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What is the relationship between initial lactate level and 28-day mortality in septic shock?"
          disabled={disabled}
          autoComplete="off"
        />

        <div className="chat-composer-actions">
          <AudioRecorder disabled={disabled} onSubmitAudio={onSubmitAudio} />

          <button
            type="submit"
            className="chat-send-button"
            disabled={disabled || !query.trim()}
            aria-label="Absenden"
          >
            <Send size={20} aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
}