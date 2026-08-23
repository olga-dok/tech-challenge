/**
 * Hand-builds the smallest valid single-page PDF containing the given text,
 * so extractor tests exercise the real pdf-parse library without spinning up
 * a headless browser just to produce a fixture file.
 */
export function buildMinimalPdf(text: string): Buffer {
  const header = '%PDF-1.4\n';
  const streamContent =
    text.length === 0 ? '' : `BT /F1 24 Tf 20 100 Td (${text}) Tj ET`;

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 200 200] /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(streamContent, 'latin1')} >>\nstream\n${streamContent}\nendstream`,
  ];

  let body = '';
  let offset = Buffer.byteLength(header, 'latin1');
  const objectOffsets: number[] = [];

  objects.forEach((content, index) => {
    const objectString = `${String(index + 1)} 0 obj\n${content}\nendobj\n`;
    objectOffsets.push(offset);
    body += objectString;
    offset += Buffer.byteLength(objectString, 'latin1');
  });

  const xrefStart = offset;
  const xrefEntries = objectOffsets
    .map(
      (entryOffset) => `${entryOffset.toString().padStart(10, '0')} 00000 n \n`,
    )
    .join('');
  const xref = `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n${xrefEntries}`;
  const trailer = `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xrefStart)}\n%%EOF`;

  return Buffer.from(header + body + xref + trailer, 'latin1');
}
