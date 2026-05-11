function escapeCsvField(value) {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, "\"\"");
  const needsQuotes = /[",\n\r]/.test(escaped);
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function rowsToCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "";
  }

  return rows
    .map((row) => {
      const cells = Array.isArray(row) ? row : [];
      return cells.map(escapeCsvField).join(",");
    })
    .join("\n");
}
