require('dotenv').config({ path: '.env' });
// Using native fetch (Node 18+)


const baseUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "");
const companyCode = process.env.KB_COMPANY_CODE;
const username = process.env.KB_USERNAME;
const password = process.env.KB_PASSWORD;
const appInterface = process.env.KB_APP_INTERFACE || "sa";

if (!baseUrl || !companyCode || !username || !password) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

const testTitle = "Debug Publish " + new Date().getTime();
const testTemplate = "Clover How To"; // Based on user's first successful-looking logs
const testContent = `<p>This is a debug article with snippets.</p>
<p><span class="ra-content-note-1 mceNonEditable ra-content-att" style="color: #468847;"><span><img class="ra-att-img" src="/solutionmanager/resources/images/content_note.gif" alt="" width="18px" height="17px" />Note</span></span></p>`;

// Helper to escape = and ; for RA displayFields parser
function escapeRA(val) {
  if (!val) return "";
  return val.replace(/=/g, '&#61;').replace(/;/g, '&#59;');
}

// Use the escapeRA helper for entity encoding
const displayFieldsStr = `Instructions=${escapeRA(testContent)};Related Articles=${escapeRA("Test related links")}`;

async function runTest(name, config) {
  console.log(`\n--- Testing: ${name} ---`);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json",
        ...config.headers
      },
      body: config.body,
    });

    const status = response.status;
    const text = await response.text();
    console.log(`Status: ${status}`);
    console.log(`Response: ${text.substring(0, 500)}`);
    return status === 200 || status === 201;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return false;
  }
}

async function main() {
  const scenarios = [
    {
      name: "URL Params Only (Small)",
      url: `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}&title=${encodeURIComponent(testTitle)}&templateName=${encodeURIComponent(testTemplate)}&summary=${encodeURIComponent(testTitle)}&displayFields=${encodeURIComponent(displayFieldsStr)}`,
      headers: {},
      body: undefined
    },
    {
      name: "Form Encoded Body (application/x-www-form-urlencoded)",
      url: `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        title: testTitle,
        templateName: testTemplate,
        summary: testTitle,
        displayFields: displayFieldsStr
      }).toString()
    },
    {
       name: "URL Params - Minimal (No Fields)",
       url: `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}&title=${encodeURIComponent(testTitle + " (Minimal)")}&templateName=${encodeURIComponent(testTemplate)}&summary=${encodeURIComponent(testTitle)}`,
       headers: {},
       body: undefined
    },
    {
       name: "URL Params - Direct Fields (No displayFields)",
       url: `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}&title=${encodeURIComponent(testTitle + " (Direct)")}&templateName=${encodeURIComponent(testTemplate)}&summary=${encodeURIComponent(testTitle)}&SYMPTOMS=${encodeURIComponent(testContent)}&RESOLUTION=${encodeURIComponent("Direct resolution text")}`,
       headers: {},
       body: undefined
    },
    {
       name: "URL Params - Encoded Values in displayFields",
       url: `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}&title=${encodeURIComponent(testTitle + " (Encoded Val)")}&templateName=${encodeURIComponent(testTemplate)}&summary=${encodeURIComponent(testTitle)}&displayFields=SYMPTOMS=${encodeURIComponent(testContent)};RESOLUTION=${encodeURIComponent("Encoded value resolution")}`,
       headers: {},
       body: undefined
    },
    {
       name: "URL Params - Pipe Separator in displayFields",
       url: `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}&title=${encodeURIComponent(testTitle + " (Pipe)")}&templateName=${encodeURIComponent(testTemplate)}&summary=${encodeURIComponent(testTitle)}&displayFields=Instructions=${encodeURIComponent(testContent).replace(/%3D/g, '=')}`.replace(/;/g, '|'),
       headers: {},
       body: undefined
    },
    {
       name: "JSON Body - Encoded Values",
       url: `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}`,
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         title: testTitle + " (Encoded)",
         templateName: testTemplate,
         summary: testTitle,
         displayFields: `Error Message=${encodeURIComponent(testContent)};Solution=${encodeURIComponent("Test resolution")}`
       })
    },
    {
       name: "JSON Body - Plain Text (No HTML)",
       url: `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}`,
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         title: testTitle + " (Plain)",
         templateName: testTemplate,
         summary: testTitle,
         displayFields: `Error Message=No HTML here;Solution=Simple text only`
       })
    }
  ];

  for (const scenario of scenarios) {
    await runTest(scenario.name, scenario);
  }
}

main();
