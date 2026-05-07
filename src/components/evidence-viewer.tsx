"use client";

import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { EvidenceImage } from "@/lib/dto";

type EvidenceViewerProps = {
  evidence: EvidenceImage[];
  selectedIndex: number | null;
  selected: EvidenceImage | null;
  onClose: () => void;
  onSelect: (index: number) => void;
};

export function EvidenceViewer({ evidence, selectedIndex, selected, onClose, onSelect }: EvidenceViewerProps) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [selected?.id]);

  useEffect(() => {
    if (selectedIndex === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!selected || selectedIndex === null) {
    return null;
  }

  function goPrevious() {
    if (selectedIndex === null) return;
    onSelect(Math.max(0, selectedIndex - 1));
  }

  function goNext() {
    if (selectedIndex === null) return;
    onSelect(Math.min(evidence.length - 1, selectedIndex + 1));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="viewer-title">
      <section className="viewer">
        <header className="viewer-toolbar">
          <div>
            <p className="eyebrow">Evidence {selectedIndex + 1} / {evidence.length}</p>
            <h2 id="viewer-title">
              {selected.documentName}, Seite {selected.pageNumber}
            </h2>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="icon-button" onClick={goPrevious} disabled={selectedIndex === 0}>
              <ChevronLeft size={18} aria-hidden="true" />
              <span className="sr-only">Vorheriges Evidence-Bild</span>
            </button>
            <button type="button" className="icon-button" onClick={goNext} disabled={selectedIndex === evidence.length - 1}>
              <ChevronRight size={18} aria-hidden="true" />
              <span className="sr-only">Naechstes Evidence-Bild</span>
            </button>
            <button type="button" className="icon-button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>
              <Minus size={18} aria-hidden="true" />
              <span className="sr-only">Verkleinern</span>
            </button>
            <button type="button" className="icon-button" onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}>
              <Plus size={18} aria-hidden="true" />
              <span className="sr-only">Vergroessern</span>
            </button>
            <button type="button" className="icon-button" onClick={onClose}>
              <X size={18} aria-hidden="true" />
              <span className="sr-only">Viewer schliessen</span>
            </button>
          </div>
        </header>

        <div className="viewer-content">
          <div className="viewer-image-scroll">
            <div className="viewer-image-frame" style={{ width: `${70 * zoom}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.imageUrl}
                alt={`${selected.documentName}, Seite ${selected.pageNumber}, vergroesserte Evidence-Ansicht`}
              />
              {selected.highlights.map((highlight) => (
                <span
                  key={highlight.id}
                  className="highlight-box viewer-highlight"
                  title={highlight.snippet ?? highlight.label}
                  style={highlightStyle(highlight.bbox, selected)}
                />
              ))}
            </div>
          </div>
          <aside className="viewer-details">
            <h3>Markierungen</h3>
            {selected.highlights.map((highlight) => (
              <article key={highlight.id} className="highlight-detail">
                <div>
                  <strong>{highlight.label ?? "Highlight"}</strong>
                  {typeof highlight.confidence === "number" ? <span>{Math.round(highlight.confidence * 100)}%</span> : null}
                </div>
                {highlight.snippet ? <p>{highlight.snippet}</p> : null}
              </article>
            ))}
          </aside>
        </div>
      </section>
    </div>
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
