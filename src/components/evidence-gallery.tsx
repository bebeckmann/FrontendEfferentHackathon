"use client";

import { useState } from "react";
import { ExternalLink, ImageIcon } from "lucide-react";
import type { EvidenceImage } from "@/lib/dto";
import { EvidenceViewer } from "./evidence-viewer";

type EvidenceGalleryProps = {
  evidence: EvidenceImage[];
  isRunning: boolean;
  selectedRun?: {
    runId: string;
    query: string;
  } | null;
};

export function EvidenceGallery({ evidence, isRunning, selectedRun }: EvidenceGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex === null ? null : evidence[selectedIndex] ?? null;

  return (
    <section className="evidence-section surface" aria-labelledby="evidence-title" aria-busy={isRunning}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sources</p>
          <h2 id="evidence-title">Selected answer</h2>
        </div>
        <span className="count-badge">{evidence.length}</span>
      </div>
      {selectedRun ? <p className="source-context">{selectedRun.query}</p> : null}

      {isRunning ? (
        <div className="evidence-grid skeleton-grid">
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : evidence.length ? (
        <div className="evidence-grid">
          {evidence.map((item, index) => (
            <article key={item.id} className="evidence-card">
              <button
                type="button"
                className="image-button"
                style={{ aspectRatio: `${item.width} / ${item.height}` }}
                onClick={() => setSelectedIndex(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={`${item.documentName}, Seite ${item.pageNumber}, ${item.highlights.length} Markierungen`}
                />
                {item.highlights.map((highlight) => (
                  <span
                    key={highlight.id}
                    className="highlight-box"
                    title={highlight.snippet ?? highlight.label}
                    style={highlightStyle(highlight.bbox, item)}
                  />
                ))}
              </button>
              <div className="evidence-card-body">
                <div>
                  <h3>{item.documentName}</h3>
                  <p>Seite {item.pageNumber}</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setSelectedIndex(index)}>
                  <ExternalLink size={17} aria-hidden="true" />
                  <span className="sr-only">Open evidence</span>
                </button>
              </div>
              {item.rationale ? <p className="evidence-rationale">{item.rationale}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state evidence-empty">
          <ImageIcon size={24} aria-hidden="true" />
          <p>{selectedRun ? "For this answer no sources have been obtained" : "Choose an answer from the chat on the left."}</p>
        </div>
      )}

      <EvidenceViewer
        evidence={evidence}
        selectedIndex={selectedIndex}
        selected={selected}
        onClose={() => setSelectedIndex(null)}
        onSelect={(nextIndex) => setSelectedIndex(nextIndex)}
      />
    </section>
  );
}

function highlightStyle(bbox: EvidenceImage["highlights"][number]["bbox"], image: EvidenceImage) {
  return {
    left: `${(bbox.x / image.width) * 100}%`,
    top: `${(bbox.y / image.height) * 100}%`,
    width: `${(bbox.width / image.width) * 100}%`,
    height: `${(bbox.height / image.height) * 100}%`
  };
}
