export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (val: string): string => {
    let str = val ?? "";
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const bom = "\uFEFF";
  const headerLine = headers.map(escape).join(",");
  const dataLines = rows.map((r) => r.map(escape).join(","));
  return bom + [headerLine, ...dataLines].join("\n");
}
