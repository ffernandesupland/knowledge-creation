import { NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_build",
});

type TemplateField = {
  fieldName: string;
  description: string;
  required: boolean;
  searchable: boolean;
};

type PlanItem = {
  topic: string;
  targetArticleIds: string[];
  template?: {
    templateName: string;
    kbPrefix: string;
    fields: TemplateField[];
  };
};

export async function POST(req: Request) {
  try {
    const { content, plan, config } = await req.json();

    if (!content || !plan || !Array.isArray(plan)) {
      return NextResponse.json({ error: "Missing content or plan array" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY");
    }

    let token = "";
    if (plan.some((p: PlanItem) => p.targetArticleIds && p.targetArticleIds.length > 0)) {
       const authUrl = process.env.KB_AUTH_URL;
       const companyCode = process.env.KB_COMPANY_CODE;
       const username = process.env.KB_USERNAME;
       const password = process.env.KB_PASSWORD;

       if (authUrl && companyCode && username && password) {
          const authParams = new URLSearchParams({
            companyCode: companyCode,
            appInterface: process.env.KB_APP_INTERFACE || "sa"
          });
          const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
          
          const authResponse = await fetch(`${authUrl}?${authParams.toString()}`, {
              headers: { "Authorization": `Basic ${basicAuth}`, "Accept": "application/json" }
          });

          if (authResponse.ok) {
             const tokenData = await authResponse.text();
             try { 
               const parsed = JSON.parse(tokenData); 
               token = parsed.access_token || parsed.token || parsed.jwtoken || parsed.jwt || tokenData; 
             } catch(e) { console.error(e); token = tokenData; }
             token = token.replace(/^"|"$/g, '');
          }
       }
    }

    const searchUrl = process.env.KB_SEARCH_URL;
    const solutionUrl = process.env.KB_SOLUTION_URL || (searchUrl ? searchUrl.replace('/search', '/solution') : '');
    const companyCode = process.env.KB_COMPANY_CODE;

    // Generate in parallel for all finalized topics
    const promises = plan.map(async (topicPlan: PlanItem) => {
      let combinedExistingArticles = "";

      // 1. Fetch Targeted Duplicates for Consolidation
      if (topicPlan.targetArticleIds && topicPlan.targetArticleIds.length > 0 && token && solutionUrl) {
         const fetchPromises = topicPlan.targetArticleIds.map(async (id) => {
           const pathUrl = `${solutionUrl}/${id}?companyCode=${companyCode}&appInterface=${process.env.KB_APP_INTERFACE || "sa"}&verboseResult=true`;
           const response = await fetch(pathUrl, {
               headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
           });
           if (!response.ok) return `Failed to fetch ${id}`;
           const data = await response.json();
           return `--- Article ID: ${id} ---\n${JSON.stringify(data).substring(0, 2000)}\n`;
         });
         const articlesContentArray = await Promise.all(fetchPromises);
         combinedExistingArticles = articlesContentArray.join("\n\n");
      }

      // 2. Build the dynamic field schema from the selected template
      const template = topicPlan.template;
      let fieldSchemaBlock = "";
      let fieldJsonSchema = "";

      if (template && template.fields && template.fields.length > 0) {
        // Template-driven: generate fields matching the template
        const fieldDescriptions = template.fields.map((f, i) => {
          const reqTag = f.required ? "[REQUIRED]" : "[OPTIONAL]";
          const desc = f.description ? ` — ${f.description}` : "";
          return `  ${i + 1}. "${f.fieldName}" ${reqTag}${desc}`;
        }).join("\n");

        fieldSchemaBlock = `
You MUST use the exact template structure below — the user selected template "${template.templateName}" (prefix: ${template.kbPrefix}).
The output JSON MUST contain a "customFields" object with keys matching these EXACT field names:
${fieldDescriptions}

For REQUIRED fields you MUST provide detailed, meaningful content extracted from the source material.
For OPTIONAL fields, provide content where the source material has relevant information, or leave as an empty string "".

The AI MUST be aware of each field's name and description and use them to decide what content belongs in each field.`;

        // Build the JSON schema fragment
        const fieldEntries = template.fields.map(f => `    "${f.fieldName}": "Content for this field based on the source material"`).join(",\n");
        fieldJsonSchema = `"customFields": {\n${fieldEntries}\n  },\n  "templateName": "${template.templateName}",\n  "kbPrefix": "${template.kbPrefix}",`;
      } else {
        // Fallback to classic KCS if no template selected
        fieldSchemaBlock = `Format the article into standard KCS fields: Problem/Environment, Cause, and Resolution.`;
        fieldJsonSchema = `"problem": "The environment and the problem described",\n  "cause": "The root cause of the problem",\n  "resolution": "Step-by-step resolution",`;
      }

      // 3. Draft the Article with OpenAI
      let dynamicInstructions = "";
      if (config?.optKcs !== false) dynamicInstructions += "- You must act as a KCS Organization Agent. Structure the content according to the template fields provided.\n";
      if (config?.optNeural) dynamicInstructions += "- You must act as a Neural Optimization Agent. Maximize semantic density and intent-alignment.\n";
      
      const isConsolidating = combinedExistingArticles.length > 0;
      
      const systemPromptBase = `You are an expert technical writer trained in Knowledge-Centered Service (KCS) methodology.
Your task is to transform raw support notes into a standardized knowledge article specifically focused on the topic: "${topicPlan.topic}".
${dynamicInstructions}
${fieldSchemaBlock}

Force isMultiTopic to false.

${isConsolidating ? `CRITICAL RULE: The user has selected the following EXISTING KB Articles to merge into this new draft:
${combinedExistingArticles}
You MUST merge the historical context, environment details, and solutions from BOTH the original source AND all provided existing articles. You must not lose historical context.
Since you are consolidating, you must populate the "consolidationPlan" object in the JSON schema!` : ""}

Always respond in strict JSON format matching this schema:
{
  "title": "A clear, action-oriented title",
  ${fieldJsonSchema}
  "confidence": 0.95,
  "duplicateWarning": false,
  "duplicateArticleId": null,
  "isMultiTopic": false,
  "suggestedTopics": [],
  "consolidationPlan": ${isConsolidating ? `{
    "articlesToArchive": ${JSON.stringify(topicPlan.targetArticleIds)},
    "articlesToCreate": ["Title of the new merged article"],
    "summarySteps": ["Step 1: Archive outdated articles...", "Step 2: Merge..."]
  }` : "null"}
}`;

      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || "gpt-5.4",
        messages: [
          { role: "system", content: systemPromptBase },
          { role: "user", content: `Original Source Content we were analyzing:\n${content}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const aiResultStr = completion.choices[0]?.message?.content;
      if (!aiResultStr) throw new Error("No response from AI for topic: " + topicPlan.topic);
      
      const parsed = JSON.parse(aiResultStr);

      // Attach template metadata so the frontend knows which renderer to use
      if (template) {
        parsed._templateName = template.templateName;
        parsed._kbPrefix = template.kbPrefix;
        parsed._templateFields = template.fields;
      }

      // We wrap the result in the consolidated format so the GenerationResult component renders it seamlessly
      if (isConsolidating) {
         return {
            mergedDraft: parsed,
            needsSplit: false,
            consolidationPlan: parsed.consolidationPlan
         };
      }
      return parsed;
    });

    const results = await Promise.all(promises);

    return NextResponse.json(results);

  } catch (error: unknown) {
    console.error("Master Generation Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate master plan";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
