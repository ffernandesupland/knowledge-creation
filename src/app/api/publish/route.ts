import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, templateName, summary, fields } = body;

    // fields = [{ fieldName: "Error", fieldValue: "..." }, ...]

    if (!title || !templateName || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: "Missing required fields: title, templateName, fields[]" },
        { status: 400 }
      );
    }

    const companyCode = process.env.KB_COMPANY_CODE;
    const username = process.env.KB_USERNAME;
    const password = process.env.KB_PASSWORD;
    const appInterface = process.env.KB_APP_INTERFACE || "sa";

    if (!companyCode || !username || !password) {
      return NextResponse.json(
        { error: "Missing KB credentials in environment variables" },
        { status: 500 }
      );
    }

    const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

    const baseUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "");

    // RA's addToKb is very picky about the body format and separators.
    // Our test diagnostics confirmed that:
    // 1. URL parameters are the most reliable.
    // 2. The separator ";" in HTML attributes (like style="...") breaks RA's displayFields parser.
    // 3. Entity-encoding these separators (&#59; and &#61;) prevents the parser from breaking.

    const encodeRAValue = (val: string) => {
      if (!val) return "";
      // Replace '=' and ';' with HTML entities to avoid breaking the RA field parser
      return val.replace(/=/g, '&#61;').replace(/;/g, '&#59;');
    };

    // Build the displayFields string from the fields array
    const displayFieldsStr = fields
      .filter((f: any) => f.fieldValue && f.fieldValue.trim() !== "")
      .map((f: any) => `${f.fieldName}=${encodeRAValue(f.fieldValue)}`)
      .join(";");

    const addParams = new URLSearchParams({
      companyCode,
      appInterface,
      title,
      templateName,
      summary: summary || title,
      displayFields: displayFieldsStr
    });

    const addUrl = `${baseUrl}/addToKb?${addParams.toString()}`;

    console.log("[Publish] Calling addToKb (URL-only mode):", addUrl.substring(0, 200) + "...");
    console.log("[Publish] displayFields length:", displayFieldsStr.length);

    const addResponse = await fetch(addUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const responseText = await addResponse.text();
    console.log("[Publish] Response status:", addResponse.status, responseText);

    if (!addResponse.ok) {
      return NextResponse.json(
        {
          error: `addToKb failed (${addResponse.status})`,
          details: responseText,
        },
        { status: addResponse.status }
      );
    }

    // Check for the known error message
    if (responseText.includes("Could not create solution")) {
      return NextResponse.json(
        { error: "Could not create solution", details: responseText },
        { status: 422 }
      );
    }

    // The response is the solution ID (a string like "260324075044263")
    return NextResponse.json({
      success: true,
      message: "Solution published to Knowledge Base",
      solutionId: responseText.trim(),
    });
  } catch (error: unknown) {
    console.error("Publish error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to publish to KB";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
