const fs = require('fs');
const dotenv = require('dotenv');

const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const authUrl = process.env.KB_AUTH_URL;
const searchUrl = process.env.KB_SEARCH_URL;
// Infer solution URL if not provided (assume endpoint ends in /solution)
const solutionUrl = process.env.KB_SOLUTION_URL || (searchUrl ? searchUrl.replace('/search', '/solution') : '');
const companyCode = process.env.KB_COMPANY_CODE;
const username = process.env.KB_USERNAME;
const password = process.env.KB_PASSWORD;

async function run() {
    console.log("=======================================");
    console.log("🧪 TESTING RIGHTANSWERS SOLUTION API ");
    console.log("=======================================\n");

    if (!solutionUrl) {
        console.error("❌ KB_SOLUTION_URL is not defined and could not be inferred.");
        return;
    }

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

        const solutionId = process.argv[2] || "12345"; // Pass argument or use dummy
        console.log(`2. Querying Solution API for ID: ${solutionId}...`);
        
        // RightAnswers usually accepts solutionId as a parameter:
        const params = new URLSearchParams({
            companyCode: companyCode,
            appInterface: process.env.KB_APP_INTERFACE || "sa",
            solutionId: solutionId,
            verboseResult: "true"
        });

        const reqUrl = `${solutionUrl}?${params.toString()}`;
        console.log(`   Trying GET: ${reqUrl}`);
        const solutionResponse = await fetch(reqUrl, {
            headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
        });

        if (!solutionResponse.ok) {
            console.log(`❌ Failed with query params (${solutionResponse.status}). Trying path param approach...`);
            
            const pathUrl = `${solutionUrl}/${solutionId}?companyCode=${companyCode}&appInterface=${process.env.KB_APP_INTERFACE || "sa"}&verboseResult=true`;
            console.log(`   Trying GET: ${pathUrl}`);
            const solutionResponse2 = await fetch(pathUrl, {
                headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
            });

            if (!solutionResponse2.ok) throw new Error(`Solution fetch failed: ${solutionResponse2.status} ${await solutionResponse2.text()}`);
            const data = await solutionResponse2.json();
            console.log(`✅ Solution Retrieval Successful!\n`);
            console.log(JSON.stringify(data, null, 2));
            return;
        }

        const data = await solutionResponse.json();
        console.log(`✅ Solution Retrieval Successful!\n`);
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

run();
