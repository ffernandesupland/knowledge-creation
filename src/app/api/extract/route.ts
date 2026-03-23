import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';

const extractPdf = (buffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParser = new (PDFParser as any)(null, 1);
    pdfParser.on("pdfParser_dataError", (errData: { parserError: Error }) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent().replace(/\r\n/g, " ")));
    pdfParser.parseBuffer(buffer);
  });
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (file.name.toLowerCase().endsWith('.pdf')) {
      extractedText = await extractPdf(buffer);
      // clean up some weird URI encoding pdf2json might leave
      extractedText = decodeURIComponent(extractedText);
    } else if (file.name.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      // Fallback for .txt, .md, .csv
      extractedText = buffer.toString('utf-8');
    }

    // Clean up excessive whitespace
    extractedText = extractedText.replace(/\n\s*\n/g, '\n\n').trim();

    return NextResponse.json({ text: extractedText });
  } catch (error: unknown) {
    console.error("Extraction error:", error);
    const errObj = error as Error;
    return NextResponse.json({ error: errObj.message || "Failed to parse document" }, { status: 500 });
  }
}
