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
    const authUrl = process.env.KB_AUTH_URL;
    const appInterface = process.env.KB_APP_INTERFACE || "sa";

    if (!companyCode || !username || !password || !authUrl) {
      return NextResponse.json(
        { error: "Missing KB credentials in environment variables" },
        { status: 500 }
      );
    }

    // 1. Authenticate to get Bearer Token
    const authParams = new URLSearchParams({
      companyCode,
      appInterface,
    });
    const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

    const authResponse = await fetch(
      `${authUrl}?${authParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!authResponse.ok) {
      const text = await authResponse.text();
      console.error("Auth failed for publish:", authResponse.status, text);
      return NextResponse.json(
        { error: `Authentication failed (${authResponse.status})` },
        { status: 502 }
      );
    }

    let bearerToken = await authResponse.text();
    try {
      const parsed = JSON.parse(bearerToken);
      bearerToken =
        parsed.access_token ||
        parsed.token ||
        parsed.jwtoken ||
        parsed.jwt ||
        bearerToken;
    } catch {
      // raw string token
    }
    bearerToken = bearerToken.replace(/^"|"$/g, "");

    // 2. Build the displayFields string from the fields array
    // Format: "FieldName1=value1;FieldName2=value2;"
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

    // 3. Call addToKb
    const baseUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "");
    const addParams = new URLSearchParams({
      companyCode,
      appInterface,
      title,
      templateName,
      summary: summary || title,
      language: "en",
    });

    // If the displayFields string is small enough, pass as query param
    // Otherwise use the request body as payload (per API docs: > 2048 chars)
    const useBody = displayFieldsStr.length > 1500;

    if (!useBody) {
      addParams.set("displayFields", displayFieldsStr);
    }

    const addUrl = `${baseUrl}/addToKb?${addParams.toString()}`;

    console.log("[Publish] Calling addToKb:", addUrl);
    console.log("[Publish] Display fields length:", displayFieldsStr.length);

    const addResponse = await fetch(addUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: "application/json",
        ...(useBody
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: useBody ? JSON.stringify(displayFieldsStr) : undefined,
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

    // Parse the response — it typically returns the new solution ID
    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { rawResponse: responseText };
    }

    return NextResponse.json({
      success: true,
      message: "Solution published to Knowledge Base",
      ...result,
    });
  } catch (error: unknown) {
    console.error("Publish error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to publish to KB";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
