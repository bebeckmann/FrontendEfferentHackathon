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

type TableRow = {
  id: string;
  documentNumber: number;
  fields: Record<string, string>;
};

type DocumentEntry = {
  number: number;
  rawMarkdown: string;
  title: string;
  studyLevelRows: TableRow[];
  phenotypeRows: TableRow[];
};

type SortState = {
  column: string;
  direction: "asc" | "desc";
} | null;

const API_BASE_URL = "http://localhost:8000";

const STUDY_LEVEL_COLUMNS = [
  "Study",
  "Country",
  "Setting",
  "Sample Size",
  "Sepsis Def",
  "Method",
  "Clusters",
  "Variables",
];

const PHENOTYPE_COLUMNS = [
  "Study",
  "Cluster",
  "Key Features",
  "Clinical Description",
  "Outcomes",
  "Notes",
];

function normalizeHeading(value: string) {
  return value
    .replace(/^#+\s*/, "")
    .replace(/\*/g, "")
    .trim()
    .toLocaleLowerCase("en-US");
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function splitMarkdownRow(row: string) {
  const trimmed = row.trim();
  const withoutOuterPipes = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "");

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

function parseMarkdownTable(
  markdown: string,
  heading: string,
  expectedColumns: string[],
  documentNumber: number
): TableRow[] {
  const section = extractMarkdownSection(markdown, heading);

  if (!section) return [];

  const tableLines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (tableLines.length < 2) return [];

  const headerLine = tableLines[0];
  const headers = splitMarkdownRow(headerLine);

  const dataLines = tableLines.slice(1).filter((line) => {
    return !isMarkdownSeparatorRow(line);
  });

  return dataLines.map((line, rowIndex) => {
    const cells = splitMarkdownRow(line);
    const fields: Record<string, string> = {};

    expectedColumns.forEach((column) => {
      const sourceIndex = headers.findIndex(
        (header) =>
          header.trim().toLocaleLowerCase("en-US") ===
          column.trim().toLocaleLowerCase("en-US")
      );

      fields[column] = sourceIndex >= 0 ? cells[sourceIndex] ?? "" : "";
    });

    return {
      id: `${documentNumber}-${heading}-${rowIndex}`,
      documentNumber,
      fields,
    };
  });
}

function parseSimpleFields(markdown: string): Record<string, string> {
  const fields: Record<string, string> = {};

  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const fieldMatch = line.match(
      /^(?:[-•]\s*)?(?:\*\*)?\*?([^:*]+?)\*?(?:\*\*)?\s*:\s*(.*)$/
    );

    if (!fieldMatch) continue;

    const key = fieldMatch[1].replace(/\*/g, "").replace(/:/g, "").trim();
    const value = stripMarkdown(fieldMatch[2]);

    fields[key] = value;
  }

  return fields;
}

function getDocumentTitle(
  documentNumber: number,
  markdown: string,
  studyLevelRows: TableRow[]
) {
  const fields = parseSimpleFields(markdown);

  return (
    studyLevelRows[0]?.fields["Study"] ||
    fields["Study Title"] ||
    `Document ${documentNumber}`
  );
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
  rows: TableRow[],
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

function filterRows(rows: TableRow[], filters: Record<string, string>) {
  let filteredRows = rows;

  for (const [column, filterValue] of Object.entries(filters)) {
    const normalizedFilter = filterValue.trim().toLocaleLowerCase("en-US");

    if (!normalizedFilter) continue;

    filteredRows = filteredRows.filter((row) =>
      String(row.fields[column] ?? "")
        .toLocaleLowerCase("en-US")
        .includes(normalizedFilter)
    );
  }

  return filteredRows;
}

function escapeMarkdownCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function buildMarkdownTable(columns: string[], rows: TableRow[]) {
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

function buildCsvTable(columns: string[], rows: TableRow[]) {
  const header = columns.map(escapeCsvCell).join(",");

  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(row.fields[column] ?? "")).join(",")
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

type EvidenceTableProps = {
  title: string;
  subtitle: string;
  columns: string[];
  rows: TableRow[];
  filters: Record<string, string>;
  sortState: SortState;
  markdownFilename: string;
  csvFilename: string;
  onFilterChange: (column: string, value: string) => void;
  onSortChange: (column: string) => void;
};

function EvidenceTable({
  title,
  subtitle,
  columns,
  rows,
  filters,
  sortState,
  markdownFilename,
  csvFilename,
  onFilterChange,
  onSortChange,
}: EvidenceTableProps) {
  function downloadMarkdown() {
    downloadTextFile(
      markdownFilename,
      buildMarkdownTable(columns, rows),
      "text/markdown"
    );
  }

  function downloadCsv() {
    downloadTextFile(csvFilename, buildCsvTable(columns, rows), "text/csv");
  }

  return (
    <div className="estimation-card combined-table-card">
      <div className="table-toolbar">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="table-toolbar-actions">
          <button
            type="button"
            className="secondary-button compact-button"
            onClick={downloadMarkdown}
            disabled={columns.length === 0 || rows.length === 0}
          >
            <Download size={16} aria-hidden="true" />
            Download Markdown
          </button>

          <button
            type="button"
            className="secondary-button compact-button"
            onClick={downloadCsv}
            disabled={columns.length === 0 || rows.length === 0}
          >
            <Download size={16} aria-hidden="true" />
            Download CSV
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => {
                const isSorted = sortState?.column === column;

                return (
                  <th key={column}>
                    <button type="button" onClick={() => onSortChange(column)}>
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
                      value={filters[column] ?? ""}
                      onChange={(event) =>
                        onFilterChange(column, event.target.value)
                      }
                      placeholder="Filter..."
                    />
                  </label>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  No rows match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={`${row.id}-${column}`}>
                      {row.fields[column] ?? ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CounterfactualMortalityEstimationPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [selectedDocumentNumbers, setSelectedDocumentNumbers] = useState<
    Set<number>
  >(new Set());

  const [studyLevelFilters, setStudyLevelFilters] = useState<
    Record<string, string>
  >({});
  const [phenotypeFilters, setPhenotypeFilters] = useState<
    Record<string, string>
  >({});

  const [studyLevelSortState, setStudyLevelSortState] =
    useState<SortState>(null);
  const [phenotypeSortState, setPhenotypeSortState] =
    useState<SortState>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

            const studyLevelRows = parseMarkdownTable(
              data.entry,
              "STUDY-LEVEL SUMMARY",
              STUDY_LEVEL_COLUMNS,
              data.number
            );

            const phenotypeRows = parseMarkdownTable(
              data.entry,
              "PHENOTYPE / CLUSTER-LEVEL TABLE",
              PHENOTYPE_COLUMNS,
              data.number
            );

            return {
              number: data.number,
              rawMarkdown: data.entry,
              title: getDocumentTitle(data.number, data.entry, studyLevelRows),
              studyLevelRows,
              phenotypeRows,
            };
          })
        );

        if (!isMounted) return;

        setDocuments(responses);
        setSelectedDocumentNumbers(
          new Set(responses.map((entry) => entry.number))
        );
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

  const allStudyLevelRows = useMemo(() => {
    return selectedDocuments.flatMap((document) => document.studyLevelRows);
  }, [selectedDocuments]);

  const allPhenotypeRows = useMemo(() => {
    return selectedDocuments.flatMap((document) => document.phenotypeRows);
  }, [selectedDocuments]);

  const visibleStudyLevelRows = useMemo(() => {
    let rows = filterRows(allStudyLevelRows, studyLevelFilters);

    if (studyLevelSortState) {
      rows = sortRows(
        rows,
        studyLevelSortState.column,
        studyLevelSortState.direction
      );
    }

    return rows;
  }, [allStudyLevelRows, studyLevelFilters, studyLevelSortState]);

  const visiblePhenotypeRows = useMemo(() => {
    let rows = filterRows(allPhenotypeRows, phenotypeFilters);

    if (phenotypeSortState) {
      rows = sortRows(
        rows,
        phenotypeSortState.column,
        phenotypeSortState.direction
      );
    }

    return rows;
  }, [allPhenotypeRows, phenotypeFilters, phenotypeSortState]);

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
    setSelectedDocumentNumbers(
      new Set(documents.map((document) => document.number))
    );
  }

  function clearSelectedDocuments() {
    setSelectedDocumentNumbers(new Set());
  }

  function updateStudyLevelFilter(column: string, value: string) {
    setStudyLevelFilters((current) => ({
      ...current,
      [column]: value,
    }));
  }

  function updatePhenotypeFilter(column: string, value: string) {
    setPhenotypeFilters((current) => ({
      ...current,
      [column]: value,
    }));
  }

  function handleStudyLevelSort(column: string) {
    setStudyLevelSortState((current) => {
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

  function handlePhenotypeSort(column: string) {
    setPhenotypeSortState((current) => {
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
            <h1>Sepsis Phenotype Evidence Tables</h1>
          </div>
        </div>
      </section>

      <section className="documents-layout">
        <div className="tables-stack">
          {isLoading ? (
            <div className="estimation-card combined-table-card">
              <div className="empty-table-state">
                <Loader2 size={18} aria-hidden="true" className="spin-icon" />
                Documents are being loaded.
              </div>
            </div>
          ) : errorMessage ? (
            <div className="estimation-card combined-table-card">
              <div className="empty-table-state error-state">
                <AlertTriangle size={18} aria-hidden="true" />
                {errorMessage}
              </div>
            </div>
          ) : selectedDocuments.length === 0 ? (
            <div className="estimation-card combined-table-card">
              <div className="empty-table-state">No documents selected.</div>
            </div>
          ) : (
            <>
              <EvidenceTable
                title="STUDY-LEVEL SUMMARY"
                subtitle={`${visibleStudyLevelRows.length.toLocaleString(
                  "en-US"
                )} of ${allStudyLevelRows.length.toLocaleString(
                  "en-US"
                )} study-level rows visible`}
                columns={STUDY_LEVEL_COLUMNS}
                rows={visibleStudyLevelRows}
                filters={studyLevelFilters}
                sortState={studyLevelSortState}
                markdownFilename="study-level-summary.md"
                csvFilename="study-level-summary.csv"
                onFilterChange={updateStudyLevelFilter}
                onSortChange={handleStudyLevelSort}
              />

              <EvidenceTable
                title="PHENOTYPE / CLUSTER-LEVEL TABLE"
                subtitle={`${visiblePhenotypeRows.length.toLocaleString(
                  "en-US"
                )} of ${allPhenotypeRows.length.toLocaleString(
                  "en-US"
                )} phenotype rows visible`}
                columns={PHENOTYPE_COLUMNS}
                rows={visiblePhenotypeRows}
                filters={phenotypeFilters}
                sortState={phenotypeSortState}
                markdownFilename="phenotype-cluster-level-table.md"
                csvFilename="phenotype-cluster-level-table.csv"
                onFilterChange={updatePhenotypeFilter}
                onSortChange={handlePhenotypeSort}
              />
            </>
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
              return (
                <label className="document-checkbox" key={document.number}>
                  <input
                    type="checkbox"
                    checked={selectedDocumentNumbers.has(document.number)}
                    onChange={() => toggleDocument(document.number)}
                  />

                  <span>
                    <strong>#{document.number}</strong>
                    {document.title}
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