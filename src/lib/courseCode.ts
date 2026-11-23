export function normalizeCourseCode(value: unknown): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function extractCourseCodeCandidates(text: string): string[] {
  const candidates = new Set<string>();
  const patterns = [
    /\b[A-Z]{2,8}[\s._/-]*[A-Z]?[0-9][0-9A-Z./_-]*\b/gi,
    /\b[0-9]{2,4}[A-Z]{2,8}[0-9]{2,5}\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const normalized = normalizeCourseCode(match[0]);
      if (normalized.length >= 5) candidates.add(normalized);
    }
  }

  return [...candidates];
}

export function matchCourseCodes(
  pdfText: string,
  excelCourseCodes: string[]
): string[] {
  const normalizedText = normalizeCourseCode(pdfText);
  const matched = new Set<string>();

  for (const excelCode of excelCourseCodes) {
    const normalizedExcelCode = normalizeCourseCode(excelCode);
    if (normalizedExcelCode.length >= 3 && normalizedText.includes(normalizedExcelCode)) {
      matched.add(excelCode.trim());
    }
  }

  return [...matched];
}
