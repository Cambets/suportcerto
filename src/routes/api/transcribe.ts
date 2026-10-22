import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const formData = await request.formData();
        const file = formData.get("audio");
        if (!(file instanceof File)) {
          return new Response(JSON.stringify({ error: "Missing audio file" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
        if (file.size > MAX_BYTES) {
          return new Response(JSON.stringify({ error: "Áudio muito grande (máx. 10 MB)" }), {
            status: 413,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (file.type && !file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
          return new Response(JSON.stringify({ error: "Formato de arquivo inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }



        const arrayBuf = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        const mediaType = file.type || "audio/webm";

        try {
          const gateway = createLovableAiGatewayProvider(apiKey);
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
                    data: bytes,
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
        } catch (err) {
          console.error("[transcribe] failed", err);
          const message = err instanceof Error ? err.message : "Erro na transcrição";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
