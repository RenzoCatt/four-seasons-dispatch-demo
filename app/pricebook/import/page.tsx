"use client";

import { useState } from "react";

interface ImportResult {
  success: boolean;
  itemsCreated: number;
  itemsUpdated: number;
  ratesCreated: number;
  ratesUpdated: number;
  filesProcessed: number;
  errors: string[];
}

export default function PriceBookImportPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
    setResult(null);
  };

  const handleImport = async () => {
    if (!files || files.length === 0) {
      alert("Please select at least one CSV file");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const response = await fetch("/api/pricebook/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data);
    } catch (error) {
      console.error("Import error:", error);
      setResult({
        success: false,
        itemsCreated: 0,
        itemsUpdated: 0,
        ratesCreated: 0,
        ratesUpdated: 0,
        filesProcessed: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Price Book Import</h1>
        <p className="text-gray-600 mb-8">
          Upload CSV files to import or update price book data. The latest upload will become the active price book.
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload CSV Files</h2>

          <div className="mb-4">
            <label
              htmlFor="file-upload"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select CSV File(s)
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {files && (
              <p className="text-sm text-gray-500 mt-2">
                {files.length} file(s) selected
              </p>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={importing || !files}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {importing ? "Importing..." : "Import"}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Import Results</h2>

            {result.success ? (
              <div className="space-y-3">
                <div className="flex items-center text-green-600">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Import Successful</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Files Processed</p>
                    <p className="text-2xl font-semibold">{result.filesProcessed}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Items Created</p>
                    <p className="text-2xl font-semibold text-green-600">
                      {result.itemsCreated}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Items Updated</p>
                    <p className="text-2xl font-semibold text-blue-600">
                      {result.itemsUpdated}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Rates Created</p>
                    <p className="text-2xl font-semibold text-green-600">
                      {result.ratesCreated}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Rates Updated</p>
                    <p className="text-2xl font-semibold text-blue-600">
                      {result.ratesUpdated}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-red-600">
                <p className="font-medium">Import Failed</p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-red-600 mb-2">
                  Errors ({result.errors.length})
                </h3>
                <div className="bg-red-50 border border-red-200 rounded p-3 max-h-60 overflow-y-auto">
                  <ul className="text-sm space-y-1">
                    {result.errors.map((error, index) => (
                      <li key={index} className="text-red-700">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">CSV Format</h3>
          <p className="text-sm text-blue-800 mb-2">
            CSV files should include these columns:
          </p>
          <code className="block bg-white p-2 rounded text-xs overflow-x-auto">
            sheet,category,code,name,tier,unit_price,hours,equipment,hourly_rate,material_mark_up,description
          </code>
          <ul className="text-sm text-blue-800 mt-3 space-y-1">
            <li>• <strong>tier</strong> must be MEMBER, STANDARD, or RUMI</li>
            <li>• <strong>sheet</strong> should be HVAC, Boiler, or Plumbing</li>
            <li>• Plumbing CSV may omit RUMI tier rows</li>
            <li>• Numeric fields will be rounded to 2 decimal places</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
