// src/lib/api.ts

import { mockIndexEntries } from "./mock-IndexEntries";

const API_BASE_URL = "http://localhost:8000";

const USE_MOCK_DATA =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export type ApiEntryResponse = {
  number: number;
  total: number;
  entry: string;
};

export async function fetchIndexEntry(
  number: number
): Promise<ApiEntryResponse> {
  if (USE_MOCK_DATA) {
    const entry = mockIndexEntries.find((item) => item.number === number);

    if (!entry) {
      throw new Error(`Mock entry ${number} not found.`);
    }

    return entry;
  }

  const response = await fetch(`${API_BASE_URL}/api/index/entries/${number}`);

  if (!response.ok) {
    throw new Error(
      `Entry ${number} could not be loaded. Status: ${response.status}`
    );
  }

  return (await response.json()) as ApiEntryResponse;
}