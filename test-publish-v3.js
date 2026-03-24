/**
 * Minimal test to isolate what's failing in addToKb.
 * Run: node test-publish-v3.js
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

async function test(label, params, body, contentType) {
  console.log(`\n===== ${label} =====`);
  const url = `${KB_BASE_URL}/addToKb?${params}`;
  console.log("URL:", url.length > 200 ? url.substring(0, 200) + "..." : url);
  if (body) console.log("Body:", typeof body === "string" ? body.substring(0, 200) : JSON.stringify(body).substring(0, 200));

  const headers = { Authorization: `Bearer ${await getToken()}`, Accept: "application/json" };
  if (contentType) headers["Content-Type"] = contentType;

  const res = await fetch(url, { method: "POST", headers, body: body || undefined });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text.substring(0, 500));
  return text;
}

async function main() {
  // T1: absolute minimum — just title + template, no fields
  console.log("\n============ ABSOLUTE MINIMAL TESTS ============");
  
  const p1 = new URLSearchParams({
    companyCode: KB_COMPANY_CODE,
    appInterface: KB_APP_INTERFACE,
    title: "Test Minimal",
    templateName: "Forum",
    summary: "Test Minimal",
    language: "en",
  });
  await test("T1: Forum template (simplest — 1 field), no displayFields", p1);

  // T2: Forum with its one field
  const p2 = new URLSearchParams({
    companyCode: KB_COMPANY_CODE,
    appInterface: KB_APP_INTERFACE,
    title: "Test Forum Field",
    templateName: "Forum",
    summary: "Test Forum Field",
    language: "en",
    displayFields: "Details=This is the detail content",
  });
  await test("T2: Forum template with Details field", p2);

  // T3: Try without language param
  const p3 = new URLSearchParams({
    companyCode: KB_COMPANY_CODE,
    appInterface: KB_APP_INTERFACE,
    title: "Test No Lang",
    templateName: "Forum",
    summary: "Test No Lang",
    displayFields: "Details=No language param test",
  });
  await test("T3: Forum template without language param", p3);

  // T4: Try the exact curl format — construct URL manually
  const manualUrl4 = `${KB_BASE_URL}/addToKb?companyCode=${KB_COMPANY_CODE}&appInterface=${KB_APP_INTERFACE}&title=ManualTest&templateName=Forum&summary=ManualTest&displayFields=Details=Manual+test+content`;
  console.log(`\n===== T4: Manually constructed URL (no URLSearchParams) =====`);
  const token = await getToken();
  const res4 = await fetch(manualUrl4, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  console.log("Status:", res4.status);
  console.log("Response:", (await res4.text()).substring(0, 500));

  // T5: Try with Basic Auth instead of Bearer
  const basicAuth = Buffer.from(`${KB_USERNAME}:${KB_PASSWORD}`).toString("base64");
  const p5 = new URLSearchParams({
    companyCode: KB_COMPANY_CODE,
    appInterface: KB_APP_INTERFACE,
    title: "Test Basic Auth",
    templateName: "Forum",
    summary: "Test Basic Auth",
    displayFields: "Details=Basic auth test",
  });
  console.log(`\n===== T5: Using Basic Auth instead of Bearer =====`);
  const res5 = await fetch(`${KB_BASE_URL}/addToKb?${p5}`, {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth}`, Accept: "application/json" },
  });
  console.log("Status:", res5.status);
  console.log("Response:", (await res5.text()).substring(0, 500));
}

main().catch(console.error);
