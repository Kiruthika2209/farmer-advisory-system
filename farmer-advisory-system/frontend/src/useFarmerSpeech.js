import { useCallback, useEffect, useRef, useState } from "react";
import { blobToDataUrl, startAudioRecorder, stopAudioRecorder } from "./voiceRecord";

const API_BASE = "http://localhost:5000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRecognitionCtor = () =>
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const speechErrorMessage = (event, lang) => {
  const code = event?.error || "unknown";
  const en = {
    "not-allowed":
      "Microphone blocked. Click the lock icon in the address bar, allow microphone, then tap Start again.",
    "service-not-allowed": "Voice is not allowed on this page. Open the app in Chrome or Edge.",
    "no-speech": "No speech detected. Speak clearly near the microphone, then tap Stop.",
    network: "Voice needs internet. Check your Wi-Fi or mobile data.",
    aborted: "Stopped.",
    "audio-capture": "No microphone found. Connect a mic or enable it in Windows settings.",
    unknown: "Could not hear you. Tap Start, speak, then Stop and Ask."
  };
  const ta = {
    "not-allowed": "மைக் தடுக்கப்பட்டது. முகவரி பட்டியில் அனுமதி கொடுத்து மீண்டும் தொடங்குங்கள்.",
    "service-not-allowed": "Chrome அல்லது Edge இல் திறக்கவும்.",
    "no-speech": "குரல் கேட்கவில்லை. மைக்கிற்கு அருகில் பேசுங்கள்.",
    network: "இணையம் தேவை.",
    aborted: "நிறுத்தப்பட்டது.",
    "audio-capture": "மைக் இல்லை.",
    unknown: "குரல் பிடிக்கவில்லை. தொடங்கு → பேசு → நிறுத்து → கேள்."
  };
  const map = lang === "ta" ? ta : en;
  return map[code] || map.unknown;
};

