/** Export rows to CSV (Excel-compatible). */
export function exportToCsv(filename, rows, columns) {
  if (!rows?.length) return;
  const header = columns.map((c) => c.label).join(';');
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = c.get(row);
      const str = val == null ? '' : String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(';'),
  ).join('\n');
  const blob = new Blob(['\ufeff' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Browser print → PDF via "Enregistrer en PDF". */
export function exportToPdfPrint(title) {
  const prev = document.title;
  document.title = title;
  window.print();
  document.title = prev;
}
