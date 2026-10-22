import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAiProvider() {
  // 1. Google Gemini (Endpoint oficial OpenAI-Compatible)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey && geminiKey.trim()) {
    return {
      provider: createOpenAICompatible({
        name: "google-gemini",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: geminiKey.trim(),
      }),
      defaultModel: "gemini-3.5-flash-lite",
    };
  }

  // 2. OpenAI Oficial
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey.trim()) {
    return {
      provider: createOpenAICompatible({
        name: "openai",
        baseURL: "https://api.openai.com/v1",
        apiKey: openaiKey.trim(),
      }),
      defaultModel: "gpt-4o-mini",
    };
  }

  // 3. OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey && openrouterKey.trim()) {
    return {
      provider: createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openrouterKey.trim(),
      }),
      defaultModel: "google/gemini-2.5-flash",
    };
  }

  // 4. Fallback retrocompatível (Lovable AI Gateway)
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey && lovableKey.trim()) {
    return {
      provider: createOpenAICompatible({
        name: "lovable-ai-gateway",
        baseURL: "https://ai.gateway.lovable.dev/v1",
        headers: { "Lovable-API-Key": lovableKey.trim() },
      }),
      defaultModel: "google/gemini-3-flash-preview",
    };
  }

  throw new Error(
    "Nenhuma chave de IA configurada no arquivo .env (defina GEMINI_API_KEY, OPENAI_API_KEY ou OPENROUTER_API_KEY)."
  );
}

export function createLovableAiGatewayProvider(apiKey?: string) {
  if (apiKey) {
    return createOpenAICompatible({
      name: "custom-gateway",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": apiKey },
    });
  }
  return createAiProvider().provider;
}