async function transcribeOnServer(audioDataUrl, lang) {
  const res = await fetch(`${API_BASE}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: audioDataUrl, lang })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.reply || "Transcription failed");
  }
  return String(data.transcript || "").trim();
}

/**
 * Voice input for farmers: live speech-to-text (Chrome/Edge) + recorded audio fallback.
 */
export function useFarmerSpeech(lang = "en") {
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const activeRef = useRef(false);
  const recognitionRef = useRef(null);
  const finalRef = useRef("");
  const recordSessionRef = useRef(null);
  const startingRef = useRef(false);

  const recognitionLang = lang === "ta" ? "ta-IN" : "en-IN";

  const releaseRecorder = useCallback(async () => {
    const session = recordSessionRef.current;
    recordSessionRef.current = null;
    if (!session) return null;
    return stopAudioRecorder(session);
  }, []);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    startingRef.current = false;

    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
      recognitionRef.current = null;
    }
  }, []);

  const attachRecognitionHandlers = useCallback(
    (recognition) => {
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            finalRef.current += text;
          } else {
            interim += text;
          }
        }
        setTranscript((finalRef.current + interim).trim());
      };

      recognition.onerror = (event) => {
        if (event.error === "aborted" || !activeRef.current) return;
        if (event.error === "no-speech") return;
        setError(speechErrorMessage(event, lang));
        if (event.error === "not-allowed" || event.error === "audio-capture") {
          setStatus("error");
          activeRef.current = false;
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        if (!activeRef.current) {
          setStatus((s) => (s === "listening" ? "ready" : s));
          return;
        }
        setTimeout(() => {
          if (!activeRef.current || recognitionRef.current) return;
          try {
            const next = new (getRecognitionCtor())();
            next.continuous = true;
            next.interimResults = true;
            next.lang = recognitionLang;
            recognitionRef.current = next;
            attachRecognitionHandlers(next);
            next.start();
          } catch {
            setStatus("ready");
          }
        }, 250);
      };
    },
    [lang, recognitionLang]
  );

  const beginRecognition = useCallback(() => {
    const SpeechRecognition = getRecognitionCtor();
    if (!SpeechRecognition || !activeRef.current) return false;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = recognitionLang;
      recognitionRef.current = recognition;
      attachRecognitionHandlers(recognition);
      recognition.start();
      setStatus("listening");
      return true;
    } catch (e) {
      setError(String(e?.message || "Could not start voice recognition."));
      setStatus("error");
      activeRef.current = false;
      return false;
    }
  }, [attachRecognitionHandlers, recognitionLang]);

  const startListening = useCallback(async () => {
    if (startingRef.current || activeRef.current) return true;
    startingRef.current = true;
    setError("");

    const SpeechRecognition = getRecognitionCtor();
    if (!SpeechRecognition) {
      setStatus("unsupported");
      setError(
        lang === "ta"
          ? "இந்த உலாவியில் நேரடி குரல் இல்லை. Chrome/Edge பயன்படுத்தவும்."
          : "Use Chrome or Edge for voice questions."
      );
      startingRef.current = false;
      return false;
    }

    stopListening();
    activeRef.current = true;
    finalRef.current = "";
    setTranscript("");
    setStatus("requesting");

    try {
      const session = await startAudioRecorder();
      recordSessionRef.current = session;
      session.recorder.start(500);
    } catch (err) {
      activeRef.current = false;
      setStatus("error");
      setError(
        err?.name === "NotAllowedError"
          ? speechErrorMessage({ error: "not-allowed" }, lang)
          : speechErrorMessage({ error: "audio-capture" }, lang)
      );
      startingRef.current = false;
      return false;
    }

    const ok = beginRecognition();
    startingRef.current = false;
    if (!ok) {
      await releaseRecorder();
    }
    return ok;
  }, [beginRecognition, lang, releaseRecorder, stopListening]);

  const finishListening = useCallback(async () => {
    activeRef.current = false;
    stopListening();
    setStatus("processing");
    await sleep(350);

    let text = finalRef.current.trim();
    const blob = await releaseRecorder();

    if (!text && blob && blob.size > 800) {
      try {
        const dataUrl = await blobToDataUrl(blob);
        text = await transcribeOnServer(dataUrl, lang);
        if (text) {
          setTranscript(text);
          finalRef.current = text;
          setError("");
        }
      } catch (e) {
        setError(
          lang === "ta"
            ? `குரல் மாற்ற முடியவில்லை: ${e.message}`
            : `Could not convert voice to text: ${e.message}`
        );
      }
    }

    if (!text) {
      setError((prev) => prev || speechErrorMessage({ error: "no-speech" }, lang));
      setStatus("error");
      return "";
    }

    setTranscript(text);
    setStatus("ready");
    return text;
  }, [lang, releaseRecorder, stopListening]);

  const toggleListening = useCallback(async () => {
    if (activeRef.current || status === "listening" || status === "requesting") {
      return finishListening();
    }
    await startListening();
    return transcript;
  }, [finishListening, startListening, status, transcript]);

  useEffect(
    () => () => {
      activeRef.current = false;
      stopListening();
      releaseRecorder();
    },
    [releaseRecorder, stopListening]
  );

  return {
    transcript,
    setTranscript,
    status,
    error,
    setError,
    startListening,
    stopListening,
    finishListening,
    toggleListening,
    isSupported: Boolean(getRecognitionCtor()) || Boolean(navigator.mediaDevices?.getUserMedia)
  };
}

const prepareTextForSpeech = (text) =>
  String(text)
    .replace(/\*\*/g, "")
    .replace(/\(Word count:\s*\d+\)/gi, "")
    .replace(/\(word count:\s*\d+\)/gi, "")
    .replace(/\bWord count:\s*\d+\b/gi, "")
    .trim();

const splitForSpeech = (text) => {
  const parts = text
    .split(/(?<=[.!?]\s+|\n+)/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
};

const pickVoice = (lang) => {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  if (lang === "ta") {
    const tamil = voices.filter((v) => /^ta(-|_)/i.test(v.lang));
    return (
      tamil.find((v) => /google.*tamil|valluvar|tamil india|microsoft.*tamil|female/i.test(v.name)) ||
      tamil.find((v) => v.lang === "ta-IN") ||
      tamil[0]
    );
  }

  return (
    voices.find((v) => /google.*english.*india|microsoft.*english.*india/i.test(v.name)) ||
    voices.find((v) => v.lang === "en-IN") ||
    voices.find((v) => /^en(-|_)/i.test(v.lang)) ||
    null
  );
};

let currentAudioContext = null;

export function speakFarmerReply(text, lang = "en", { onEnd } = {}) {
  if (typeof window === "undefined") {
    return false;
  }

  const cleaned = prepareTextForSpeech(text);
  if (!cleaned) return false;

  // For Tamil, use backend TTS (VoiceRSS with native Tamil voice)
  if (lang === "ta") {
    return speakTamilWithBackendTTS(cleaned, onEnd);
  }

  // For English, use browser speech synthesis
  if (!window.speechSynthesis) {
    return false;
  }

  const parts = splitForSpeech(cleaned);
  let index = 0;

  const speakNext = () => {
    if (index >= parts.length) {
      onEnd?.();
      return;
    }
    const chunk = parts[index++];
    const utter = new SpeechSynthesisUtterance(chunk);
    utter.lang = "en-IN";
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;
    const voice = pickVoice("en");
    if (voice) utter.voice = voice;
    utter.onend = speakNext;
    utter.onerror = speakNext;
    window.speechSynthesis.speak(utter);
  };

  const start = () => {
    window.speechSynthesis.cancel();
    speakNext();
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    start();
    return true;
  }

  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.onvoiceschanged = null;
    start();
  };
  return true;
}

async function speakTamilWithBackendTTS(text, onEnd) {
  try {
    // Stop any previous audio
    if (currentAudioContext) {
      currentAudioContext.audio?.pause();
    }

    // Request TTS from backend which uses VoiceRSS for natural Tamil voice
    const response = await fetch(`${API_BASE}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: "ta" })
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    currentAudioContext = { audio, url: audioUrl };

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudioContext = null;
      onEnd?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudioContext = null;
      onEnd?.();
    };

    await audio.play();
    return true;
  } catch (err) {
    console.warn("Backend TTS failed, falling back to browser synthesis:", err);
    // Fallback to browser speech synthesis if backend TTS fails
    return fallbackTamilSpeech(text, onEnd);
  }
}

function fallbackTamilSpeech(text, onEnd) {
  if (!window.speechSynthesis) {
    onEnd?.();
    return false;
  }

  const parts = splitForSpeech(text);
  let index = 0;

  const speakNext = () => {
    if (index >= parts.length) {
      onEnd?.();
      return;
    }
    const chunk = parts[index++];
    const utter = new SpeechSynthesisUtterance(chunk);
    utter.lang = "ta-IN";
    utter.rate = 0.75;
    utter.pitch = 1.1;
    utter.volume = 1;
    const voice = pickVoice("ta");
    if (voice) utter.voice = voice;
    utter.onend = speakNext;
    utter.onerror = speakNext;
    window.speechSynthesis.speak(utter);
  };

  const start = () => {
    window.speechSynthesis.cancel();
    speakNext();
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    start();
    return true;
  }

  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.onvoiceschanged = null;
    start();
  };
  return true;
}

export function stopSpeaking() {
  // Stop browser speech synthesis
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  // Stop Google TTS audio if playing
  if (currentAudioContext) {
    currentAudioContext.audio?.pause();
    if (currentAudioContext.url) {
      URL.revokeObjectURL(currentAudioContext.url);
    }
    currentAudioContext = null;
  }
}
