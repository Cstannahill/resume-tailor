import { downloadBlob } from "./utils";

export interface ExportSection {
  heading: string;
  lines: string[];
}

export interface ExportPayload {
  title: string;
  sections: ExportSection[];
}

export const exportToPdf = async (payload: ExportPayload, filename: string) => {
  if (typeof window === "undefined") return;
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF("p", "pt", "a4");
  const margin = 54;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;
  const lineHeight = 14;
  let cursor = margin;
  const addPageIfNeeded = () => {
    if (cursor <= pageHeight - margin) return;
    doc.addPage();
    cursor = margin;
  };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(payload.title, margin, cursor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  cursor += lineHeight * 2;

  payload.sections.forEach((section) => {
    if (section.lines.length === 0) return;
    addPageIfNeeded();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(section.heading.toUpperCase(), margin, cursor);
    cursor += lineHeight;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    section.lines.forEach((line) => {
      const wrappedLines = doc.splitTextToSize(line, usableWidth);
      wrappedLines.forEach((wrappedLine) => {
        if (cursor > pageHeight - margin) {
          doc.addPage();
          cursor = margin;
        }
        doc.text(wrappedLine, margin, cursor);
        cursor += lineHeight;
      });
      cursor += lineHeight * 0.25;
    });
    cursor += lineHeight * 0.5;
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
};

export const exportToDocx = async (payload: ExportPayload, filename: string) => {
  if (typeof window === "undefined") return;
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: payload.title,
                size: 28,
                bold: true,
                font: "Calibri",
              }),
            ],
          }),
          ...payload.sections.flatMap((section) => {
            if (section.lines.length === 0) return [];
            return [
              new Paragraph({
                spacing: { before: 120, after: 80 },
                children: [
                  new TextRun({
                    text: section.heading.toUpperCase(),
                    bold: true,
                    size: 24,
                    font: "Calibri",
                  }),
                ],
              }),
              ...section.lines.map(
                (line) =>
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: line,
                        size: 20,
                        font: "Calibri",
                      }),
                    ],
                  }),
              ),
            ];
          }),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
};
