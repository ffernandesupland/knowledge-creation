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

async function run() {
    console.log("=======================================");
    console.log("🧪 TESTING RIGHTANSWERS SEARCH API ");
    console.log("=======================================\n");

    try {
        const authParams = new URLSearchParams({
            companyCode: companyCode,
            appInterface: process.env.KB_APP_INTERFACE || "sa"
        });
        const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
        
        console.log(`1. Authenticating at ${authUrl}...`);
        const authResponse = await fetch(`${authUrl}?${authParams.toString()}`, {
            headers: { "Authorization": `Basic ${basicAuth}`, "Accept": "application/json" }
        });

        if (!authResponse.ok) throw new Error(`Auth failed: ${authResponse.status} ${await authResponse.text()}`);
        let token = await authResponse.text();
        try { const authData = JSON.parse(token); token = authData.access_token || authData.token || authData.jwtoken || authData.jwt || token; } catch(e){}
        token = token.replace(/^"|"$/g, '');
        console.log("✅ Auth Successful.\n");

        const query = process.argv[2] || "vpn";
        console.log(`2. Querying Search API at ${searchUrl} for "${query}"...`);
        const params = new URLSearchParams({
            companyCode: companyCode,
            appInterface: process.env.KB_APP_INTERFACE || "sa",
            searchType: "Hybrid",
            queryText: query,
            page: "1",
            loggingEnabled: "false",
            verboseResult: "true"
        });

        const searchResponse = await fetch(`${searchUrl}?${params.toString()}`, {
            headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
        });

        if (!searchResponse.ok) throw new Error(`Search failed: ${searchResponse.status} ${await searchResponse.text()}`);
        const data = await searchResponse.json();
        const results = data.solutions || [];
        console.log(`✅ Search Successful. Found ${results.length} results.\n`);
        
        if (results.length > 0) {
            console.log(`Top result: ${results[0].title} (ID: ${results[0].id || results[0].templateSolutionID})`);
            console.log(`Score: ${results[0].score}`);
            console.log(`URL: ${results[0].url || 'N/A'}`);
        } else {
            console.log(data);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

run();
