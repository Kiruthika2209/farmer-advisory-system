/** Record microphone audio while the farmer speaks (fallback when live speech-to-text fails). */
export async function startAudioRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime =
    (typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus") &&
      "audio/webm;codecs=opus") ||
    (MediaRecorder.isTypeSupported("audio/webm") && "audio/webm") ||
    "";

  const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data?.size > 0) chunks.push(e.data);
  };

  return {
    recorder,
    stream,
    chunks,
    mime: recorder.mimeType || mime || "audio/webm"
  };
}

export function stopAudioRecorder(session) {
  return new Promise((resolve) => {
    if (!session?.recorder || session.recorder.state === "inactive") {
      session?.stream?.getTracks?.().forEach((t) => t.stop());
      resolve(null);
      return;
    }

    session.recorder.onstop = () => {
      session.stream?.getTracks?.().forEach((t) => t.stop());
      if (!session.chunks.length) {
        resolve(null);
        return;
      }
      const blob = new Blob(session.chunks, { type: session.mime });
      resolve(blob);
    };

    try {
      session.recorder.stop();
    } catch {
      session.stream?.getTracks?.().forEach((t) => t.stop());
      resolve(null);
    }
  });
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
