import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/* ============================
   Types
============================ */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
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

  const match = retryDelay.match(/^(\d+)s$/);
  if (!match) return undefined;
  const secs = Number(match[1]);
  return Number.isFinite(secs) ? secs : undefined;
}

/* ============================
   AI Generation
============================ */

async function generateAIResponse(messages: ChatMessage[]): Promise<string> {
  const systemInstruction = `
You are a helpful AI coding assistant. You help developers with:
- Code explanations and debugging
- Best practices and architecture advice
- Writing clean, efficient code
- Troubleshooting errors
- Code reviews and optimizations

Guidelines:
- Be clear and practical
- Use concise explanations
- When showing code, use proper formatting
- Prefer modern best practices
`.trim();

  try {
    const contents = [
      {
        role: "system",
        parts: [{ text: systemInstruction }],
      },
      ...messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })),
    ];

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents,
      config: {
        temperature: 0.7,
        maxOutputTokens: 800,
        topP: 0.9,
      },
    });

    const text = response.text?.trim();

    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    return text;
  } catch (error) {
    console.error("Gemini generation error:", error);
    // Bubble up so the route can return the correct HTTP status (e.g. 429)
    throw error;
  }
}

/* ============================
   API Route
============================ */

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, history = [] } = body;

    // Validate input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate & sanitize history
    const validHistory: ChatMessage[] = Array.isArray(history)
      ? history.filter(
          (msg) =>
            msg &&
            typeof msg === "object" &&
            typeof msg.content === "string" &&
            (msg.role === "user" || msg.role === "assistant")
        )
      : [];

    // Limit context size (cost + latency control)
    const recentHistory = validHistory.slice(-10);

    const messages: ChatMessage[] = [
      ...recentHistory,
      { role: "user", content: message },
    ];

    const aiResponse = await generateAIResponse(messages);

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate AI response",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
