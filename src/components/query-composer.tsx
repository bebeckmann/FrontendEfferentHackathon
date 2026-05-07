"use client";

import { FormEvent, useState } from "react";
import { Plus, Send } from "lucide-react";
import { AudioRecorder } from "./audio-recorder";
import type { AgentModelOption } from "@/lib/dto";

type QueryComposerProps = {
  disabled: boolean;
  models: AgentModelOption[];
  selectedModel: AgentModelOption;
  onModelChange: (model: AgentModelOption) => void;
  onSubmitText: (query: string) => void;
};

export function QueryComposer({
  disabled,
  models,
  selectedModel,
  onModelChange,
  onSubmitText,
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
    <section className="chat-composer" aria-label="Nachricht verfassen">
      <div className="model-switcher" role="radiogroup" aria-label="Model selection">
        {models.map((model) => (
          <button
            key={model.id}
            type="button"
            role="radio"
            aria-checked={selectedModel.id === model.id}
            className={`model-option ${selectedModel.id === model.id ? "selected" : ""}`}
            onClick={() => onModelChange(model)}
            disabled={disabled}
            title={model.id}
          >
            {model.shortLabel}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="chat-composer-form">
        <button
          type="button"
          className="chat-icon-button"
          onClick={() => setQuery("")}
          disabled={disabled}
          aria-label={query ? "Eingabe leeren" : "Aktion oeffnen"}
        >
          <Plus size={32} aria-hidden="true" />
        </button>

        <div className="chat-input-shell">
          <input
            id="query-input"
            className="chat-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What sepsis biomarkers are associated with early mortality in ICU patients?"
            disabled={disabled}
            autoComplete="off"
          />
        </div>

        <div className="chat-composer-actions">
          {query.trim() ? (
            <button
              type="submit"
              className="chat-icon-button"
              disabled={disabled}
              aria-label="Absenden"
            >
              <Send size={22} aria-hidden="true" />
            </button>
          ) : (
            <AudioRecorder disabled={disabled} onTranscript={onSubmitText} />
          )}
        </div>
      </form>
    </section>
  );
}
