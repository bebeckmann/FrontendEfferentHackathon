import type { AgentModelOption, AgentRunResponse } from "./dto";

export function createMockRun(query: string, transcript?: string, model?: AgentModelOption): AgentRunResponse {
  return {
    runId: `mock_${Date.now()}`,
    status: "completed",
    query,
    model,
    transcript: transcript
      ? {
          text: transcript,
          language: "de",
          model: "openai/whisper-large-v3"
        }
      : null,
    answer: {
      summary: "Antwort mit Docling-Belegen",
      markdown:
        "Die Analyse findet drei relevante Stellen: **Haftungsbegrenzung**, **Kuendigungsfrist** und **Datenschutzpflichten**. Die markierten Bereiche zeigen die Passagen, aus denen diese Einschaetzung abgeleitet wurde.\n\n- Haftung ist auf direkte Schaeden begrenzt.\n- Die Kuendigungsfrist betraegt 30 Tage zum Monatsende.\n- Personenbezogene Daten muessen zweckgebunden verarbeitet werden."
    },
    evidence: [
      {
        id: "ev_mock_1",
        documentId: "doc_contract",
        documentName: "rahmenvertrag.pdf",
        pageNumber: 4,
        imageUrl:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='1600' viewBox='0 0 1200 1600'%3E%3Crect width='1200' height='1600' fill='%23f8fafc'/%3E%3Crect x='120' y='110' width='960' height='1380' rx='10' fill='white' stroke='%23cbd5e1'/%3E%3Ctext x='180' y='210' font-family='Arial' font-size='44' font-weight='700' fill='%23111827'%3ERahmenvertrag%3C/text%3E%3Ctext x='180' y='310' font-family='Arial' font-size='28' fill='%23334155'%3E4. Haftung%3C/text%3E%3Ctext x='180' y='380' font-family='Arial' font-size='24' fill='%23475569'%3EDie Parteien haften fuer direkte Schaeden nur bis zur%3C/text%3E%3Ctext x='180' y='425' font-family='Arial' font-size='24' fill='%23475569'%3EHoehe der im jeweiligen Vertragsjahr gezahlten Verguetung.%3C/text%3E%3Ctext x='180' y='520' font-family='Arial' font-size='28' fill='%23334155'%3E5. Kuendigung%3C/text%3E%3Ctext x='180' y='590' font-family='Arial' font-size='24' fill='%23475569'%3EDer Vertrag kann mit einer Frist von 30 Tagen%3C/text%3E%3Ctext x='180' y='635' font-family='Arial' font-size='24' fill='%23475569'%3Ezum Monatsende schriftlich gekuendigt werden.%3C/text%3E%3C/svg%3E",
        width: 1200,
        height: 1600,
        rationale: "Die Seite enthaelt Haftung und Kuendigungsfrist.",
        highlights: [
          {
            id: "hl_mock_1",
            bbox: { x: 165, y: 345, width: 850, height: 115 },
            label: "Haftungsbegrenzung",
            snippet: "Haftung nur bis zur Hoehe der gezahlten Verguetung.",
            confidence: 0.92
          },
          {
            id: "hl_mock_2",
            bbox: { x: 165, y: 555, width: 790, height: 115 },
            label: "Kuendigungsfrist",
            snippet: "Frist von 30 Tagen zum Monatsende.",
            confidence: 0.88
          }
        ]
      },
      {
        id: "ev_mock_2",
        documentId: "doc_contract",
        documentName: "rahmenvertrag.pdf",
        pageNumber: 7,
        imageUrl:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='1600' viewBox='0 0 1200 1600'%3E%3Crect width='1200' height='1600' fill='%23f8fafc'/%3E%3Crect x='120' y='110' width='960' height='1380' rx='10' fill='white' stroke='%23cbd5e1'/%3E%3Ctext x='180' y='210' font-family='Arial' font-size='44' font-weight='700' fill='%23111827'%3EDatenschutzanlage%3C/text%3E%3Ctext x='180' y='330' font-family='Arial' font-size='28' fill='%23334155'%3E2. Verarbeitung%3C/text%3E%3Ctext x='180' y='405' font-family='Arial' font-size='24' fill='%23475569'%3EPersonenbezogene Daten werden ausschliesslich%3C/text%3E%3Ctext x='180' y='450' font-family='Arial' font-size='24' fill='%23475569'%3Ezweckgebunden und gemaess Weisung verarbeitet.%3C/text%3E%3C/svg%3E",
        width: 1200,
        height: 1600,
        rationale: "Die Seite belegt die Datenschutzpflichten.",
        highlights: [
          {
            id: "hl_mock_3",
            bbox: { x: 165, y: 370, width: 835, height: 115 },
            label: "Datenschutzpflicht",
            snippet: "Daten werden ausschliesslich zweckgebunden verarbeitet.",
            confidence: 0.9
          }
        ]
      }
    ],
    usage: {
      asrSeconds: transcript ? 4.2 : 0,
      agentLatencyMs: 1280
    },
    createdAt: new Date().toISOString()
  };
}
