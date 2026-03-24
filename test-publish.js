/**
 * Standalone test script for the RightAnswers addToKb endpoint.
 * Run: node test-publish.js
 * 
 * This bypasses the Next.js app entirely and calls the API directly
 * to help debug authentication and payload formatting.
 */

const KB_AUTH_URL = "https://qa-develop.rightanswers.com/portal/api/rest/login";
const KB_BASE_URL = "https://qa-develop.rightanswers.com/portal/api/rest";
const KB_COMPANY_CODE = "na";
const KB_APP_INTERFACE = "sa";
const KB_USERNAME = "sauser";
const KB_PASSWORD = "Testing@123";

async function testPublish() {
  console.log("=== STEP 1: Authenticate ===");
  
  const basicAuth = Buffer.from(`${KB_USERNAME}:${KB_PASSWORD}`).toString("base64");
  const authParams = new URLSearchParams({
    companyCode: KB_COMPANY_CODE,
    appInterface: KB_APP_INTERFACE,
  });

  const authResponse = await fetch(`${KB_AUTH_URL}?${authParams.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
  });

  console.log("Auth status:", authResponse.status);

  if (!authResponse.ok) {
    console.error("Auth FAILED:", await authResponse.text());
    return;
  }

  let bearerToken = await authResponse.text();
  try {
    const parsed = JSON.parse(bearerToken);
    bearerToken = parsed.access_token || parsed.token || parsed.jwtoken || parsed.jwt || bearerToken;
  } catch { /* raw string */ }
  bearerToken = bearerToken.replace(/^"|"$/g, "");
  console.log("Bearer token obtained ✓ (length:", bearerToken.length, ")");

  // ===== STEP 2: Test addToKb =====
  console.log("\n=== STEP 2: Call addToKb ===");

  const title = "AI Test Article - VPN Fix";
  const templateName = "Error (Felipe)";
  const summary = title;

  // Fields matching the "Error (Felipe)" template
  const fields = [
    { fieldName: "Error", fieldValue: "VPN connection drops after 5 minutes of inactivity" },
    { fieldName: "Cause", fieldValue: "The VPN gateway is configured with a 5-minute idle timeout" },
    { fieldName: "Solution", fieldValue: "Increase the idle timeout to 30 minutes in the gateway settings" },
    { fieldName: "Details", fieldValue: "This affects Windows 10 and 11 clients using the built-in VPN client" },
  ];

  // Format A: displayFields as query parameter (key=value;key=value)
  const displayFieldsStr = fields
    .filter(f => f.fieldValue && f.fieldValue.trim() !== "")
    .map(f => `${f.fieldName}=${f.fieldValue}`)
    .join(";");

  console.log("Template:", templateName);
  console.log("Display Fields string:", displayFieldsStr);
  console.log("Display Fields length:", displayFieldsStr.length);

  const addParams = new URLSearchParams({
    companyCode: KB_COMPANY_CODE,
    appInterface: KB_APP_INTERFACE,
    title: title,
    templateName: templateName,
    summary: summary,
    language: "en",
    displayFields: displayFieldsStr,
  });

  const addUrl = `${KB_BASE_URL}/addToKb?${addParams.toString()}`;
  console.log("\nFull URL:", addUrl);

  console.log("\n--- Attempting with displayFields in query params ---");
  const response1 = await fetch(addUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: "application/json",
    },
  });

  console.log("Response status:", response1.status);
  const responseHeaders1 = Object.fromEntries(response1.headers.entries());
  console.log("Response content-type:", responseHeaders1["content-type"]);
  const body1 = await response1.text();
  console.log("Response body:", body1.substring(0, 500));

  // If that failed, try Format B: displayFields in the request body
  if (!response1.ok) {
    console.log("\n--- Attempting with displayFields in request BODY ---");
    const addParams2 = new URLSearchParams({
      companyCode: KB_COMPANY_CODE,
      appInterface: KB_APP_INTERFACE,
      title: title,
      templateName: templateName,
      summary: summary,
      language: "en",
    });
    const addUrl2 = `${KB_BASE_URL}/addToKb?${addParams2.toString()}`;

    const response2 = await fetch(addUrl2, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(displayFieldsStr),
    });

    console.log("Response status:", response2.status);
    const body2 = await response2.text();
    console.log("Response body:", body2.substring(0, 500));

    // Try Format C: send as plain text body
    if (!response2.ok) {
      console.log("\n--- Attempting with displayFields as plain text BODY ---");
      const response3 = await fetch(addUrl2, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          Accept: "application/json",
          "Content-Type": "text/plain",
        },
        body: displayFieldsStr,
      });

      console.log("Response status:", response3.status);
      const body3 = await response3.text();
      console.log("Response body:", body3.substring(0, 500));
    }
  }
}

testPublish().catch(console.error);
