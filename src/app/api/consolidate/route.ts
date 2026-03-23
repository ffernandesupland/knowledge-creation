import { NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_build",
});

export async function POST(req: Request) {
  try {
    const { sourceContent, draftResult, targetArticleIds } = await req.json();

    if (!draftResult || !targetArticleIds || !Array.isArray(targetArticleIds) || targetArticleIds.length === 0) {
      return NextResponse.json({ error: "Missing draftResult or targetArticleIds array" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY");
    }

    // 1. Fetch Existing Article from RightAnswers
    const authUrl = process.env.KB_AUTH_URL;
    const searchUrl = process.env.KB_SEARCH_URL;
    const solutionUrl = process.env.KB_SOLUTION_URL || (searchUrl ? searchUrl.replace('/search', '/solution') : '');
    const companyCode = process.env.KB_COMPANY_CODE;
    const username = process.env.KB_USERNAME;
    const password = process.env.KB_PASSWORD;

    if (!solutionUrl || !companyCode || !username || !password) {
      throw new Error("Missing KB Configuration to fetch existing article.");
    }

    const authParams = new URLSearchParams({
      companyCode: companyCode,
      appInterface: process.env.KB_APP_INTERFACE || "sa"
    });
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const authResponse = await fetch(`${authUrl}?${authParams.toString()}`, {
        headers: { "Authorization": `Basic ${basicAuth}`, "Accept": "application/json" }
    });

    if (!authResponse.ok) throw new Error("Auth failed fetching token.");
    
    let token = await authResponse.text();
    try { const authData = JSON.parse(token); token = authData.access_token || authData.token || authData.jwtoken || authData.jwt || token; } catch(e){}
    token = token.replace(/^"|"$/g, '');

    // Fetch all targeted existing articles concurrently
    const fetchPromises = targetArticleIds.map(async (id) => {
      const pathUrl = `${solutionUrl}/${id}?companyCode=${companyCode}&appInterface=${process.env.KB_APP_INTERFACE || "sa"}&verboseResult=true`;
      const response = await fetch(pathUrl, {
          headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
      });
      if (!response.ok) return `Failed to fetch ${id}`;
      const data = await response.json();
      return `--- Article ID: ${id} ---\n${JSON.stringify(data).substring(0, 2000)}\n`;
    });

    const articlesContentArray = await Promise.all(fetchPromises);
    const combinedExistingArticles = articlesContentArray.join("\n\n");

    // 2. Instruct OpenAI to Merge and Analyze Relationship
    const systemPromptBase = `You are an expert technical writer and Knowledge Broker.
Your task is to merge a newly drafted KB article with one or more EXISTING baseline KB articles.
Crucial Rule: You MUST keep all of the overall content, environment details, and solutions from BOTH the source and ALL provided existing articles. Do not lose historical context.
You must also verify if these articles are actually distinct enough that they should NOT be merged (needsSplit).

Always respond in strict JSON format matching this schema:
{
  "mergedDraft": {
    "title": "Merged Title",
    "problem": "Combined Environments and Problems",
    "cause": "Combined Causes",
    "resolution": "Combined Step-by-step resolution",
    "confidence": 0.95,
    "duplicateWarning": false,
    "duplicateArticleId": null,
    "isMultiTopic": false,
    "suggestedTopics": []
  },
  "needsSplit": false, 
  "splitReason": "", 
  "consolidationPlan": {
    "articlesToArchive": ["ID1", "ID2"],
    "articlesToCreate": ["Title of the new merged article"],
    "summarySteps": [
      "Step 1: Archive outdated articles X and Y",
      "Step 2: Merge their historical resolutions with the new VPN findings",
      "Step 3: Publish the new unified Master Article"
    ]
  }
}`;

    const userPrompt = `Existing KB Articles to Merge (${targetArticleIds.join(", ")}):
${combinedExistingArticles}

Newly Drafted Content based on User Source:
${JSON.stringify(draftResult)}

Original Raw Source Context:
${sourceContent ? sourceContent.substring(0, 1000) : "N/A"}`;

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-5.4",
      messages: [
        { role: "system", content: systemPromptBase },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const aiResultStr = completion.choices[0]?.message?.content;
    if (!aiResultStr) throw new Error("No response from AI during consolidation.");
    
    return NextResponse.json(JSON.parse(aiResultStr));

  } catch (error: unknown) {
    console.error("Consolidate API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to consolidate draft.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
