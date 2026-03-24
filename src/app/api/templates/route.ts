import { NextResponse } from "next/server";

export type TemplateField = {
  fieldName: string;
  description: string;
  required: boolean;
  searchable: boolean;
};

export type KBTemplate = {
  templateName: string;
  templateType: string;
  kbPrefix: string;
  fields: TemplateField[];
};

export async function GET() {
  try {
    const companyCode = process.env.KB_COMPANY_CODE;
    const username = process.env.KB_USERNAME;
    const password = process.env.KB_PASSWORD;

    if (!companyCode || !username || !password) {
      return NextResponse.json(
        { error: "Missing KB credentials in environment" },
        { status: 500 }
      );
    }

    const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");
    const baseUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "");

    const response = await fetch(
      `${baseUrl}/templates?companyCode=${companyCode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Templates API failed:", response.status, text);
      return NextResponse.json(
        { error: `Templates API failed with status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const templates: KBTemplate[] = (data.templates || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => ({
        templateName: t.templateName,
        templateType: t.templateType,
        kbPrefix: t.kbPrefix,
        fields: (t.fields || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f: any) => ({
            fieldName: f.fieldName,
            description: f.description || "",
            required: !!f.required,
            searchable: !!f.searchable,
          })
        ),
      })
    );

    return NextResponse.json({ templates });
  } catch (error: unknown) {
    console.error("Templates fetch error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to fetch templates";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
