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

    // We use the manageSolution endpoint because it supports a native JSON body for fields,
    // which avoids all the string-parsing issues with HTML characters (= and ;) in addToKb.
    const baseUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "");
    
    // manageSolution requires keywords and collections for new solutions
    const addParams = new URLSearchParams({
      companyCode,
      appInterface,
      title,
      templateName,
      summary: summary || title,
      status: "draft",
      keywords: "ai-generated", // Default keywords
      collections: "custom_BulkEditTest" // Default collection (verified working in tests)
    });

    const addUrl = `${baseUrl}/manageSolution?${addParams.toString()}`;

    console.log("[Publish] Calling manageSolution:", addUrl.substring(0, 200) + "...");
    console.log("[Publish] Fields count:", fields.length);

    const addResponse = await fetch(addUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(fields),
      cache: "no-store",
    });

    const responseText = await addResponse.text();
    console.log("[Publish] Response status:", addResponse.status, responseText);

    if (!addResponse.ok) {
      return NextResponse.json(
        {
          error: `manageSolution failed (${addResponse.status})`,
          details: responseText,
        },
        { status: addResponse.status }
      );
    }

    // manageSolution returns a string like "Successfully created solution with ID: 260324101313947"
    const idMatch = responseText.match(/ID:\s*(\d+)/);
    const solutionId = idMatch ? idMatch[1] : responseText.trim();

    return NextResponse.json({
      success: true,
      message: "Solution published to Knowledge Base",
      solutionId: solutionId,
    });
  } catch (error: unknown) {
    console.error("Publish error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to publish to KB";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
