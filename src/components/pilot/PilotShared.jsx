import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight } from "lucide-react";

export const S = { ok: "ok", warn: "warn", fail: "fail" };

export function parseCoords(raw) {
  try {
    const geo = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!geo) return null;
    if (geo.type === "Polygon") return geo.coordinates?.[0] ?? null;
    if (geo.type === "Feature") return geo.geometry?.coordinates?.[0] ?? null;
    if (Array.isArray(geo)) return geo;
    return null;
  } catch { return null; }
}

export function polygonAreaSqm(coords) {
  if (!coords || coords.length < 3) return 0;
  // Shoelace formula (approximate, degrees → meters at Nigeria latitudes)
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  // 1 degree ≈ 111,320 m
  return Math.abs(area / 2) * 111320 * 111320;
}

export function StatBox({ label, value, color = "text-gray-900" }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

export function StatusPill({ s }) {
  if (s === S.ok) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" />PASS</span>;
  if (s === S.warn) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3" />WARN</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800"><XCircle className="w-3 h-3" />FAIL</span>;
}

export function EvidenceTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-left px-3 py-2 font-semibold text-gray-600 w-8">#</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Check</th>
            <th className="text-center px-3 py-2 font-semibold text-gray-600 w-20">Checked</th>
            <th className="text-center px-3 py-2 font-semibold text-gray-600 w-16">Passed</th>
            <th className="text-center px-3 py-2 font-semibold text-gray-600 w-16">Failed</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Sample Failed IDs</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Evidence / Notes</th>
            <th className="text-center px-3 py-2 font-semibold text-gray-600 w-16">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${r.status === S.fail ? "bg-red-50" : r.status === S.warn ? "bg-amber-50" : ""}`}>
              <td className="px-3 py-2 text-gray-400 font-mono">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-gray-800">{r.label}</td>
              <td className="px-3 py-2 text-center font-mono font-bold text-gray-700">{r.checked ?? "—"}</td>
              <td className="px-3 py-2 text-center font-mono font-bold text-emerald-700">{r.passed ?? "—"}</td>
              <td className="px-3 py-2 text-center font-mono font-bold text-red-600">{r.failed ?? "—"}</td>
              <td className="px-3 py-2">
                {r.sampleIds?.length > 0
                  ? <div className="flex flex-wrap gap-1">{r.sampleIds.slice(0, 3).map((id, j) => <code key={j} className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-[10px] font-mono">…{String(id).slice(-8)}</code>)}{r.sampleIds.length > 3 && <span className="text-gray-400 text-[10px]">+{r.sampleIds.length - 3}</span>}</div>
                  : <span className="text-gray-400 italic text-[10px]">none</span>}
              </td>
              <td className="px-3 py-2 text-gray-600 text-[11px]">{r.evidence}</td>
              <td className="px-3 py-2 text-center"><StatusPill s={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SectionCard({ title, icon: IconComponent, iconColor, rows, summary }) {
  const Icon = IconComponent;
  const [open, setOpen] = useState(true);
  const pass = rows.filter(r => r.status === S.ok).length;
  const fail = rows.filter(r => r.status === S.fail).length;
  const warn = rows.filter(r => r.status === S.warn).length;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <CardTitle className="text-sm font-bold">{title}</CardTitle>
            <span className="text-xs text-muted-foreground ml-2">{rows.length} checks</span>
          </div>
          <div className="flex items-center gap-2">
            {pass > 0 && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{pass} pass</span>}
            {warn > 0 && <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{warn} warn</span>}
            {fail > 0 && <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{fail} fail</span>}
            {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
        {summary && <p className="text-xs text-muted-foreground mt-1">{summary}</p>}
      </CardHeader>
      {open && <CardContent className="p-0"><EvidenceTable rows={rows} /></CardContent>}
    </Card>
  );
}