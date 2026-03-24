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

    // Build the displayFields string from the fields array
    // Format: "FieldName1=value1;FieldName2=value2"
    const displayFieldsStr = fields
      .filter(
        (f: { fieldName: string; fieldValue: string }) =>
          f.fieldValue && f.fieldValue.trim() !== ""
      )
      .map(
        (f: { fieldName: string; fieldValue: string }) =>
          `${f.fieldName}=${f.fieldValue}`
      )
      .join(";");

    // Call addToKb — using Basic Auth directly (works more reliably)
    // NOTE: do NOT pass "language" param — it causes addToKb to fail
    const baseUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "");

    // RA's addToKb is very picky about the body format.
    // If displayFields is large, it MUST be passed as a form parameter in the body.
    const useBody = displayFieldsStr.length > 500;

    const addParams = new URLSearchParams({
      companyCode,
      appInterface,
      title,
      templateName,
      summary: summary || title,
    });

    if (!useBody) {
      addParams.set("displayFields", displayFieldsStr);
    }

    const addUrl = `${baseUrl}/addToKb?${addParams.toString()}`;
    
    // For large payloads, we put displayFields in the POST body as multipart/form-data
    let postBody: any = undefined;
    if (useBody) {
      const formData = new FormData();
      formData.append("displayFields", displayFieldsStr);
      postBody = formData;
    }

    console.log("[Publish] Calling addToKb:", addUrl);
    console.log("[Publish] Display fields length:", displayFieldsStr.length);

    const addResponse = await fetch(addUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json",
        // Content-Type is automatically set to multipart/form-data with boundary by the fetch API when passed a FormData object
      },
      body: postBody,
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
