function joinBytes(...chunks) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

function jpegBytesFromCanvas(sourceCanvas) {
  const encoded = sourceCanvas.toDataURL("image/jpeg", .94).split(",")[1];
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function createPdfBlob(sourceCanvas) {
  const encoder = new TextEncoder();
  const jpeg = jpegBytesFromCanvas(sourceCanvas);
  const landscape = sourceCanvas.width >= sourceCanvas.height;
  const pageWidth = landscape ? 792 : 612;
  const pageHeight = landscape ? 612 : 792;
  const margin = 36;
  const scale = Math.min((pageWidth - (margin * 2)) / sourceCanvas.width, (pageHeight - (margin * 2)) / sourceCanvas.height);
  const imageWidth = sourceCanvas.width * scale;
  const imageHeight = sourceCanvas.height * scale;
  const imageX = (pageWidth - imageWidth) / 2;
  const imageY = (pageHeight - imageHeight) / 2;
  const content = `q\n${imageWidth.toFixed(3)} 0 0 ${imageHeight.toFixed(3)} ${imageX.toFixed(3)} ${imageY.toFixed(3)} cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(content);
  const objects = [
    null,
    encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"),
    encoder.encode("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`),
    joinBytes(encoder.encode(`<< /Length ${contentBytes.length} >>\nstream\n`), contentBytes, encoder.encode("endstream")),
    joinBytes(
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${sourceCanvas.width} /Height ${sourceCanvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      encoder.encode("\nendstream"),
    ),
  ];
  const chunks = [encoder.encode("%PDF-1.4\n%1234\n")];
  const offsets = [0];
  let byteOffset = chunks[0].length;
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = byteOffset;
    const objectBytes = joinBytes(encoder.encode(`${index} 0 obj\n`), objects[index], encoder.encode("\nendobj\n"));
    chunks.push(objectBytes);
    byteOffset += objectBytes.length;
  }
  const xrefOffset = byteOffset;
  const xref = ["xref", `0 ${objects.length}`, "0000000000 65535 f "];
  for (let index = 1; index < objects.length; index += 1) xref.push(`${String(offsets[index]).padStart(10, "0")} 00000 n `);
  xref.push("trailer", `<< /Size ${objects.length} /Root 1 0 R >>`, "startxref", String(xrefOffset), "%%EOF", "");
  chunks.push(encoder.encode(xref.join("\n")));
  return new Blob(chunks, { type: "application/pdf" });
}
