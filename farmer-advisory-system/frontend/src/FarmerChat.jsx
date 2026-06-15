import { useState, useEffect, useRef } from "react";
import styles from "./FarmerChat.module.css";
import { fileToCompressedDataUrl } from "./imageUtils";
import { detectReplyLanguage } from "./detectReplyLanguage";
import { useFarmerSpeech, speakFarmerReply, stopSpeaking } from "./useFarmerSpeech";

function FarmerChat({ lang = "en", userId = "" }) {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [replyNote, setReplyNote] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [temperatureC, setTemperatureC] = useState(null);
  const [climateStatus, setClimateStatus] = useState("loading");
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [replyLang, setReplyLang] = useState("en");
  const [selectedImage, setSelectedImage] = useState(null);
  const {
    transcript: speechText,
    setTranscript: setSpeechText,
    status: speechStatus,
    error: speechError,
    startListening,
    stopListening,
    finishListening,
    isSupported: speechSupported
  } = useFarmerSpeech(lang);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [lastImageFile, setLastImageFile] = useState(null);
  const [lastInputType, setLastInputType] = useState("");

  // Format response text as bullet points
  const formatReplyAsPoints = (text) => {
    if (!text || !text.trim()) return [];
    
    // Try to split by common patterns
    let points = [];
    
    // Check for numbered lists (1., 2., 3., etc.)
    const numberedRegex = /^\d+\.\s+/m;
    if (numberedRegex.test(text)) {
      points = text.split(/\n+/).filter(line => line.trim()).map(line => 
        line.replace(/^\d+\.\s+/, '').trim()
      );
    } 
    // Check for bullet points (-, •, *, etc.)
    else if (/^\s*[-•*]\s+/m.test(text)) {
      points = text.split(/\n+/).filter(line => line.trim()).map(line => 
        line.replace(/^\s*[-•*]\s+/, '').trim()
      );
    }
    // Split by double newlines (paragraphs)
    else if (text.includes('\n\n')) {
      points = text.split(/\n\n+/).filter(line => line.trim()).map(line => line.trim());
    }
    // Split by periods followed by space and capital letter (sentences that look like list items)
    else if (text.includes('. ') && text.split('. ').length > 2) {
      const sentences = text.split(/(?<=[.!?])\s+/);
      points = sentences.filter(s => s.trim().length > 10).map(s => s.trim());
    }
    
    // If we got points, return them; otherwise return the text as single point
    return points.length > 1 ? points : [text];
  };

  const t = (key) => {
    const dict = {
      en: {
        addAria: "Add",
        micAria: "Microphone",
        voiceTitle: "Ask using voice",
        closeAria: "Close",
        voiceHint: "Tap Start and speak your question...",
        listen: "Listening...",
        start: "Start",
        useText: "Use text",
        askNow: "Ask now",
        imageTitle: "Add plant image",
        preview: "Preview",
        attach: "Use photo",
        removePhoto: "Remove photo",
        photoAttached: "Photo attached - AI will analyze it when you ask.",
        imageHelper: "Take or choose a clear photo of the affected plant or leaf.",
        thinking: "Getting advice from AI…",
        needInput: "Type a question, use the microphone, or add a plant photo.",
        climateToday: "Climate today:",
        loading: "Loading...",
        unavailable: "Unavailable",
        appTitle: "Farmer Advisory System",
        placeholder: "Enter your question...",
        ask: "Ask",
        response: "Response:",
        stopListen: "Stop & convert",
        processingVoice: "Converting your voice to text…",
        micUnsupported: "Voice needs Chrome or Edge, or allow microphone access.",
        voiceSteps: "1) Tap Start  2) Speak your question  3) Tap Stop  4) Tap Ask now",
        listenAnswer: "Listen to answer",
        stopAnswer: "Stop reading",
        allowMic: "Allow microphone when the browser asks, then speak your farming question."
      },
      ta: {
        addAria: "சேர்க்க",
        micAria: "மைக்",
        voiceTitle: "குரலில் கேளுங்கள்",
        closeAria: "மூடு",
        voiceHint: "Start அழுத்தி உங்கள் கேள்வியை பேசுங்கள்...",
        listen: "கேட்கிறது...",
        start: "தொடங்கு",
        useText: "உரை பயன்படுத்த",
        askNow: "இப்போது கேள்",
        imageTitle: "தாவர படம் சேர்க்க",
        preview: "முன்னோட்டம்",
        attach: "படம் பயன்படுத்த",
        removePhoto: "படம் நீக்கு",
        photoAttached: "படம் இணைக்கப்பட்டது — கேட்டால் AI பகுப்பாய்வு செய்யும்.",
        imageHelper: "பாதிக்கப்பட்ட தாவரம் அல்லது இலையின் தெளிவான படம் எடுங்கள்.",
        thinking: "AI ஆலோசனை பெறுகிறது…",
        needInput: "கேள்வி எழுதுங்கள், மைக் பயன்படுத்துங்கள், அல்லது படம் சேர்க்கவும்.",
        climateToday: "இன்றைய வானிலை:",
        loading: "ஏற்றுகிறது...",
        unavailable: "கிடைக்கவில்லை",
        appTitle: "விவசாய ஆலோசனை அமைப்பு",
        placeholder: "உங்கள் கேள்வியை உள்ளிடவும்...",
        ask: "கேள்",
        response: "பதில்:",
        stopListen: "நிறுத்து & மாற்று",
        processingVoice: "குரலை உரையாக மாற்றுகிறது…",
        micUnsupported: "Chrome/Edge மற்றும் மைக் அனுமதி தேவை.",
        voiceSteps: "1) தொடங்கு  2) கேள்வி பேசு  3) நிறுத்து  4) இப்போது கேள்",
        listenAnswer: "பதிலை கேளுங்கள்",
        stopAnswer: "படிப்பதை நிறுத்து",
        allowMic: "உலாவி மைக் அனுமதி கேட்டால் அனுமதியுங்கள், பின்னர் கேள்வி பேசுங்கள்."
      }
    };

    return (dict[lang] || dict.en)[key] || key;
  };

  const applyReplyMeta = (data) => {
    setReply(typeof data.reply === "string" ? data.reply : "Could not read the server response.");

    const answerLang = data.lang === "ta" ? "ta" : "en";
    setReplyLang(answerLang);

    const src = data.source;
    const model = typeof data.model === "string" ? data.model : "";
    const modelDisp = model.length > 48 ? `${model.slice(0, 46)}…` : model;
    const inputLabel =
      data.inputType === "voice"
        ? lang === "ta"
          ? "குரல் கேள்வி"
          : "Voice question"
        : data.inputType === "image"
          ? lang === "ta"
            ? "படம்"
            : "Photo"
          : data.inputType === "text+image" || data.inputType === "voice+image"
            ? lang === "ta"
              ? "உரை + படம்"
              : "Text + photo"
            : "";

    if (src === "openrouter" || src === "openai") {
      const via = inputLabel ? `${inputLabel} · ` : "";
      const langTag = answerLang === "ta" ? "தமிழில்" : "in English";
      setReplyNote(
        lang === "ta"
          ? `${via}AI பதில் (${langTag})${modelDisp ? ` · ${modelDisp}` : ""}.`
          : `${via}Answer from AI (${langTag})${modelDisp ? ` · ${modelDisp}` : ""}.`
      );
    } else if (src === "local") {
      setReplyNote("");
    } else {
      setReplyNote(typeof data.note === "string" ? data.note : "");
    }

    return answerLang;
  };

  const handleSubmit = async (opts = {}) => {
    const text = String(opts.question ?? question).trim();
    const imageFile = opts.imageFile !== undefined ? opts.imageFile : attachedImage;
    const hasImage = Boolean(imageFile);

    if (!text && !hasImage) {
      setReply(t("needInput"));
      setReplyNote("");
      return;
    }

    let inputType = "text";
    if (hasImage && text) inputType = opts.fromVoice ? "voice+image" : "text+image";
    else if (hasImage) inputType = "image";
    else if (opts.fromVoice) inputType = "voice";

    setIsAsking(true);
    setReplyNote(t("thinking"));
    setReply("");

    try {
      let imagePayload;
      if (imageFile) {
        imagePayload = await fileToCompressedDataUrl(imageFile);
      }

      const res = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          image: imagePayload,
          inputType,
          lang
        })
      });

      const data = await res.json().catch(() => ({}));
      const answerLang = applyReplyMeta(data);

      // Store the last question and image for language switching
      setLastQuestion(text);
      setLastImageFile(imageFile);
      setLastInputType(inputType);

      const shouldSpeak = opts.speakReply ?? false;
      if (shouldSpeak && typeof data.reply === "string" && data.reply.trim()) {
        setIsSpeaking(true);
        const ok = speakFarmerReply(data.reply, answerLang, { onEnd: () => setIsSpeaking(false) });
        if (!ok) setIsSpeaking(false);
      }

      // Save query to history
      if (data.reply) {
        try {
          const storageKey = "farmerAdvisory_history";
          const existingHistory = JSON.parse(localStorage.getItem(storageKey) || "[]");
          
          const historyItem = {
            id: Date.now().toString(),
            question: text,
            reply: data.reply,
            language: lang,
            replyLanguage: answerLang,
            inputType,
            hasImage: hasImage,
            timestamp: new Date().toISOString(),
            model: data.model || null,
            source: data.source || null
          };
          
          existingHistory.unshift(historyItem);
          // Keep only last 100 queries
          if (existingHistory.length > 100) {
            existingHistory.pop();
          }
          localStorage.setItem(storageKey, JSON.stringify(existingHistory));
        } catch (err) {
          console.warn("Failed to save query to history:", err);
          // Don't show error to user - history is optional
        }
      }
    } catch {
      setReply("Could not reach the advisory server. Start the backend (port 5000) and try again.");
      setReplyNote("");
    } finally {
      setIsAsking(false);
    }
  };

  const openMicModal = () => {
    stopSpeaking();
    setIsMicOpen(true);
  };

  const closeMicModal = async () => {
    if (speechStatus === "listening" || speechStatus === "requesting") {
      await finishListening();
    }
    stopSpeaking();
    setIsMicOpen(false);
  };

  const useSpeechText = () => {
    if (!speechText?.trim()) return;
    stopListening();
    setQuestion(speechText.trim());
    closeMicModal();
  };

  const onPickImage = (file) => {
    setSelectedImage(file || null);
  };

  const askWithVoice = async () => {
    if (isAsking) return;
    let text = speechText?.trim() || "";
    if (speechStatus === "listening" || speechStatus === "requesting") {
      text = (await finishListening()) || "";
    }
    if (!text) return;
    setQuestion(text);
    closeMicModal();
    await handleSubmit({ question: text, fromVoice: true, speakReply: true });
  };

  const onVoiceToggle = async () => {
    if (speechStatus === "listening" || speechStatus === "requesting") {
      await finishListening();
      return;
    }
    await startListening();
  };

  const toggleReadAloud = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    if (!reply?.trim()) return;
    setIsSpeaking(true);
    const ok = speakFarmerReply(reply, replyLang, { onEnd: () => setIsSpeaking(false) });
    if (!ok) setIsSpeaking(false);
  };

  const confirmAttachedImage = () => {
    if (!selectedImage) return;
    setAttachedImage(selectedImage);
    setIsImageOpen(false);
  };

  const clearAttachedImage = () => {
    setAttachedImage(null);
    setSelectedImage(null);
  };

  useEffect(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, [lang]);

  // Handle language change - re-fetch response in new language
  useEffect(() => {
    if (lastQuestion && reply && replyLang !== lang && !isAsking) {
      const timer = setTimeout(() => {
        handleSubmit({ question: lastQuestion, imageFile: lastImageFile });
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, lastQuestion, replyLang]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      stopSpeaking();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchTemperature = async (latitude, longitude) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch weather");
      const data = await res.json();
      const temp = data?.current?.temperature_2m;

      if (typeof temp !== "number") {
        throw new Error("Temperature missing");
      }

      if (!cancelled) {
        setTemperatureC(temp);
        setClimateStatus("ready");
      }
    };

    if (!navigator.geolocation) {
      setClimateStatus("unavailable");
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchTemperature(pos.coords.latitude, pos.coords.longitude).catch(() => {
          if (!cancelled) setClimateStatus("unavailable");
        });
      },
      () => {
        if (!cancelled) setClimateStatus("unavailable");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const previewSource = selectedImage || attachedImage;

  useEffect(() => {
    if (!previewSource) {
      if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
      setSelectedImageUrl("");
      return;
    }

    const url = URL.createObjectURL(previewSource);
    setSelectedImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSource]);

  const isModalOpen = isMicOpen || isImageOpen;

  return (
    <div className={styles.page}>
      {!isModalOpen && (
        <div className={styles.sideControls}>
          <button
            type="button"
            aria-label={t("addAria")}
            onClick={() => {
              setSelectedImage(attachedImage);
              setIsImageOpen(true);
            }}
            className={styles.iconButton}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 5V19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M5 12H19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            aria-label={t("micAria")}
            onClick={openMicModal}
            className={styles.iconButton}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 14C13.6569 14 15 12.6569 15 11V7C15 5.34315 13.6569 4 12 4C10.3431 4 9 5.34315 9 7V11C9 12.6569 10.3431 14 12 14Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M19 11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 18V21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M8 21H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {isMicOpen && (
        <div onClick={closeMicModal} className={styles.modalOverlay}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={styles.modal}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>{t("voiceTitle")}</div>
              <button
                type="button"
                onClick={closeMicModal}
                className={styles.closeButton}
                aria-label={t("closeAria")}
              >
                ×
              </button>
            </div>

            {!speechSupported ? (
              <div className={styles.errorText}>{t("micUnsupported")}</div>
            ) : (
              <>
                <div className={styles.helperText}>{t("voiceSteps")}</div>
                <div className={styles.helperText}>{t("allowMic")}</div>
              </>
            )}

            <div
              className={`${styles.speechBox} ${
                speechStatus === "listening" || speechStatus === "processing"
                  ? styles.speechBoxActive
                  : ""
              }`}
            >
              {speechStatus === "requesting"
                ? t("loading")
                : speechStatus === "processing"
                  ? t("processingVoice")
                  : speechText
                    ? speechText
                    : speechStatus === "listening"
                      ? t("listen")
                      : t("voiceHint")}
            </div>

            {speechError && (
              <div className={styles.errorText}>{speechError}</div>
            )}

            <div className={styles.actionRow}>
              <button
                type="button"
                onClick={onVoiceToggle}
                disabled={
                  !speechSupported || speechStatus === "requesting" || speechStatus === "processing"
                }
                className={`${styles.primaryButton} ${!speechSupported ? styles.disabledButton : ""}`}
              >
                {speechStatus === "listening" || speechStatus === "requesting"
                  ? t("stopListen")
                  : t("start")}
              </button>

              <button
                type="button"
                onClick={useSpeechText}
                disabled={!speechText}
                className={`${styles.secondaryButton} ${!speechText ? styles.disabledButton : ""}`}
              >
                {t("useText")}
              </button>

              <button
                type="button"
                onClick={askWithVoice}
                disabled={isAsking || speechStatus === "processing"}
                className={`${styles.primaryButton} ${isAsking ? styles.disabledButton : ""}`}
              >
                {t("askNow")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isImageOpen && (
        <div onClick={() => setIsImageOpen(false)} className={styles.modalOverlay}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${styles.modal} ${styles.modalWide}`}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>{t("imageTitle")}</div>
              <button
                type="button"
                onClick={() => setIsImageOpen(false)}
                className={styles.closeButton}
                aria-label={t("closeAria")}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPickImage(e.target.files?.[0] || null)}
              />
            </div>

            {selectedImageUrl && (
              <div className={styles.previewPanel}>
                <div className={styles.previewLabel}>
                  {t("preview")}: {selectedImage?.name}
                </div>
                <img
                  src={selectedImageUrl}
                  alt="Selected plant"
                  className={styles.previewImg}
                />
              </div>
            )}

            <div className={styles.actionRow}>
              <button
                type="button"
                onClick={confirmAttachedImage}
                disabled={!selectedImage}
                className={`${styles.primaryButton} ${!selectedImage ? styles.disabledButton : ""}`}
              >
                {t("attach")}
              </button>

              <div className={styles.helperText}>
                {t("imageHelper")}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isModalOpen && (
        <div className={styles.climateBadge}>
          <strong>{t("climateToday")}</strong>{" "}
          {climateStatus === "ready"
            ? `${Math.round(temperatureC)}°C`
            : climateStatus === "loading"
              ? t("loading")
              : t("unavailable")}
        </div>
      )}

      {!isModalOpen && (
        <div className={styles.card}>
          <h2 className={styles.title}>{t("appTitle")}</h2>

          {attachedImage && selectedImageUrl && (
            <div className={styles.attachedRow}>
              <img src={selectedImageUrl} alt="" className={styles.attachedThumb} />
              <div className={styles.attachedInfo}>
                {t("photoAttached")}
                <br />
                <button type="button" className={styles.removeAttach} onClick={clearAttachedImage}>
                  {t("removePhoto")}
                </button>
              </div>
            </div>
          )}

          <div className={styles.row}>
            <input
              type="text"
              placeholder={t("placeholder")}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isAsking) handleSubmit();
              }}
              className={styles.input}
              disabled={isAsking}
            />

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isAsking}
              className={styles.primaryButton}
            >
              {isAsking ? t("thinking") : t("ask")}
            </button>
          </div>

          <div className={styles.responseBox}>
            <strong>{t("response")}</strong>
            {reply?.trim() && (
              <ul style={{ marginTop: '10px', paddingLeft: '20px', lineHeight: '1.6' }}>
                {formatReplyAsPoints(reply).map((point, idx) => (
                  <li key={idx} style={{ marginBottom: '8px' }}>
                    {point}
                  </li>
                ))}
              </ul>
            )}
            {reply?.trim() ? (
              <div className={styles.responseActions}>
                <button type="button" className={styles.listenReplyBtn} onClick={toggleReadAloud}>
                  {isSpeaking ? t("stopAnswer") : t("listenAnswer")}
                </button>
              </div>
            ) : null}
            {replyNote ? <div className={styles.responseMeta}>{replyNote}</div> : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default FarmerChat;