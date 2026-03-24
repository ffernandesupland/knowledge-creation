const fs = require('fs');
const dotenv = require('dotenv');

const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const authUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "/login");
const solutionUrl = (process.env.KB_SEARCH_URL || "").replace("/search", "/solution");
const companyCode = process.env.KB_COMPANY_CODE;
const username = process.env.KB_USERNAME;
const password = process.env.KB_PASSWORD;

async function run() {
    const solutionId = process.argv[2];
    if (!solutionId) { console.error("Usage: node test-ra-solution.js <ID>"); return; }

    try {
        const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
        const authResponse = await fetch(`${authUrl}?companyCode=${companyCode}&appInterface=sa`, {
            headers: { "Authorization": `Basic ${basicAuth}`, "Accept": "application/json" }
        });
        let token = await authResponse.text();
        token = token.replace(/^"|"$/g, '');

        const pathUrl = `${solutionUrl}/${solutionId}?companyCode=${companyCode}&appInterface=sa&verboseResult=true`;
        const solutionResponse = await fetch(pathUrl, {
            headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
        });
        const data = await solutionResponse.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}
run();
