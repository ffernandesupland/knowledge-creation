require('dotenv').config({ path: '.env' });

const baseUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "");
const companyCode = process.env.KB_COMPANY_CODE;
const username = process.env.KB_USERNAME;
const password = process.env.KB_PASSWORD;
const appInterface = process.env.KB_APP_INTERFACE || "sa";

const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

const testTitle = "Debug Publish " + new Date().getTime();
const testTemplate = "Error (RA)"; 
const testContent = `<p>Style="color:red"</p>`;

function escapeRA(val) {
  if (!val) return "";
  // Escape = with a semicolon-less entity, and remove ; from HTML
  return val.replace(/=/g, '&#61').replace(/;/g, '');
}

async function runTest(name, url) {
  console.log(`\n--- Testing: ${name} ---`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json"
      }
    });
    const status = response.status;
    const text = await response.text();
    console.log(`Status: ${status}`);
    console.log(`Response summary: ${text.substring(0, 100)}`);
    return status === 200;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return false;
  }
}

async function main() {
  // Scenario 1: Solution field in Error (RA)
  const df1 = `Solution=Test Solution`;
  const url1 = `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}&title=${encodeURIComponent(testTitle + " 1")}&templateName=${encodeURIComponent(testTemplate)}&displayFields=${encodeURIComponent(df1)}`;

  // Scenario 2: displayFields with '#' (Encoded)
  const df2 = `Instructions=Test # Hash`;
  const url2 = `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}&title=${encodeURIComponent(testTitle + " 2")}&templateName=${encodeURIComponent(testTemplate)}&displayFields=${encodeURIComponent(df2)}`;

  // Scenario 3: Multiple fields, plain text
  const df3 = `Instructions=Test Instructions;Related Articles=Test Related`;
  const url3 = `${baseUrl}/addToKb?companyCode=${companyCode}&appInterface=${appInterface}&title=${encodeURIComponent(testTitle + " 3")}&templateName=${encodeURIComponent(testTemplate)}&displayFields=${encodeURIComponent(df3)}`;

  await runTest("Fully Encoded Param Value", url1);
  await runTest("Literal = in URL", url2);
  await runTest("Multiple Fields Plain Text", url3);
}

main();
