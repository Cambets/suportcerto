import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type RecorderState = "idle" | "recording" | "processing";

export function useAudioTranscriber(onTranscribed: (text: string) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle") return;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Seu navegador não suporta gravação de áudio.");
      return;
    }

    if (!window.isSecureContext) {
      toast.error("Gravação requer HTTPS. Abra a prévia em uma nova aba.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];


      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const mimeType = mimeCandidates.find((m) =>
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
      );

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setState("idle");
          return;
        }

        setState("processing");
        try {
          const fd = new FormData();
          const ext = (mr.mimeType || "").includes("mp4") ? "m4a" : "webm";
          fd.append("audio", blob, `audio.${ext}`);

          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Falha na transcrição");

          const text = (data?.text || "").trim();
          if (!text) {
            toast.error("Não consegui entender o áudio. Tente novamente.");
          } else {
            onTranscribed(text);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro ao transcrever";
          toast.error(message);
        } finally {
          setState("idle");
        }
      };

      mr.start();
      setState("recording");
    } catch (err) {
      console.error("[mic] permission/start failed", err);
      const name = (err as any)?.name as string | undefined;
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error(
          "Permissão de microfone negada. Na prévia do Lovable, abra em uma nova aba (botão no topo) e permita o microfone.",
        );
      } else if (name === "NotFoundError") {
        toast.error("Nenhum microfone encontrado no dispositivo.");
      } else if (name === "NotReadableError") {
        toast.error("Microfone em uso por outro aplicativo.");
      } else {
        toast.error("Não foi possível acessar o microfone: " + (name || "erro desconhecido"));
      }
      setState("idle");
    }
  }, [onTranscribed, state]);


  const toggle = useCallback(() => {
    if (state === "recording") stop();
    else if (state === "idle") void start();
  }, [state, start, stop]);

  return { state, start, stop, toggle };
}
