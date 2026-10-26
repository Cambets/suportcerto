import { createFileRoute } from "@tanstack/react-router";

function sanitizeKey(val?: string | null): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get("audio");
          if (!(file instanceof File)) {
            return new Response(JSON.stringify({ error: "Arquivo de áudio não enviado" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
          if (file.size > MAX_BYTES) {
            return new Response(JSON.stringify({ error: "Áudio muito grande (máximo 20 MB)" }), {
              status: 413,
              headers: { "Content-Type": "application/json" },
            });
          }

          const arrayBuf = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          let mediaType = file.type || "audio/webm";
          if (mediaType.includes(";")) mediaType = mediaType.split(";")[0].trim();
          if (!mediaType || mediaType === "application/octet-stream") {
            const nameLower = file.name.toLowerCase();
            if (nameLower.endsWith(".mp3")) mediaType = "audio/mp3";
            else if (nameLower.endsWith(".wav")) mediaType = "audio/wav";
            else if (nameLower.endsWith(".ogg") || nameLower.endsWith(".oga")) mediaType = "audio/ogg";
            else if (nameLower.endsWith(".m4a")) mediaType = "audio/m4a";
            else if (nameLower.endsWith(".aac")) mediaType = "audio/aac";
            else mediaType = "audio/webm";
          }

          // 1. Google Gemini (Nativo Multimodal com suporte a áudio)
          const geminiKey = sanitizeKey(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
          if (geminiKey) {
            const base64Audio = buffer.toString("base64");
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text:
                            "Você é um transcritor profissional de áudio. " +
                            "Transcreva o áudio a seguir EXATAMENTE como falado, em português do Brasil. " +
                            "Retorne APENAS o texto transcrito, sem introdução, sem explicações, sem aspas, sem marcadores de tempo. " +
                            "Se não houver nenhuma fala humana compreensível ou for apenas ruído/silêncio, não retorne nada.",
                        },
                        {
                          inline_data: {
                            mime_type: mediaType,
                            data: base64Audio,
                          },
                        },
                      ],
                    },
                  ],
                }),
              },
            );

            const geminiData = await geminiRes.json();
            if (!geminiRes.ok) {
              console.error("[transcribe] Gemini error:", geminiData);
              throw new Error(geminiData?.error?.message || "Falha na transcrição via Gemini");
            }

            const rawText = (geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
            const text = rawText.replace(/^["'`]+|["'`]+$/g, "").trim();

            return new Response(JSON.stringify({ text }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // 2. OpenAI Whisper oficial
          const openaiKey = sanitizeKey(process.env.OPENAI_API_KEY);
          if (openaiKey) {
            const whisperFd = new FormData();
            whisperFd.append("file", file, file.name || "audio.webm");
            whisperFd.append("model", "whisper-1");
            whisperFd.append("language", "pt");

            const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
              method: "POST",
              headers: { Authorization: `Bearer ${openaiKey}` },
              body: whisperFd,
            });

            const whisperData = await whisperRes.json();
            if (!whisperRes.ok) {
              throw new Error(whisperData?.error?.message || "Falha na transcrição via Whisper");
            }

            const text = (whisperData?.text || "").trim();
            return new Response(JSON.stringify({ text }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // 3. Lovable AI Gateway Fallback
          const lovableKey = sanitizeKey(process.env.LOVABLE_API_KEY);
          if (lovableKey) {
            const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
            const { generateText } = await import("ai");
            const gateway = createLovableAiGatewayProvider(lovableKey);
            const result = await generateText({
              model: gateway("google/gemini-2.5-flash"),
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text:
                        "Transcreva o áudio a seguir EXATAMENTE como falado, em português do Brasil. " +
                        "Retorne SOMENTE o texto transcrito, sem comentários, sem aspas, sem prefixos.",
                    },
                    {
                      type: "file",
                      data: new Uint8Array(arrayBuf),
                      mediaType,
                    },
                  ],
                },
              ],
            });

            const text = (result.text || "").trim();
            return new Response(JSON.stringify({ text }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(
            JSON.stringify({
              error: "Nenhuma chave de IA configurada para transcrição (defina GEMINI_API_KEY ou OPENAI_API_KEY)",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err) {
          console.error("[transcribe] erro geral:", err);
          const message = err instanceof Error ? err.message : "Erro desconhecido na transcrição";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
