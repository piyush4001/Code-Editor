import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/* ============================
   Types
============================ */

interface CodeSuggestionRequest {
  fileContent: string;
  cursorLine: number;
  cursorColumn: number;
  suggestionType: string;
  fileName?: string;
}

interface CodeContext {
  language: string;
  framework: string;
  beforeContext: string;
  currentLine: string;
  afterContext: string;
  cursorPosition: { line: number; column: number };
  isInFunction: boolean;
  isInClass: boolean;
  isAfterComment: boolean;
  incompletePatterns: string[];
}

/* ============================
   Gemini Client (NEW SDK)
============================ */

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

function getGeminiStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const anyErr = error as any;
  const status = anyErr?.status ?? anyErr?.response?.status;
  return typeof status === "number" ? status : undefined;
}

function getGeminiRetryAfterSeconds(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const anyErr = error as any;
  const details = anyErr?.error?.details ?? anyErr?.details;
  if (!Array.isArray(details)) return undefined;

  const retryInfo = details.find(
    (d: any) => d && typeof d === "object" && d["@type"]?.includes("RetryInfo")
  );
  const retryDelay: string | undefined = retryInfo?.retryDelay;
  if (typeof retryDelay !== "string") return undefined;

  // format like "38s"
  const match = retryDelay.match(/^(\d+)s$/);
  if (!match) return undefined;
  const secs = Number(match[1]);
  return Number.isFinite(secs) ? secs : undefined;
}

/* ============================
   API Handler
============================ */

export async function POST(request: NextRequest) {
  try {
    const body: CodeSuggestionRequest = await request.json();
    const { fileContent, cursorLine, cursorColumn, suggestionType, fileName } =
      body;

    if (!fileContent || cursorLine < 0 || cursorColumn < 0 || !suggestionType) {
      return NextResponse.json(
        { error: "Invalid input parameters" },
        { status: 400 }
      );
    }

    const context = analyzeCodeContext(
      fileContent,
      cursorLine,
      cursorColumn,
      fileName
    );

    const prompt = buildPrompt(context, suggestionType);
    const suggestion = await generateSuggestion(prompt);

    return NextResponse.json({
      suggestion,
      metadata: {
        language: context.language,
        framework: context.framework,
        position: context.cursorPosition,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Code Completion API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI suggestion" },
      { status: 500 }
    );
  }
}

/* ============================
   Gemini Code Completion
============================ */

async function generateSuggestion(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2, // deterministic for code
        maxOutputTokens: 64, // short completions
        topP: 0.9,
      },
    });

    let suggestion = response.text?.trim() ?? "";

    // Remove markdown code fences if any
    if (suggestion.includes("```")) {
      const match = suggestion.match(/```[\w]*\n?([\s\S]*?)```/);
      suggestion = match ? match[1].trim() : suggestion;
    }

    return suggestion || "// No suggestion generated";
  } catch (error) {
    console.error("Gemini generation error:", error);
    // Bubble up so the route can return the correct HTTP status (e.g. 429)
    throw error;
  }
}

/* ============================
   Context Analysis
============================ */

function analyzeCodeContext(
  content: string,
  line: number,
  column: number,
  fileName?: string
): CodeContext {
  const lines = content.split("\n");
  const currentLine = lines[line] || "";

  const radius = 10;
  const start = Math.max(0, line - radius);
  const end = Math.min(lines.length, line + radius);

  return {
    language: detectLanguage(content, fileName),
    framework: detectFramework(content),
    beforeContext: lines.slice(start, line).join("\n"),
    currentLine,
    afterContext: lines.slice(line + 1, end).join("\n"),
    cursorPosition: { line, column },
    isInFunction: detectInFunction(lines, line),
    isInClass: detectInClass(lines, line),
    isAfterComment: detectAfterComment(currentLine, column),
    incompletePatterns: detectIncompletePatterns(currentLine, column),
  };
}

/* ============================
   Prompt Builder
============================ */

function buildPrompt(context: CodeContext, suggestionType: string): string {
  return `
You are an expert ${context.language} code completion engine.

TASK:
Generate a ${suggestionType} completion.

RULES:
- Output ONLY the code to insert
- No explanation
- No markdown or backticks
- Match indentation & style

LANGUAGE: ${context.language}
FRAMEWORK: ${context.framework}

CODE:
${context.beforeContext}
${context.currentLine.slice(0, context.cursorPosition.column)}|CURSOR|${context.currentLine.slice(context.cursorPosition.column)}
${context.afterContext}

STATE:
- In Function: ${context.isInFunction}
- In Class: ${context.isInClass}
- After Comment: ${context.isAfterComment}
- Patterns: ${context.incompletePatterns.join(", ") || "None"}

COMPLETION:
`.trim();
}

/* ============================
   Helper Functions
============================ */

function detectLanguage(content: string, fileName?: string): string {
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      ts: "TypeScript",
      tsx: "TypeScript",
      js: "JavaScript",
      jsx: "JavaScript",
      py: "Python",
      java: "Java",
      go: "Go",
      rs: "Rust",
      php: "PHP",
    };
    if (ext && map[ext]) return map[ext];
  }

  if (content.includes("interface ") || content.includes(": string"))
    return "TypeScript";
  if (content.includes("def ")) return "Python";
  if (content.includes("func ")) return "Go";

  return "JavaScript";
}

function detectFramework(content: string): string {
  if (content.includes("useState") || content.includes("useEffect"))
    return "React";
  if (content.includes("next/")) return "Next.js";
  if (content.includes("@angular/")) return "Angular";
  if (content.includes("<template>")) return "Vue";
  return "None";
}

function detectInFunction(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    if (lines[i]?.match(/^\s*(function|def|const\s+\w+\s*=)/)) return true;
    if (lines[i]?.match(/^\s*}/)) break;
  }
  return false;
}

function detectInClass(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    if (lines[i]?.match(/^\s*(class|interface)\s+/)) return true;
  }
  return false;
}

function detectAfterComment(line: string, column: number): boolean {
  return /\/\/.*$/.test(line.slice(0, column));
}

function detectIncompletePatterns(line: string, column: number): string[] {
  const before = line.slice(0, column).trim();
  const patterns: string[] = [];

  if (/\(\s*$/.test(before)) patterns.push("call");
  if (/\{\s*$/.test(before)) patterns.push("object");
  if (/=\s*$/.test(before)) patterns.push("assignment");
  if (/\.\s*$/.test(before)) patterns.push("method");

  return patterns;
}
