const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const authUrl = process.env.KB_AUTH_URL;
const searchUrl = process.env.KB_SEARCH_URL;
const companyCode = process.env.KB_COMPANY_CODE;
const username = process.env.KB_USERNAME;
const password = process.env.KB_PASSWORD;

console.log("=======================================");
console.log("🧪 TESTING RIGHTANSWERS API CONNECTION ");
console.log("=======================================\n");

console.log(`Auth URL: ${authUrl}`);
console.log(`Search URL: ${searchUrl}`);
console.log(`Company Code: ${companyCode}`);
console.log(`User: ${username}`);
console.log(`Password is set: ${!!password}\n`);

async function testApi() {
  let token = null;

  try {
    console.log("--- 1. Testing Authentication ---");
    
    // Per Swagger Basic Auth requirements
    const authParams = new URLSearchParams({
      companyCode: companyCode,
      appInterface: process.env.KB_APP_INTERFACE || "sa"
    });

    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    
    console.log(`Testing GET to ${authUrl}?${authParams.toString()} using Basic Auth...`);
    
    const authResponse = await fetch(`${authUrl}?${authParams.toString()}`, {
      method: "GET", // Changing to GET as POST returned 500
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Accept": "application/json"
      }
    });

    console.log(`Auth Response Status: ${authResponse.status} ${authResponse.statusText}`);

    const authText = await authResponse.text();
    console.log(`Auth Response Body excerpt: ${authText.substring(0, 150)}...\n`);

    if (!authResponse.ok) {
        throw new Error(`Auth failed with status ${authResponse.status}`);
    }

    try {
      const authData = JSON.parse(authText);
      token = authData.access_token || authData.token || authData.jwt || authText;
    } catch(e) {
      token = authText; // pure string fallback
    }

    // clean quotes if any
    token = token.replace(/^"|"$/g, '');
    
    console.log("✅ Auth Successful! Token generated (First 10 chars):", token.substring(0, 10), "...");

  } catch (err) {
    console.error("❌ Authentication Step Failed:", err.message);
    return; // Stop if auth fails
  }

  try {
    console.log("\n--- 2. Testing Hybrid Search ---");
    
    const query = "how to connect to a vpn";
    const params = new URLSearchParams({
      companyCode: companyCode,
      appInterface: process.env.KB_APP_INTERFACE || "sa",
      searchType: "Hybrid",
      queryText: query,
      page: "1",
      loggingEnabled: "false",
      verboseResult: "true"
    });

    console.log(`Testing GET to ${searchUrl}?${params.toString()}...`);
    
    const searchResponse = await fetch(`${searchUrl}?${params.toString()}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    });

    console.log(`Search Response Status: ${searchResponse.status} ${searchResponse.statusText}`);

    const searchData = await searchResponse.json();
    
    if (!searchResponse.ok) {
        throw new Error(`Search failed with status ${searchResponse.status}`);
    }

    console.log(`✅ Search Successful! Found ${searchData.totalHits || searchData.solutions?.length || 0} results.`);
    if (searchData.solutions && searchData.solutions.length > 0) {
        console.log(`Top result title: "${searchData.solutions[0].title}"`);
        console.log(`Top result score: ${searchData.solutions[0].score}`);
    } else {
        console.log("Response body:", JSON.stringify(searchData).substring(0, 200) + "...");
    }

  } catch (err) {
    console.error("❌ Search Step Failed:", err.message);
  }
}

testApi();
