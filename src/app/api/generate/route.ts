import { NextResponse } from "next/server";
import OpenAI from "openai";
import { AGENTS } from "@/lib/agents";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_build",
});

export async function POST(req: Request) {
  try {
    const { content, config } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Fallback default configs if older client
    const pipeline = config || {
      enableKbSearch: true,
      optSplitTopics: true,
      optNeural: false,
      optKcs: true,
      optCustom: false
    };

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        title: "Mocked AI Response - Missing API Key",
        problem: "You need to set the OPENAI_API_KEY in your .env.local file.",
        cause: "The server could not authenticate with OpenAI.",
        resolution: "1. Create a .env.local file in the root directory.\n2. Add OPENAI_API_KEY=your_key_here.\n3. Restart the server.",
        confidence: 1.0,
        duplicateWarning: false,
        duplicateArticleId: null,
        isMultiTopic: false,
        suggestedTopics: [],
        searchContext: []
      });
    }

    // No RightAnswers search here! Triage must be instantaneous.
    // The Dashboard will perform the per-topic search after triage.
    
    const triageAgent = AGENTS.find(a => a.id === "triage")!;
    const systemPrompt = `${triageAgent.systemPrompt}\n\n${pipeline.optSplitTopics ? "Be aggressive in splitting distinct issues." : "Do NOT split topics unless absolutely necessary."}`;

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-5.4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const aiResultStr = completion.choices[0]?.message?.content;
    if (!aiResultStr) throw new Error("No response from AI");

    const parsedResult = JSON.parse(aiResultStr);
    
    // Enforce the schema if the AI hallucinates
    if (!parsedResult.topics || !Array.isArray(parsedResult.topics)) {
        parsedResult.topics = ["Extracted Support Issue"];
    }

    return NextResponse.json(parsedResult);

  } catch (error: unknown) {
    console.error("AI Generation Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate knowledge article";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
