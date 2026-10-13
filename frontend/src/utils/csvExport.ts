import type { Complaint } from "../types";

export function downloadCSV(headers: string[], rows: (string | number | undefined | null)[][], filename: string) {
  const csvRows = [
    headers.join(","),
    ...rows.map(r => r.map(val => `"${String(val ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(rows: Complaint[], filename: string) {
  downloadCSV(
    ["Reference", "Title", "Category", "Location", "Status", "Priority", "Date"],
    rows.map(c => [
      c.reference_number,
      c.title || "",
      c.category_name || "Uncategorized",
      c.location_address || "",
      c.status,
      c.priority,
      new Date(c.created_at).toLocaleDateString("en-IN"),
    ]),
    filename
  );
}
