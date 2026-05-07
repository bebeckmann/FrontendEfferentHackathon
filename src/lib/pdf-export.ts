import { jsPDF } from "jspdf";
import type { AgentRunResponse } from "./dto";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function downloadChatHistoryPdf(history: AgentRunResponse[]) {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  document.setProperties({
    title: "Efferon Agent Chatverlauf",
    subject: "LangChain Agent run history",
    creator: "Efferon Agent Frontend",
  });

  document.setFont("helvetica", "bold");
  document.setFontSize(17);
  document.text("Efferon Agent Chatverlauf", MARGIN, y);
  y += 9;

  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.text(new Date().toLocaleString("de-DE"), MARGIN, y);
  y += 12;

  if (!history.length) {
    document.text("Noch kein Chatverlauf vorhanden.", MARGIN, y);
    document.save("Efferon-chatverlauf.pdf");
    return;
  }

  history.forEach((run, index) => {
    y = ensureSpace(document, y, 38);
    document.setFont("helvetica", "bold");
    document.setFontSize(12);
    document.text(`Run ${index + 1}: ${run.runId}`, MARGIN, y);
    y += 7;

    y = writeBlock(document, "Frage", run.query, y);

    if (run.transcript?.text && run.transcript.text !== run.query) {
      y = writeBlock(document, "Transkript", run.transcript.text, y);
    }

    y = writeBlock(document, "Antwort", markdownToText(run.answer?.markdown ?? "-"), y);

    if (run.evidence.length) {
      const evidenceText = run.evidence
        .map((item) => {
          const highlights = item.highlights.map((highlight) => highlight.label ?? highlight.snippet ?? highlight.id).join(", ");
          return `${item.documentName}, Seite ${item.pageNumber}${highlights ? `: ${highlights}` : ""}`;
        })
        .join("\n");
      y = writeBlock(document, "Docling-Belege", evidenceText, y);
    }

    y += 5;
  });

  document.save(`Efferon-chatverlauf-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function writeBlock(document: jsPDF, title: string, text: string, y: number) {
  let nextY = ensureSpace(document, y, 18);
  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.text(title, MARGIN, nextY);
  nextY += 5;

  document.setFont("helvetica", "normal");
  document.setFontSize(10);

  const lines = document.splitTextToSize(text || "-", CONTENT_WIDTH);
  for (const line of lines) {
    nextY = ensureSpace(document, nextY, 6);
    document.text(line, MARGIN, nextY);
    nextY += 5;
  }

  return nextY + 3;
}

function ensureSpace(document: jsPDF, y: number, needed: number) {
  if (y + needed <= PAGE_HEIGHT - MARGIN) {
    return y;
  }

  document.addPage();
  return MARGIN;
}

function markdownToText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
    .replace(/#{1,6}\s+/g, "")
    .trim();
}
