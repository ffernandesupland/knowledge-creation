/**
 * Advanced test script for addToKb — tries multiple payload strategies.
 * Run: node test-publish-v2.js
 */

const KB_AUTH_URL = "https://qa-develop.rightanswers.com/portal/api/rest/login";
const KB_BASE_URL = "https://qa-develop.rightanswers.com/portal/api/rest";
const KB_COMPANY_CODE = "na";
const KB_APP_INTERFACE = "sa";
const KB_USERNAME = "sauser";
const KB_PASSWORD = "Testing@123";

async function getToken() {
  const basicAuth = Buffer.from(`${KB_USERNAME}:${KB_PASSWORD}`).toString("base64");
  const authParams = new URLSearchParams({ companyCode: KB_COMPANY_CODE, appInterface: KB_APP_INTERFACE });
  const resp = await fetch(`${KB_AUTH_URL}?${authParams}`, {
    headers: { Authorization: `Basic ${basicAuth}`, Accept: "application/json" },
  });
  let token = await resp.text();
  try { const p = JSON.parse(token); token = p.access_token || p.token || p.jwtoken || p.jwt || token; } catch {}
  return token.replace(/^"|"$/g, "");
}

async function testVariant(label, url, options) {
  console.log(`\n===== ${label} =====`);
  console.log("URL:", url.substring(0, 200) + "...");
  try {
    const res = await fetch(url, options);
    console.log("Status:", res.status);
    const contentType = res.headers.get("content-type");
    console.log("Content-Type:", contentType);
    const body = await res.text();
    console.log("Body:", body.substring(0, 500));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

async function main() {
  const token = await getToken();
  console.log("Token obtained ✓");

  const title = "AI Test Publish Debug";
  const templateName = "Error (Felipe)";

  const displayFieldsStr = "Error=VPN timeout error;Cause=Gateway idle timeout;Solution=Increase timeout to 30min";

  // ---- VARIANT 1: displayFields in query param via URLSearchParams ----
  const params1 = new URLSearchParams({
    companyCode: KB_COMPANY_CODE,
    appInterface: KB_APP_INTERFACE,
    title: title,
    templateName: templateName,
    summary: title,
    language: "en",
    displayFields: displayFieldsStr,
  });
  await testVariant(
    "V1: displayFields in URLSearchParams (auto-encoded)",
    `${KB_BASE_URL}/addToKb?${params1}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );

  // ---- VARIANT 2: displayFields manually appended (no double encoding) ----
  const params2base = new URLSearchParams({
    companyCode: KB_COMPANY_CODE,
    appInterface: KB_APP_INTERFACE,
    title: title,
    templateName: templateName,
    summary: title,
    language: "en",
  });
  const manualUrl = `${KB_BASE_URL}/addToKb?${params2base}&displayFields=${displayFieldsStr}`;
  await testVariant(
    "V2: displayFields manually appended (no encoding of = and ;)",
    manualUrl,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );

  // ---- VARIANT 3: displayFields in body as plain text ----
  await testVariant(
    "V3: displayFields in body as text/plain",
    `${KB_BASE_URL}/addToKb?${params2base}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "text/plain" },
      body: displayFieldsStr,
    }
  );

  // ---- VARIANT 4: displayFields in body as JSON string ----
  await testVariant(
    "V4: displayFields in body as application/json (stringified)",
    `${KB_BASE_URL}/addToKb?${params2base}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(displayFieldsStr),
    }
  );

  // ---- VARIANT 5: Using a simpler template with fewer fields ----
  const simpleParams = new URLSearchParams({
    companyCode: KB_COMPANY_CODE,
    appInterface: KB_APP_INTERFACE,
    title: "AI Simple Test",
    templateName: "Error (RA)",  // standard built-in template
    summary: "AI Simple Test",
    language: "en",
    displayFields: "Error Message=Test error;Cause=Test cause;Solution=Test solution",
  });
  await testVariant(
    "V5: Standard 'Error (RA)' template with simple fields",
    `${KB_BASE_URL}/addToKb?${simpleParams}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );

  // ---- VARIANT 6: Template info first, exclude displayFields from URL, pass in body ----
  const params6 = new URLSearchParams({
    companyCode: KB_COMPANY_CODE,
    appInterface: KB_APP_INTERFACE,
    title: "AI Body Fields Test",
    templateName: "Error (RA)",
    summary: "AI Body Fields Test",
    language: "en",
  });
  await testVariant(
    "V6: 'Error (RA)' template, displayFields as plain text body",
    `${KB_BASE_URL}/addToKb?${params6}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "text/plain" },
      body: "Error Message=Test error;Cause=Test cause;Solution=Test solution",
    }
  );
}

main().catch(console.error);
