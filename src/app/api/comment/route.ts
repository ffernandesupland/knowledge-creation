import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { solutionId, comment, commentTitle } = body;

    if (!solutionId || !comment) {
      return NextResponse.json(
        { error: "Missing required fields: solutionId, comment" },
        { status: 400 }
      );
    }

    const companyCode = process.env.KB_COMPANY_CODE;
    const username = process.env.KB_USERNAME;
    const password = process.env.KB_PASSWORD;
    const appInterface = process.env.KB_APP_INTERFACE || "sa";

    if (!companyCode || !username || !password) {
      return NextResponse.json(
        { error: "Missing KB credentials" },
        { status: 500 }
      );
    }

    const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");
    const baseUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "");

    const params = new URLSearchParams({
      companyCode,
      appInterface,
    });

    const commentUrl = `${baseUrl}/comments/${solutionId}?${params.toString()}`;

    console.log("[Comment] Posting to:", commentUrl);

    // The API expects application/x-www-form-urlencoded body
    const formBody = new URLSearchParams();
    formBody.set("comments", comment);
    if (commentTitle) formBody.set("commentTitle", commentTitle);
    formBody.set("parentID", "0"); // top-level comment
    formBody.set("hiddenFromSS", "false");

    const response = await fetch(commentUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
      cache: "no-store",
    });

    const responseText = await response.text();
    console.log("[Comment] Response:", response.status, responseText);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Comment API failed (${response.status})`, details: responseText },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Comment added to solution ${solutionId}`,
    });
  } catch (error: unknown) {
    console.error("Comment error:", error);
    const msg = error instanceof Error ? error.message : "Failed to add comment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
