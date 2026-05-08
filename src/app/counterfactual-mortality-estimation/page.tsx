"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Search,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type ApiEntryResponse = {
  number: number;
  total: number;
  entry: string;
};

type DocumentEntry = {
  number: number;
  rawMarkdown: string;
  fields: Record<string, string>;
};

type SortState = {
  column: string;
  direction: "asc" | "desc";
} | null;

const API_BASE_URL = "http://localhost:8000";
const COUNTERFACTUAL_COLUMNS = [
  "Document",
  "Study",
  "Population",
  "Sample Size",
  "Predictor / Phenotyping Approach",
  "Outcome",
  "Timing",
  "Method",
  "Effect Size",
  "Predictor / Phenotyping Approach",
  "Notes",
  "Source",
];

function normalizeFieldName(value: string) {
  return value
    .replace(/\*/g, "")
    .replace(/:/g, "")
    .trim();
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function parseMarkdownEntry(markdown: string): Record<string, string> {
  const fields: Record<string, string> = {};

  const allowedFields = new Set(
    COUNTERFACTUAL_COLUMNS.filter((column) => column !== "Document")
  );

  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let currentKey: string | null = null;

  for (const line of lines) {
    // Ignore headings, dividers, and Markdown table rows
    if (line.startsWith("#")) continue;
    if (line === "---") continue;
    if (line.startsWith("|")) continue;

    const fieldMatch = line.match(
      /^(?:[-•]\s*)?(?:\*\*)?\*?([^:*]+?)\*?(?:\*\*)?\s*:\s*(.*)$/
    );

    if (fieldMatch) {
      const key = normalizeFieldName(fieldMatch[1]);
      const value = stripMarkdown(fieldMatch[2]);

      if (allowedFields.has(key)) {
        fields[key] = value;
        currentKey = key;
      } else {
        currentKey = null;
      }

      continue;
    }

    // Only append wrapped text to known fields
    if (currentKey && allowedFields.has(currentKey)) {
      fields[currentKey] = `${fields[currentKey]} ${stripMarkdown(line)}`.trim();
    }
  }

  return fields;
}

function getSortableValue(value: string) {
  const normalized = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const numericValue = Number(normalized);

  if (normalized !== "" && Number.isFinite(numericValue)) {
    return numericValue;
  }

  return value.toLocaleLowerCase("en-US");
}

function sortRows(
  rows: DocumentEntry[],
  column: string,
  direction: "asc" | "desc"
) {
  return [...rows].sort((leftRow, rightRow) => {
    const left = getSortableValue(leftRow.fields[column] ?? "");
    const right = getSortableValue(rightRow.fields[column] ?? "");

    if (left < right) return direction === "asc" ? -1 : 1;
    if (left > right) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

function escapeMarkdownCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function buildMarkdownTable(columns: string[], rows: DocumentEntry[]) {
  const header = `| ${columns.map(escapeMarkdownCell).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;

  const body = rows.map((row) => {
    return `| ${columns
      .map((column) => escapeMarkdownCell(row.fields[column] ?? ""))
      .join(" | ")} |`;
  });

  return [header, separator, ...body].join("\n");
}

function escapeCsvCell(value: string) {
  const normalized = value.replace(/\r?\n/g, " ").trim();

  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n")
  ) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function buildCsvTable(columns: string[], rows: DocumentEntry[]) {
  const header = columns.map(escapeCsvCell).join(",");

  const body = rows.map((row) =>
    columns
      .map((column) => escapeCsvCell(row.fields[column] ?? ""))
      .join(",")
  );

  return [header, ...body].join("\n");
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], {
    type: `${mimeType};charset=utf-8`,
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export default function CounterfactualMortalityEstimationPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [selectedDocumentNumbers, setSelectedDocumentNumbers] = useState<
    Set<number>
  >(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortState, setSortState] = useState<SortState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  function normalizeExtractedFields(fields: Record<string, string>) {
  const normalized = { ...fields };

  if (!normalized["Predictor"] && normalized["Predictor / Phenotyping Approach"]) {
    normalized["Predictor"] = normalized["Predictor / Phenotyping Approach"];
  }

  if (!normalized["Performance"] && normalized["Performance / Outcomes"]) {
    normalized["Performance"] = normalized["Performance / Outcomes"];
  }

  if (!normalized["DOI"] && normalized["Doi"]) {
    normalized["DOI"] = normalized["Doi"];
  }

  return normalized;
}

  useEffect(() => {
    let isMounted = true;

    async function loadDocuments() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const firstResponse = await fetch(`${API_BASE_URL}/api/index/entries/1`);

        if (!firstResponse.ok) {
          throw new Error(
            `Entry 1 could not be loaded. Status: ${firstResponse.status}`
          );
        }

        const firstEntry = (await firstResponse.json()) as ApiEntryResponse;

        const entryNumbers = Array.from(
          { length: firstEntry.total },
          (_, index) => index + 1
        );

        const responses = await Promise.all(
          entryNumbers.map(async (number) => {
            const response =
              number === 1
                ? firstResponse
                : await fetch(`${API_BASE_URL}/api/index/entries/${number}`);

            if (!response.ok) {
              throw new Error(
                `Entry ${number} could not be loaded. Status: ${response.status}`
              );
            }

            const data =
              number === 1
                ? firstEntry
                : ((await response.json()) as ApiEntryResponse);

            const studyLevelFields = parseFirstMarkdownTableRow(
              data.entry,
              "STUDY-LEVEL SUMMARY"
            );

            if (!studyLevelFields["Study"] && studyLevelFields["Study Title"]) {
              studyLevelFields["Study"] = studyLevelFields["Study Title"];
            }

            const freeTextFields = normalizeExtractedFields(parseMarkdownEntry(data.entry));

            return {
              number: data.number,
              rawMarkdown: data.entry,
              fields: {
                Document: String(data.number),
                ...studyLevelFields,
                ...freeTextFields,
              },
            };
          })
        );

        if (!isMounted) return;

        setDocuments(responses);
        setSelectedDocumentNumbers(new Set(responses.map((entry) => entry.number)));
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The documents could not be loaded."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedDocuments = useMemo(() => {
    return documents.filter((document) =>
      selectedDocumentNumbers.has(document.number)
    );
  }, [documents, selectedDocumentNumbers]);

  const columns = COUNTERFACTUAL_COLUMNS;

  function normalizeHeading(value: string) {
    return value
      .replace(/^#+\s*/, "")
      .replace(/\*/g, "")
      .trim()
      .toLocaleLowerCase("en-US");
  }

  function splitMarkdownRow(row: string) {
    const trimmed = row.trim();
    const withoutOuterPipes = trimmed.replace(/^\|/, "").replace(/\|$/, "");

    const cells: string[] = [];
    let current = "";
    let escaped = false;

    for (const char of withoutOuterPipes) {
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "|") {
        cells.push(stripMarkdown(current));
        current = "";
        continue;
      }

      current += char;
    }

    cells.push(stripMarkdown(current));

    return cells.map((cell) => cell.replace(/\\\|/g, "|").trim());
  }

  function isMarkdownSeparatorRow(line: string) {
    return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
  }

  function extractMarkdownSection(markdown: string, heading: string) {
    const targetHeading = normalizeHeading(heading);
    const lines = markdown.split(/\r?\n/);

    const startIndex = lines.findIndex((line) => {
      if (!line.trim().startsWith("#")) return false;
      return normalizeHeading(line) === targetHeading;
    });

    if (startIndex === -1) return "";

    const sectionLines: string[] = [];

    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];

      if (line.trim().startsWith("#")) break;
      if (line.trim() === "---") break;

      sectionLines.push(line);
    }

    return sectionLines.join("\n");
  }

  function parseFirstMarkdownTableRow(
    markdown: string,
    heading: string
  ): Record<string, string> {
    const section = extractMarkdownSection(markdown, heading);

    if (!section) return {};

    const tableLines = section
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("|"));

    if (tableLines.length < 2) return {};

    const headers = splitMarkdownRow(tableLines[0]);

    const firstDataLine = tableLines
      .slice(1)
      .find((line) => !isMarkdownSeparatorRow(line));

    if (!firstDataLine) return {};

    const cells = splitMarkdownRow(firstDataLine);
    const fields: Record<string, string> = {};

    headers.forEach((header, index) => {
      fields[header] = cells[index] ?? "";
    });

    return fields;
  }

  const visibleRows = useMemo(() => {
    let rows = selectedDocuments;

    for (const [column, filterValue] of Object.entries(columnFilters)) {
      const normalizedFilter = filterValue.trim().toLocaleLowerCase("en-US");

      if (!normalizedFilter) continue;

      rows = rows.filter((row) =>
        String(row.fields[column] ?? "")
          .toLocaleLowerCase("en-US")
          .includes(normalizedFilter)
      );
    }

    if (sortState) {
      rows = sortRows(rows, sortState.column, sortState.direction);
    }

    return rows;
  }, [selectedDocuments, columnFilters, sortState]);

  function toggleDocument(number: number) {
    setSelectedDocumentNumbers((current) => {
      const next = new Set(current);

      if (next.has(number)) {
        next.delete(number);
      } else {
        next.add(number);
      }

      return next;
    });
  }

  function selectAllDocuments() {
    setSelectedDocumentNumbers(new Set(documents.map((document) => document.number)));
  }

  function clearSelectedDocuments() {
    setSelectedDocumentNumbers(new Set());
  }

  function handleSort(column: string) {
    setSortState((current) => {
      if (current?.column === column) {
        return {
          column,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        column,
        direction: "asc",
      };
    });
  }

  function updateColumnFilter(column: string, value: string) {
    setColumnFilters((current) => ({
      ...current,
      [column]: value,
    }));
  }

  function downloadCurrentTable() {
    const markdown = buildMarkdownTable(columns, visibleRows);

    downloadTextFile(
      "selected-documents-table.md",
      markdown,
      "text/markdown"
    );
  }
  function downloadCurrentTableAsCsv() {
    const csv = buildCsvTable(columns, visibleRows);

    downloadTextFile(
      "selected-documents-table.csv",
      csv,
      "text/csv"
    );
  }

  return (
    <main className="workspace-shell">
      <section className="workspace-header">
        <div className="header-title-row">
          <button
            type="button"
            className="secondary-button compact-button"
            onClick={() => router.push("/")}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>

          <div>
            <p className="eyebrow">Analysis Module</p>
            <h1>Counterfactual Mortality Estimation</h1>
          </div>
        </div>
      </section>

      <section className="documents-layout">
        <div className="estimation-card combined-table-card">
          <div className="table-toolbar">
            <div>
              <h2>Combined Document Table</h2>
              <p>
                {visibleRows.length.toLocaleString("en-US")} of{" "}
                {selectedDocuments.length.toLocaleString("en-US")} selected
                documents visible
              </p>
            </div>

            <div className="table-toolbar-actions">
              <button
                type="button"
                className="secondary-button compact-button"
                onClick={downloadCurrentTable}
                disabled={columns.length === 0 || visibleRows.length === 0}
              >
                <Download size={16} aria-hidden="true" />
                Download Markdown
              </button>

              <button
                type="button"
                className="secondary-button compact-button"
                onClick={downloadCurrentTableAsCsv}
                disabled={columns.length === 0 || visibleRows.length === 0}
              >
                <Download size={16} aria-hidden="true" />
                Download CSV
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="empty-table-state">
              <Loader2 size={18} aria-hidden="true" className="spin-icon" />
              Documents are being loaded.
            </div>
          ) : errorMessage ? (
            <div className="empty-table-state error-state">
              <AlertTriangle size={18} aria-hidden="true" />
              {errorMessage}
            </div>
          ) : columns.length === 0 ? (
            <div className="empty-table-state">
              No documents selected.
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {columns.map((column) => {
                      const isSorted = sortState?.column === column;

                      return (
                        <th key={column}>
                          <button
                            type="button"
                            onClick={() => handleSort(column)}
                          >
                            {column}
                            <span aria-hidden="true">
                              {isSorted
                                ? sortState.direction === "asc"
                                  ? " ↑"
                                  : " ↓"
                                : " ↕"}
                            </span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>

                  <tr>
                    {columns.map((column) => (
                      <th key={`${column}-filter`}>
                        <label className="column-filter">
                          <Search size={14} aria-hidden="true" />
                          <span className="sr-only">Filter {column}</span>
                          <input
                            type="search"
                            value={columnFilters[column] ?? ""}
                            onChange={(event) =>
                              updateColumnFilter(column, event.target.value)
                            }
                            placeholder="Filter..."
                          />
                        </label>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length}>
                        No rows match the current filters.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => (
                      <tr key={row.number}>
                        {columns.map((column) => (
                          <td key={`${row.number}-${column}`}>
                            {row.fields[column] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="estimation-card document-checklist-card">
          <div className="table-toolbar">
            <div>
              <h2>Documents</h2>
              <p>
                {selectedDocumentNumbers.size.toLocaleString("en-US")} of{" "}
                {documents.length.toLocaleString("en-US")} selected
              </p>
            </div>
          </div>

          <div className="checklist-actions">
            <button
              type="button"
              className="secondary-button compact-button"
              onClick={selectAllDocuments}
              disabled={documents.length === 0}
            >
              All
            </button>

            <button
              type="button"
              className="secondary-button compact-button"
              onClick={clearSelectedDocuments}
              disabled={documents.length === 0}
            >
              None
            </button>
          </div>

          <div className="document-checklist">
            {documents.map((document) => {
              const title =
                document.fields["Study"] ||
                document.fields["Study Title"] ||
                document.fields["Title"] ||
                document.fields["Titel"] ||
                document.fields["Document Title"] ||
                document.fields["Article Title"] ||
                `Document ${document.number}`;

              return (
                <label className="document-checkbox" key={document.number}>
                  <input
                    type="checkbox"
                    checked={selectedDocumentNumbers.has(document.number)}
                    onChange={() => toggleDocument(document.number)}
                  />

                  <span>
                    <strong>#{document.number}</strong>
                    {title}
                  </span>
                </label>
              );
            })}
          </div>
        </aside>
      </section>
    </main>
  );
}