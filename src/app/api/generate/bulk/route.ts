import { NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_build",
});

export async function POST(req: Request) {
  try {
    const { content, topics, config } = await req.json();

    if (!content || !topics || !Array.isArray(topics)) {
      return NextResponse.json({ error: "Missing content or topics array" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY");
    }

    // Prepare pipeline configs
    let dynamicInstructions = "";
    if (config?.optKcs !== false) dynamicInstructions += "- You must act as a KCS Organization Agent. Format the article rigidly into Problem, Cause, and Resolution statements.\n";
    if (config?.optNeural) dynamicInstructions += "- You must act as a Neural Optimization Agent. Maximize semantic density and intent-alignment. Use highly descriptive terminology.\n";
    if (config?.optCustom) dynamicInstructions += "- You must apply Custom Organizational Editorial Rules. Keep the tone extremely professional and terse.\n";

    // We now perform deduplication per topic to ensure each split draft warns if duplicates exist
    const systemPromptBase = `You are an expert technical writer trained in Knowledge-Centered Service (KCS) methodology.
Your task is to take raw support notes and transform them into a standardized knowledge article.
${dynamicInstructions}
Force isMultiTopic to false.

You must also act as a Deduplication Agent.
We will provide you with "EXISTING KNOWLEDGE BASE CONTEXT" if any similar articles are found. 
If the user's topic matches or is functionally identical to one of the provided context articles, you must set "duplicateWarning" to true and provide the "duplicateArticleId".

Always respond in strict JSON format matching this schema:
{
  "title": "A clear, action-oriented title",
  "problem": "The environment and the problem described",
  "cause": "The root cause of the problem",
  "resolution": "Step-by-step resolution",
  "confidence": 0.95,
  "duplicateWarning": false,
  "duplicateArticleId": null,
  "isMultiTopic": false,
  "suggestedTopics": []
}`;

    // Generate in parallel for all topics
    const promises = topics.map(async (topic) => {
      let kbContext = "";
      let searchResults = [];

      // 1. Fetch Duplicate Context specifically for this topic
      try {
        const searchOrigin = req.url.split("/api/")[0];
        const searchRes = await fetch(`${searchOrigin}/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: topic }),
        });
        
        if (searchRes.ok) {
          searchResults = await searchRes.json();
          if (searchResults.length > 0) {
              kbContext = "\n\n--- EXISTING KNOWLEDGE BASE CONTEXT ---\n";
              searchResults.forEach((r: { article: { id: string; title: string; problem: string; resolution: string }; similarity: number }) => {
                  kbContext += `Article ID: ${r.article.id} | Title: ${r.article.title} | Similarity: ${(r.similarity * 100).toFixed(0)}%\n`;
                  kbContext += `Problem: ${r.article.problem}\n`;
                  kbContext += `Resolution: ${r.article.resolution}\n\n`;
              });
          }
        }
      } catch(e) { console.error("Search failed for topic:", topic, e) }

      // 2. Draft the Article with OpenAI
      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || "gpt-5.4",
        messages: [
          { role: "system", content: systemPromptBase },
          { role: "user", content: `[SYSTEM INSTRUCTION: Focus specifically on generating a KCS article exactly for this topic: "${topic}"]\n\nOriginal Content we were analyzing:\n${content}${kbContext}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const aiResultStr = completion.choices[0]?.message?.content;
      if (!aiResultStr) throw new Error("No response from AI for topic: " + topic);
      
      const parsed = JSON.parse(aiResultStr);
      parsed.searchContext = searchResults; // Attach found candidates to UI
      return parsed;
    });

    const results = await Promise.all(promises);

    return NextResponse.json(results);

  } catch (error: unknown) {
    console.error("Bulk Generation Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to bulk generate";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
