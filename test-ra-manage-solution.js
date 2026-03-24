require('dotenv').config({ path: '.env' });

const baseUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "");
const companyCode = process.env.KB_COMPANY_CODE;
const username = process.env.KB_USERNAME;
const password = process.env.KB_PASSWORD;
const appInterface = process.env.KB_APP_INTERFACE || "sa";

const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

const testTitle = "Manage Solution Test " + new Date().getTime();
const testTemplate = "Error (RA)"; 
const testContent = `<p>Test content with style="color:red;" and semicolon;</p>
<ul><li>One</li><li>Two</li></ul>`;

const fields = [
  { fieldName: "Solution", fieldValue: testContent }
];

async function runTest() {
  const urlParams = new URLSearchParams({
    companyCode,
    appInterface,
    title: testTitle,
    templateName: testTemplate,
    summary: testTitle,
    status: "draft",
    keywords: "debug test manageSolution",
    collections: "custom_BulkEditTest"
  });

  const url = `${baseUrl}/manageSolution?${urlParams.toString()}`;
  console.log(`\n--- Testing manageSolution: ${url.substring(0, 150)}... ---`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(fields)
    });

    const status = response.status;
    const text = await response.text();
    console.log(`Status: ${status}`);
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

runTest();
