import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

function sanitizeKey(val?: string | null): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
}

/**
 * Cria um stream seguro para respostas SSE do Google Gemini OpenAI-compatible.
 * Se o Google abortar ou terminar o stream sem 'finish_reason' (ou enviar um array de erro cru de 503),
 * este stream intercepta e injeta um encerramento limpo (finish_reason: "stop") para evitar
 * que @ai-sdk/openai-compatible lance "Response stream ended without a finish reason".
 */
function createSafeSseStream(originalBody: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = originalBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let hasSentFinishReason = false;
  let buffer = "";

  const finishPayload =
    '\ndata: {"choices":[{"delta":{"content":""},"finish_reason":"stop","index":0}]}\n\ndata: [DONE]\n\n';

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          if (!hasSentFinishReason) {
            controller.enqueue(encoder.encode(finishPayload));
            hasSentFinishReason = true;
          }
          controller.close();
          return;
        }

        const text = decoder.decode(value, { stream: true });
        buffer += text;
        if (
          buffer.includes('"finish_reason":"stop"') ||
          buffer.includes('"finish_reason":"length"') ||
          buffer.includes('"finish_reason":"tool_calls"')
        ) {
          hasSentFinishReason = true;
        }

        // Se o Google enviar um array JSON cru de erro no meio do stream (ex: 503 high demand)
        if (text.includes('"error"') && (text.includes('503') || text.includes('UNAVAILABLE') || text.includes('high demand'))) {
          console.warn("[SafeGeminiStream] Google 503/UNAVAILABLE detectado no stream. Finalizando stream de forma limpa.");
          if (!hasSentFinishReason) {
            controller.enqueue(encoder.encode(finishPayload));
            hasSentFinishReason = true;
          }
          controller.close();
          return;
        }

        controller.enqueue(value);
      } catch (err) {
        console.warn("[SafeGeminiStream] Erro ao ler stream:", err);
        if (!hasSentFinishReason) {
          controller.enqueue(encoder.encode(finishPayload));
          hasSentFinishReason = true;
        }
        controller.close();
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

function createGeminiResilientFetch() {
  const CANDIDATES = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
  ];

  return async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!init || !init.body || typeof init.body !== "string") {
      return fetch(url, init);
    }

    let parsedBody: Record<string, any>;
    try {
      parsedBody = JSON.parse(init.body);
    } catch {
      return fetch(url, init);
    }

    // Se não for rota de completions, faz o fetch comum
    const isChatCompletion = String(url).includes("/chat/completions");
    if (!isChatCompletion) {
      return fetch(url, init);
    }

    const requestedModel = parsedBody.model || "gemini-3.6-flash";
    const modelsToTry = [
      requestedModel,
      ...CANDIDATES.filter((m) => m !== requestedModel),
    ];

    let lastResponse: Response | null = null;

    for (const model of modelsToTry) {
      try {
        const bodyWithModel = JSON.stringify({ ...parsedBody, model });
        const res = await fetch(url, { ...init, body: bodyWithModel });

        // Se status 5xx, tenta o próximo modelo
        if (res.status >= 500) {
          console.warn(`[GeminiFetch] Modelo "${model}" retornou HTTP ${res.status}. Tentando modelo reserva...`);
          lastResponse = res;
          continue;
        }

        const contentType = res.headers.get("content-type") || "";

        // Se for SSE streaming, envelopa para proteger contra encerramentos abruptos
        if (contentType.includes("text/event-stream") && res.body) {
          const safeBody = createSafeSseStream(res.body);
          return new Response(safeBody, {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          });
        }

        // Se a resposta for JSON mas contiver erro 503 disfarçado do Google
        if (contentType.includes("application/json")) {
          const clone = res.clone();
          const text = await clone.text();
          if (text.includes('"code":503') || text.includes('"status":"UNAVAILABLE"')) {
            console.warn(`[GeminiFetch] Modelo "${model}" retornou erro 503 JSON. Tentando modelo reserva...`);
            lastResponse = res;
            continue;
          }
        }

        return res;
      } catch (e: any) {
        console.warn(`[GeminiFetch] Falha ao consultar modelo "${model}": ${e?.message}. Tentando reserva...`);
      }
    }

    return lastResponse || fetch(url, init);
  };
}

export function createAiProvider() {
  // 1. Google Gemini (Endpoint oficial OpenAI-Compatible com resiliência a picos de demanda)
  const geminiKey = sanitizeKey(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (geminiKey) {
    return {
      provider: createOpenAICompatible({
        name: "google-gemini",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: geminiKey,
        fetch: createGeminiResilientFetch(),
      }),
      defaultModel: "gemini-3.6-flash",
    };
  }

  // 2. OpenAI Oficial
  const openaiKey = sanitizeKey(process.env.OPENAI_API_KEY);
  if (openaiKey) {
    return {
      provider: createOpenAICompatible({
        name: "openai",
        baseURL: "https://api.openai.com/v1",
        apiKey: openaiKey,
      }),
      defaultModel: "gpt-4o-mini",
    };
  }

  // 3. OpenRouter
  const openrouterKey = sanitizeKey(process.env.OPENROUTER_API_KEY);
  if (openrouterKey) {
    return {
      provider: createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openrouterKey,
      }),
      defaultModel: "google/gemini-2.5-flash",
    };
  }

  // 4. Fallback retrocompatível (Lovable AI Gateway)
  const lovableKey = sanitizeKey(process.env.LOVABLE_API_KEY);
  if (lovableKey) {
    return {
      provider: createOpenAICompatible({
        name: "lovable-ai-gateway",
        baseURL: "https://ai.gateway.lovable.dev/v1",
        headers: { "Lovable-API-Key": lovableKey },
      }),
      defaultModel: "google/gemini-3-flash-preview",
    };
  }

  throw new Error(
    "Nenhuma chave de IA configurada no arquivo .env (defina GEMINI_API_KEY, OPENAI_API_KEY ou OPENROUTER_API_KEY)."
  );
}

export function createLovableAiGatewayProvider(apiKey?: string) {
  const cleanKey = sanitizeKey(apiKey);
  if (cleanKey) {
    return createOpenAICompatible({
      name: "custom-gateway",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": cleanKey },
    });
  }
  return createAiProvider().provider;
}
