import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Download,
  RefreshCw, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { format } from "date-fns";
import { toast } from "sonner";

// Required CSV columns mapping
const REQUIRED_FIELDS = ["parcel_number", "owner_name", "address"];
const OPTIONAL_FIELDS = [
  "parcel_size", "district", "ward", "allocation_status",
  "survey_reference", "latitude", "longitude", "land_use",
  "approval_status", "state", "lga", "owner_email",
];

function validateRecord(rec, index, existingNumbers) {
  const errors = [];
  if (!rec.parcel_number?.trim()) errors.push("Missing parcel_number");
  if (!rec.owner_name?.trim()) errors.push("Missing owner_name");
  if (!rec.address?.trim()) errors.push("Missing address");
  if (rec.latitude && isNaN(parseFloat(rec.latitude))) errors.push("Invalid latitude");
  if (rec.longitude && isNaN(parseFloat(rec.longitude))) errors.push("Invalid longitude");
  if (rec.parcel_size && isNaN(parseFloat(rec.parcel_size))) errors.push("Invalid parcel_size");
  const isDuplicate = existingNumbers.has(rec.parcel_number?.trim());
  return { index, record: rec, errors, isDuplicate, valid: errors.length === 0 && !isDuplicate };
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
  return { headers, rows };
}

export default function BulkImport() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [step, setStep] = useState("upload"); // upload | preview | importing | done
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [showExpanded, setShowExpanded] = useState({});
  const [importing, setImporting] = useState(false);

  const { data: existingParcels = [] } = useQuery({
    queryKey: ["parcels-for-import"],
    queryFn: () => base44.entities.LandParcel.list("-created_date", 2000),
  });
  const { data: importHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["import-history"],
    queryFn: () => base44.entities.ImportHistory.list("-created_date", 50),
  });

  const existingNumbers = new Set(existingParcels.map(p => p.parcel_number));

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const text = await f.text();
    const { rows } = parseCSV(text);
    setParsedRows(rows);
    const results = rows.map((r, i) => validateRecord(r, i, existingNumbers));
    setValidationResults(results);
    setStep("preview");
  };

  const validCount = validationResults.filter(r => r.valid).length;
  const invalidCount = validationResults.filter(r => r.errors.length > 0).length;
  const duplicateCount = validationResults.filter(r => r.isDuplicate).length;

  const handleImport = async () => {
    setImporting(true);
    setStep("importing");
    let imported = 0;
    let failed = 0;

    // Upload file for record keeping
    let fileUrl = "";
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      fileUrl = file_url;
    } catch (_) {}

    // Create ImportHistory record
    const historyRecord = await base44.entities.ImportHistory.create({
      uploaded_by: user?.email,
      uploaded_by_name: user?.full_name,
      file_name: file?.name || "import.csv",
      file_url: fileUrl,
      import_type: file?.name?.endsWith(".xlsx") ? "xlsx" : "csv",
      records_processed: parsedRows.length,
      status: "processing",
    });

    const toImport = validationResults.filter(r => r.valid);
    const validationReport = validationResults
      .filter(r => !r.valid)
      .map(r => ({ row: r.index + 2, errors: r.errors, duplicate: r.isDuplicate, parcel_number: r.record.parcel_number }));

    for (const result of toImport) {
      const r = result.record;
      try {
        await base44.entities.LandParcel.create({
          parcel_number: r.parcel_number?.trim(),
          owner_name: r.owner_name?.trim(),
          address: r.address?.trim(),
          owner_email: r.owner_email?.trim() || "",
          size_hectares: r.parcel_size ? parseFloat(r.parcel_size) : undefined,
          state: r.state?.trim() || r.district?.trim() || "",
          lga: r.lga?.trim() || r.ward?.trim() || "",
          latitude: r.latitude ? parseFloat(r.latitude) : undefined,
          longitude: r.longitude ? parseFloat(r.longitude) : undefined,
          land_use: r.land_use?.trim() || "residential",
          notes: r.allocation_status ? `Allocation: ${r.allocation_status}` : "",
          status: r.approval_status?.toLowerCase() === "approved" ? "approved" : "pending",
          verification_status: "unverified",
          registered_by: user?.email,
          import_source: historyRecord.id,
          boundary_source: "legacy_import",
        });
        imported++;
      } catch (_) {
        failed++;
      }
    }

    // Update ImportHistory
    await base44.entities.ImportHistory.update(historyRecord.id, {
      records_imported: imported,
      records_failed: failed + invalidCount,
      records_duplicate: duplicateCount,
      status: failed + invalidCount === 0 ? "completed" : imported > 0 ? "partial" : "failed",
      validation_report: JSON.stringify(validationReport),
    });

    // Audit log
    await base44.entities.AuditLog.create({
      user_email: user?.email,
      user_name: user?.full_name,
      action: `Bulk imported ${imported} land parcels from file: ${file?.name}`,
      entity_type: "LandParcel",
      details: `Processed: ${parsedRows.length}, Imported: ${imported}, Failed: ${failed}, Duplicates: ${duplicateCount}`,
    });

    setImportResult({ imported, failed, duplicates: duplicateCount, invalid: invalidCount });
    qc.invalidateQueries({ queryKey: ["parcels-for-import"] });
    qc.invalidateQueries({ queryKey: ["import-history"] });
    setImporting(false);
    setStep("done");
    toast.success(`Import complete: ${imported} parcels imported`);
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setParsedRows([]);
    setValidationResults([]);
    setImportResult(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="w-6 h-6 text-primary" />
          Bulk Parcel Import
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import legacy government parcel records from CSV or XLSX files
        </p>
      </div>

      {/* CSV Format Guide */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Required CSV Columns</p>
              <p className="text-xs text-blue-700 mt-1">
                <strong>Required:</strong> {REQUIRED_FIELDS.join(", ")}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                <strong>Optional:</strong> {OPTIONAL_FIELDS.join(", ")}
              </p>
              <p className="text-xs text-blue-600 mt-1">First row must be column headers. Values comma-separated.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Import File</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload CSV or XLSX</p>
              <p className="text-xs text-muted-foreground mt-1">Max 10MB</p>
              <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} className="hidden" />
            </label>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview + Validation */}
      {step === "preview" && validationResults.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{parsedRows.length}</p>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{validCount}</p>
                <p className="text-xs text-muted-foreground">Valid</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
                <p className="text-xs text-muted-foreground">Invalid</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{duplicateCount}</p>
                <p className="text-xs text-muted-foreground">Duplicates</p>
              </CardContent>
            </Card>
          </div>

          {/* Validation Report */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Validation Report — {file?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {validationResults.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                      r.valid ? "bg-emerald-50 text-emerald-800" :
                      r.isDuplicate ? "bg-amber-50 text-amber-800" :
                      "bg-red-50 text-red-800"
                    }`}
                  >
                    {r.valid
                      ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      : r.isDuplicate
                      ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    }
                    <span>
                      <strong>Row {i + 2}</strong>: {r.record.parcel_number || "(no number)"}
                      {r.isDuplicate && " — DUPLICATE (already exists)"}
                      {r.errors.length > 0 && ` — ${r.errors.join(", ")}`}
                      {r.valid && " — OK"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={validCount === 0}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Import {validCount} Valid Records
            </Button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Importing records...</p>
            <p className="text-xs text-muted-foreground mt-1">Please do not close this page</p>
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {step === "done" && importResult && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-base font-semibold text-emerald-800">Import Complete</p>
                <p className="text-sm text-emerald-700">Successfully processed {parsedRows.length} records</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-emerald-100 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-emerald-700">{importResult.imported}</p>
                <p className="text-xs text-emerald-600">Imported</p>
              </div>
              <div className="bg-red-100 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-red-700">{importResult.failed}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
              <div className="bg-amber-100 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-amber-700">{importResult.duplicates}</p>
                <p className="text-xs text-amber-600">Duplicates Skipped</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gray-700">{importResult.invalid}</p>
                <p className="text-xs text-gray-600">Invalid Skipped</p>
              </div>
            </div>
            <Button onClick={reset} className="gap-2">
              <Upload className="w-4 h-4" /> Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Import History
        </h2>
        {historyLoading ? (
          <LoadingSpinner text="Loading history..." />
        ) : importHistory.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No imports yet</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {importHistory.map(h => (
              <Card key={h.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{h.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        By {h.uploaded_by_name || h.uploaded_by} · {format(new Date(h.created_date), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                    <span className="text-emerald-600 font-medium">{h.records_imported ?? 0} imported</span>
                    {h.records_failed > 0 && <span className="text-red-600">{h.records_failed} failed</span>}
                    <StatusBadge status={h.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}