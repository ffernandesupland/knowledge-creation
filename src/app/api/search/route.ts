import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { topic, searchQuery } = await req.json();

    if (!searchQuery && !topic) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const apiUrl = process.env.KB_SEARCH_URL;
    const companyCode = process.env.KB_COMPANY_CODE;
    const authUrl = process.env.KB_AUTH_URL;
    const username = process.env.KB_USERNAME;
    const password = process.env.KB_PASSWORD;

    if (!apiUrl || !companyCode || !authUrl || !username || !password) {
      console.warn("Functional KB integration environment variables missing. Falling back to mock data.");
      // Fallback just so the UI doesn't crash if the user hasn't set up the .env yet
      return NextResponse.json([
        { 
          article: { id: "KB-MOCK-1", title: "Needs .env vars", problem: "Missing KB_SEARCH_URL", resolution: "Add KB_BEARER_TOKEN to .env to see real results." },
          similarity: 0.95 
        }
      ]);
    }

    // First: Fetch the dynamic Bearer Token using Basic Authentication
    const authParams = new URLSearchParams({
      companyCode: companyCode,
      appInterface: process.env.KB_APP_INTERFACE || "sa"
    });

    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

    const authResponse = await fetch(`${authUrl}?${authParams.toString()}`, {
      method: "GET", 
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Node.js)"
      },
      cache: "no-store"
    });

    if (!authResponse.ok) {
       console.error("Auth API failed:", authResponse.status, await authResponse.text());
       throw new Error(`Auth failed with status ${authResponse.status}`);
    }

    // A RightAnswers ou devolve a string crua ou um JSON
    const textData = await authResponse.text();
    let bearerToken = textData;
    try {
      const authData = JSON.parse(textData);
      bearerToken = authData.jwtoken || authData.access_token || authData.token || authData.jwt || textData;
    } catch {
      // Ignora, significa que retornou uma string pura
    }

    // Remove aspas caso a string pura tenha vindo parseada do JSON e serializada
    bearerToken = bearerToken.replace(/^"|"$/g, '');

    if (!bearerToken) {
       throw new Error("Auth endpoint did not return a valid token");
    }

    // Second: Build the query string for the functional Search Endpoint
    const params = new URLSearchParams({
      companyCode: companyCode,
      appInterface: process.env.KB_APP_INTERFACE || "sa",
      searchType: "Hybrid",
      queryText: searchQuery || topic,
      page: "1",
      loggingEnabled: "false", // Do not pollute analytics with AI background searches
      verboseResult: "true"    // Required to get the Fields array
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Node.js)'
      },
      cache: "no-store"
    });

    if (!response.ok) {
       console.error("KB Search API returned a non-ok status:", response.status, await response.text());
       throw new Error(`KB Search failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Map the functional response to the format our UI and AI Generation agent expects
    // The agent expects: { article: { id, title, problem, resolution }, similarity }
    const rawResults = (data.solutions || []).map((sol: Record<string, unknown>) => {
      // Extract specific fields if they exist in verboseSolutionResult.fields
      let problem = sol.summary as string || "";
      let resolution = "";
      
      const fields = (sol.verboseSolutionResult as { fields?: { name: string; content: string }[] })?.fields || [];
      const problemField = fields.find((f: { name: string; content: string }) => f.name.toLowerCase().includes("problem") || f.name.toLowerCase().includes("symptom"));
      const resolutionField = fields.find((f: { name: string; content: string }) => f.name.toLowerCase().includes("resolution") || f.name.toLowerCase().includes("solution"));
      
      if (problemField) problem = problemField.content;
      if (resolutionField) resolution = resolutionField.content;

      console.log(`[DEBUG] Raw score from RightAnswers for "${sol.title}":`, sol.score);
      
      let normalizedScore = 0;
      if (typeof sol.score === "number") {
         if (sol.score > 2) {
             // Score is likely out of 100 or higher
             normalizedScore = sol.score / 100;
         } else {
             // Score is 0.0 to 1.0 (or up to 2.0 occasionally in lucene)
             normalizedScore = sol.score;
         }
      } else {
         normalizedScore = 0.50; // default medium if missing
      }

      // Cap at 0.99 for UI visuals
      const similarity = Math.min(normalizedScore, 0.99);
      console.log(`[DEBUG] Normalized similarity computed:`, similarity);

      return {
        article: {
          id: sol.id || sol.templateSolutionID,
          title: sol.title,
          problem: problem.replace(/(<([^>]+)>)/gi, "").substring(0, 300), // strip HTML just in case
          resolution: resolution.replace(/(<([^>]+)>)/gi, "").substring(0, 300)
        },
        similarity: similarity
      };
    });

    // Take top 5 from RightAnswers to evaluate semantically with AI
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidatesForAI = rawResults.slice(0, 5) as any[];

    if (candidatesForAI.length === 0 || !process.env.OPENAI_API_KEY) {
        // Fallback to basic if no results or no AI key
        const fallbackResults = rawResults.filter((res: { similarity: number }) => res.similarity >= 0.30).slice(0, 3);
        return NextResponse.json(fallbackResults);
    }

    // Step 3: Use LLM for actual Semantic Similarity Detection
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log(`[DEBUG] Calling OpenAI for Semantic Similarity on Topic: ${topic}`);
    const completion = await openai.chat.completions.create({
       model: "gpt-4o-mini",
       messages: [
         { role: "system", content: "You are an expert deduplication AI. Given a Target Topic and a list of Candidate KB Articles, score each candidate's semantic similarity to the Target Topic from 0 to 100 based on whether they describe and resolve the EXACT same issue. If it is only tangentially related, give a low score (< 40). If it is a duplicate or subset covering the identical problem, give a high score (> 70). ALWAYS return a JSON object with a 'scores' array." },
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         { role: "user", content: `Target Topic: ${topic}\n\nCandidates:\n${JSON.stringify(candidatesForAI.map((r: any) => ({ id: r.article.id, title: r.article.title, problem: r.article.problem })))}\n\nReturn the JSON array of scores matching this schema: { "scores": [ { "id": "...", "similarity": 85 } ] }` }
       ],
       response_format: { type: "json_object" },
       temperature: 0.1
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let aiScores: any[] = [];
    try {
      const content = completion.choices[0].message.content;
      if (content) aiScores = JSON.parse(content).scores || [];
    } catch (e) {
      console.error("[DEBUG] Failed to parse LLM scores", e);
    }
    
    console.log("[DEBUG] LLM Semantic Scores:", aiScores);

    // Merge LLM scores back into results and filter strictly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalResults = candidatesForAI.map((r: any) => {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const aiScore = aiScores.find((s: any) => s.id === r.article.id);
       // If AI scored it, use AI score (normalized to 0-1), else fallback
       const finalSimilarity = aiScore ? (aiScore.similarity / 100) : r.similarity;
       return { ...r, similarity: finalSimilarity };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).filter((r: any) => r.similarity >= 0.50) // Strict 50% semantic threshold
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 3);

    return NextResponse.json(finalResults);

  } catch (error: unknown) {
    console.error("Search Error:", error);
    return NextResponse.json(
      { error: "Failed to query the authoritative knowledge base" },
      { status: 500 }
    );
  }
}
