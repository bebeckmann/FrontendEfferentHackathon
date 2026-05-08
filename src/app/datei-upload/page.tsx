"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, UploadCloud, X } from "lucide-react";

type IndexResponse = {
  indexed: string[];
  total_chunks: number;
};

export default function FileUploadPage() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [indexResult, setIndexResult] = useState<IndexResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setErrorMessage(null);
    setIndexResult(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setSelectedFile(null);
      setErrorMessage("Please upload only a PDF file.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  function clearFile() {
    setSelectedFile(null);
    setErrorMessage(null);
    setIndexResult(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Please select a PDF file first.");
      return;
    }

    setErrorMessage(null);
    setIndexResult(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("files", selectedFile);

    try {
      const response = await fetch("http://localhost:8000/api/index", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result: IndexResponse = await response.json();

      setIndexResult(result);
      console.log("Indexing successful:", result);
    } catch (error) {
      console.error(error);
      setErrorMessage("The upload failed.");
    } finally {
      setIsUploading(false);
    }
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
            <p className="eyebrow">PDF Upload</p>
            <h1>File Upload</h1>
          </div>
        </div>
      </section>

      <section className="upload-page">
        <form className="upload-card" onSubmit={handleSubmit}>
          <div className="upload-icon">
            <UploadCloud size={32} aria-hidden="true" />
          </div>

          <div>
            <h2>Upload PDF File</h2>
            <p>
              A maximum of one file can be uploaded. Only PDF files are allowed.
            </p>
          </div>

          <label className="upload-dropzone">
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple={false}
              onChange={handleFileChange}
            />
            <span>Select PDF</span>
          </label>

          {selectedFile && (
            <div className="selected-file">
              <div>
                <FileText size={18} aria-hidden="true" />
                <span>{selectedFile.name}</span>
              </div>

              <button
                type="button"
                onClick={clearFile}
                aria-label="Remove file"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {errorMessage && <p className="form-error">{errorMessage}</p>}

          <button
            type="submit"
            className="primary-button"
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>

          {indexResult && (
            <div className="upload-result">
              <h3>Indexing complete</h3>

              <p>
                Total chunks created:{" "}
                <strong>{indexResult.total_chunks}</strong>
              </p>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>File name</th>
                  </tr>
                </thead>
                <tbody>
                  {indexResult.indexed.map((fileName, index) => (
                    <tr key={`${fileName}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{fileName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}