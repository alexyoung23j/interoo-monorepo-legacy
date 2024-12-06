import { useState, useRef, useCallback, useEffect } from "react";

interface TtsAudioHook {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  playAudio: (text: string) => Promise<void>;
  stopAudio: () => void;
  audioDuration: number | null;
}

export function useTtsAudio({
  useElevenLabs,
}: {
  useElevenLabs?: boolean;
}): TtsAudioHook {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldPlayRef = useRef<boolean>(true);

  const fetchTtsAudio = useCallback(
    async (text: string): Promise<ArrayBuffer> => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-tts-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            ttsProvider: useElevenLabs ? "elevenlabs" : "google",
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch TTS audio");
      }

      return await response.arrayBuffer();
    },
    [useElevenLabs],
  );

  const playAudio = useCallback(
    async (text: string) => {
      try {
        setIsLoading(true);
        setError(null);
        shouldPlayRef.current = true;

        const audioData = await fetchTtsAudio(text);
        // If stopAudio was called while fetching, don't play
        if (!shouldPlayRef.current) {
          setIsLoading(false);
          return;
        }
        const blob = new Blob([audioData], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = url;
        } else {
          audioRef.current = new Audio(url);
        }

        audioRef.current.onloadedmetadata = () => {
          setAudioDuration(audioRef.current!.duration * 1000); // Convert to milliseconds
        };

        audioRef.current.onended = () => {
          setIsPlaying(false);
          setAudioDuration(null);
        };
        audioRef.current.onerror = () => {
          setError("Error playing audio");
          setIsPlaying(false);
          setAudioDuration(null);
        };

        setIsLoading(false);
        setIsPlaying(true);
        await audioRef.current.play();
      } catch (err) {
        setError("Failed to play TTS audio");
        setIsLoading(false);
        setAudioDuration(null);
      }
    },
    [fetchTtsAudio],
  );

  const stopAudio = useCallback(() => {
    shouldPlayRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setIsLoading(false);
    setAudioDuration(null);
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  return {
    isLoading,
    isPlaying,
    error,
    playAudio,
    stopAudio,
    audioDuration,
  };
}
