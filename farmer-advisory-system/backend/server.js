require("dotenv").config();

const { detectReplyLanguage } = require("./detectReplyLanguage");

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const data = require("./advisory.json");

const app = express();
const PORT = process.env.PORT || 5000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Models to try in order. `openrouter/free` lets OpenRouter pick an available free model
 * (better than hammering one model that returns 429).
 */
const DEFAULT_OPENROUTER_MODELS = [
  "openrouter/free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-2-9b-it:free"
];

/** Free OpenRouter models that accept image + text (used when farmer uploads a photo). */
const DEFAULT_VISION_MODELS = [
  "openrouter/free",
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free"
];

const envModelList = process.env.OPENROUTER_MODELS
  ? process.env.OPENROUTER_MODELS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : process.env.OPENROUTER_MODEL
    ? [process.env.OPENROUTER_MODEL.trim()].filter(Boolean)
    : [];

/** Vision-only env list (do NOT reuse text OPENROUTER_MODEL — text models cannot analyze photos). */
const envVisionModelList = process.env.OPENROUTER_VISION_MODELS
  ? process.env.OPENROUTER_VISION_MODELS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

const FREE_ROUTER_MODEL = "openrouter/free";

const buildModelList = (defaults, envList) => {
  const merged =
    envList.length > 0
      ? [...envList, ...defaults.filter((m) => !envList.includes(m))]
      : [...defaults];
  const withoutRouter = merged.filter((m) => m !== FREE_ROUTER_MODEL);
  return [FREE_ROUTER_MODEL, ...withoutRouter];
};

const OPENROUTER_MODEL_LIST = buildModelList(DEFAULT_OPENROUTER_MODELS, envModelList);
const OPENROUTER_VISION_MODEL_LIST = buildModelList(DEFAULT_VISION_MODELS, envVisionModelList);

const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES) || 6 * 1024 * 1024;
const VOICERSS_API_KEY = process.env.VOICERSS_API_KEY;

const openrouter = OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      timeout: Number(process.env.OPENROUTER_TIMEOUT_MS) || 55000,
      maxRetries: 0,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Farmer Advisory System"
      }
    })
  : null;

/** Optional paid fallback when all OpenRouter attempts fail (set OPENAI_API_KEY in .env). */
const openaiDirect = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: Number(process.env.OPENAI_TIMEOUT_MS) || 60000,
      maxRetries: 0
    })
  : null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getHttpStatus = (err) => {
  if (typeof err?.status === "number") return err.status;
  if (typeof err?.response?.status === "number") return err.response.status;
  return null;
};

const shouldBackoffRetry = (err) => {
  if (isModelUnavailableError(err)) return false;
  const s = getHttpStatus(err);
  if (s === 429 || s === 503 || s === 502) return true;
  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("overloaded") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("econnreset")
  );
};

/** 404 / unknown model slug — try next model immediately, do not retry or show raw error to farmer. */
const isModelUnavailableError = (err) => {
  const s = getHttpStatus(err);
  if (s === 404 || s === 400) return true;
  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes("404") ||
    msg.includes("no endpoints found") ||
    msg.includes("not found") ||
    msg.includes("does not exist") ||
    msg.includes("invalid model") ||
    msg.includes("no provider")
  );
};

const isBadModelReply = (text) => {
  const t = String(text || "").trim();
  if (!t) return true;
  return /^(404|429|502|503)\b|no endpoints found|provider returned error|invalid model/i.test(t);
};

/**
 * Retries transient OpenRouter / network errors (especially 429 on free tier).
 */
async function chatCompletionWithBackoff(client, body, { maxAttempts = 4, baseDelayMs = 2000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await client.chat.completions.create(body);
    } catch (err) {
      lastErr = err;
      const canRetry = attempt < maxAttempts - 1 && shouldBackoffRetry(err);
      if (!canRetry) throw err;
      const jitter = Math.floor(Math.random() * 600);
      const delay = baseDelayMs * 2 ** attempt + jitter;
      console.warn(
        `[chat] model=${body.model} attempt ${attempt + 1}/${maxAttempts} failed (${String(err?.message || err).slice(0, 120)}), waiting ${delay}ms`
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

app.use(cors());
app.use(express.json({ limit: "12mb" }));

// Root route (browser test)
app.get("/", (req, res) => {
  res.send("Server running da 🚀");
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    openrouterConfigured: Boolean(OPENROUTER_API_KEY),
    openaiFallbackConfigured: Boolean(openaiDirect),
    textModels: OPENROUTER_MODEL_LIST,
    visionModels: OPENROUTER_VISION_MODEL_LIST
  });
});

const getFarmerSystemPrompt = (lang, hasImage) => {
  const isTamil = lang === "ta";
  const languageRule = isTamil
    ? "CRITICAL LANGUAGE RULE: The farmer may ask in Tamil script OR Tanglish (Tamil words in English letters). " +
      "Write your ENTIRE answer ONLY in Tamil script (தமிழ்). Use simple spoken Tamil for rural farmers. " +
      "Do NOT answer in English. Do not add English summaries, word counts, or meta notes."
    : "CRITICAL LANGUAGE RULE: Write your ENTIRE answer ONLY in English. Do NOT write in Tamil or mix languages.";

  if (hasImage) {
    return (
      "You are an AI plant doctor for smallholder farmers in India. The farmer sent a photo of a crop or plant. " +
      "1) Identify visible symptoms (spots, powdery patches, yellowing, wilting, holes, pests). " +
      "2) Name the most likely problem (e.g. powdery mildew, leaf spot, nutrient deficiency, pest damage). " +
      "3) Give safe, practical treatment steps (cultural practices first, then approved sprays if needed). " +
      languageRule +
      " Keep the reply under about 350 words."
    );
  }

  return (
    "You are an AI assistant for smallholder farmers in India. Answer the farmer's actual question first. " +
    "Give practical, safe, step-by-step advice. If details are missing (crop, stage, symptoms), give your best guidance first, then ask 1-2 short clarifying questions. " +
    languageRule +
    " Keep the reply under about 350 words."
  );
};

const parseImageDataUrl = (raw) => {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const s = raw.trim();
  const match = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (match) {
    return { mime: match[1], base64: match[2], dataUrl: s };
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 100) {
    const dataUrl = `data:image/jpeg;base64,${s.replace(/\s/g, "")}`;
    return { mime: "image/jpeg", base64: s.replace(/\s/g, ""), dataUrl };
  }
  return null;
};

const buildUserMessage = (question, imageParsed, lang = "en") => {
  if (!imageParsed) {
    const langNote =
      lang === "ta" ? "\n\n[பதில் முழுவதும் தமிழில் மட்டும் எழுதுங்கள்]" : "\n\n[Reply in English only]";
    return { role: "user", content: question + langNote };
  }
  const text =
    question ||
    (lang === "ta"
      ? "இந்த பயிர்/தாவர புகைப்படத்தில் உள்ள நோய் அல்லது பிரச்சனை என்ன? காரணம் மற்றும் தீர்வு தமிழில் சொல்லுங்கள்."
      : "Look at this plant photo. Identify the disease or problem, explain the cause, and give step-by-step treatment advice for a farmer.");
  const langNote =
    lang === "ta" ? "\n\n[பதில் முழுவதும் தமிழில்]" : "\n\n[Reply in English only]";
  return {
    role: "user",
    content: [
      { type: "text", text: text + langNote },
      { type: "image_url", image_url: { url: imageParsed.dataUrl } }
    ]
  };
};

const detectInputType = (question, hasImage, clientType) => {
  if (typeof clientType === "string" && clientType.trim()) return clientType.trim();
  if (hasImage && question) return "text+image";
  if (hasImage) return "image";
  return "text";
};

async function askOpenRouter({ question, imageParsed, inputType, lang = "en" }) {
  const hasImage = Boolean(imageParsed);
  if (hasImage) {
    const approxBytes = Math.ceil((imageParsed.base64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return {
        error: `Image is too large (max about ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB). Use a smaller photo.`
      };
    }
  }

  const messages = [
    {
      role: "system",
      content: getFarmerSystemPrompt(lang, hasImage)
    },
    buildUserMessage(question, imageParsed, lang)
  ];

  const modelList = hasImage ? OPENROUTER_VISION_MODEL_LIST : OPENROUTER_MODEL_LIST;
  let lastError = null;

  for (const model of modelList) {
    try {
      const completion = await chatCompletionWithBackoff(
        openrouter,
        {
          model,
          temperature: 0.4,
          max_tokens: 900,
          messages
        },
        { maxAttempts: hasImage ? 3 : 4, baseDelayMs: 2000 }
      );

      const reply = completion?.choices?.[0]?.message?.content?.trim();
      if (reply && !isBadModelReply(reply)) {
        return {
          reply,
          source: "openrouter",
          model: completion?.model || model,
          inputType,
          lang
        };
      }
    } catch (e) {
      lastError = e;
      const message = typeof e?.message === "string" ? e.message : String(e);
      const safeError = message.length > 220 ? message.slice(0, 220) + "..." : message;
      console.error(`OpenRouter request failed (model ${model}):`, safeError);
      if (isModelUnavailableError(e)) {
        continue;
      }
    }
  }

  if (openaiDirect) {
    const oaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
    try {
      const completion = await chatCompletionWithBackoff(
        openaiDirect,
        {
          model: oaiModel,
          temperature: 0.4,
          max_tokens: 900,
          messages
        },
        { maxAttempts: 2, baseDelayMs: 2000 }
      );
      const reply = completion?.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return {
          reply,
          source: "openai",
          model: completion?.model || oaiModel,
          inputType,
          lang
        };
      }
    } catch (e) {
      lastError = e;
      console.error(`OpenAI fallback failed:`, String(e?.message || e).slice(0, 220));
    }
  }

  const message = lastError && (typeof lastError.message === "string" ? lastError.message : String(lastError));
  const safeError = message && message.length > 300 ? message.slice(0, 300) + "..." : message;

  return {
    reply: hasImage
      ? getHeuristicImageReply(question, lang)
      : getHeuristicFarmerReply(question || "plant photo", lang),
    source: "fallback",
    inputType,
    lang,
    note:
      lang === "ta"
        ? "AI படப் பகுப்பாய்வு இப்போது இல்லை (OpenRouter வரம்பு). பொது ஆலோசனை காட்டப்படுகிறது. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்."
        : "Photo AI analysis is temporarily unavailable (OpenRouter rate limits or model busy). Showing general guidance — try again in a minute.",
    error: safeError || undefined
  };
}

const normalizeQuestion = (text) => {
  let q = String(text || "").toLowerCase();

  const cropSynonyms = {
    nel: ["rice", "paddy", "rice plant", "paddy plant"],
    vazhai: ["banana", "banana plant"],
    thakkali: ["tomato", "tomato plant"],
    karumbu: ["sugarcane", "sugar cane"],
    paruthi: ["cotton", "cotton plant"]
  };

  for (const [canonical, list] of Object.entries(cropSynonyms)) {
    for (const term of list) {
      if (q.includes(term)) {
        q = q.replaceAll(term, canonical);
      }
    }
  }

  q = q.replaceAll(" leaves", " leaf");
  q = q.replaceAll(" leafs", " leaf");
  q = q.replaceAll("yellowing", "yellow");
  q = q.replaceAll("yellow leaf", "yellow leaves");

  return q;
};

/**
 * Fallback when vision AI is unavailable — still helpful for common photo symptoms.
 */
const getHeuristicImageReply = (rawQuestion, lang = "en") => {
  const isTa = lang === "ta";
  const q = String(rawQuestion || "").toLowerCase();

  if (/powder|mildew|white patch|white spot|fungus|fungal|spot|disease|blight|mold/.test(q)) {
    return isTa
      ? "படத்தில் வெள்ளை/பொடி படலம் (powdery mildew) போல் தெரிகிறது:\n\n" +
          "1) பாதிக்கப்பட்ட இலைகளை சேகரித்து அகற்றுங்கள்; குப்பையில் வைக்காதீர்கள்.\n\n" +
          "2) தாவரங்களுக்கு இடையே காற்றோட்டம் அதிகரிக்கவும்; இலைகளில் இரவில் தண்ணீர் பாய்ச்ச வேண்டாம்.\n\n" +
          "3) உங்கள் பயிருக்கு அனுமதிக்கப்பட்ட காரண்டு/பூஞ்சைக் கொல்லி (fungicide) — உள்ளூர் விவசாய அலுவலர் பரிந்துரை பெறுங்கள்.\n\n" +
          "4) அடுத்த பருவத்தில் பயிர் மாற்றம் செய்யுங்கள்.\n\n" +
          "பயிர் பெயர் சொன்னால் குறிப்பிட்ட மருந்து/அளவு பற்றி துல்லியமாக சொல்லலாம்."
      : "From your description and typical leaf photos like this, white powdery patches often indicate **powdery mildew** (a fungal disease):\n\n" +
          "1) Remove and destroy heavily infected leaves; do not compost them.\n\n" +
          "2) Improve air flow between plants; avoid overhead watering at night.\n\n" +
          "3) Ask your local agriculture office for a fungicide approved for your crop (e.g. sulfur or other recommended product in your region).\n\n" +
          "4) Rotate crops next season if possible.\n\n" +
          "Tell us the crop name for more specific product and dosage advice.";
  }

  return isTa
    ? "படத்தை AI இப்போது பார்க்க முடியவில்லை. பொது வழிகாட்டுதல்:\n\n" +
        "1) இலையில் வெள்ளை படலம், கரும்புள்ளி, மஞ்சள், கரி இடங்கள், துளைகள், புழு ஆகியவற்றை கவனியுங்கள்.\n\n" +
        "2) பாதிக்கப்பட்ட இலைகளை பிரித்து அகற்றுங்கள்; காரண்டு/பூஞ்சைக் கொல்லி உள்ளூர் அலுவலர் மூலம் பயன்படுத்துங்கள்.\n\n" +
        "3) பயிர் பெயர், அறிகுறி விவரம் சொல்லி மீண்டும் கேளுங்கள் அல்லது சிறிது நேரம் கழித்து படம் மீண்டும் அனுப்புங்கள்."
    : "The photo could not be analyzed by AI right now. General guidance:\n\n" +
        "1) Check for white powder, spots, yellowing, wilting, holes, or insects on the leaves.\n\n" +
        "2) Remove badly affected leaves; contact your agriculture officer for an approved fungicide or pesticide for your crop.\n\n" +
        "3) Try again in a minute, or tell us the crop name and what you see on the leaf.";
};

/**
 * When the LLM is down, missing, or returns nothing, still answer in line with the question.
 */
const getHeuristicFarmerReply = (rawQuestion, lang = "en") => {
  const isTa = lang === "ta";
  const q = String(rawQuestion || "").toLowerCase();

  if (/brown|brownish|tan|rust|scorch|burned|burnt|dry patch|crispy/.test(q)) {
    return (
      "Here is focused guidance for discolored or brown-looking plant parts:\n\n" +
      "1) Watering: Check soil a few centimeters down. Soggy soil for days can cause root rot (often yellow then brown, wilting). Very dry soil can cause leaf edges or tips to brown (drought stress).\n\n" +
      "2) Sun and heat: Sudden browning on the side facing the sun can be sunscorch - add light shade during the hottest hours if needed.\n\n" +
      "3) Disease: Irregular brown spots with yellow halos, or fuzzy growth, may be fungal - improve airflow, avoid wetting foliage at night, and ask your local agriculture office for approved fungicides for your crop.\n\n" +
      "4) Fertilizer: Brown leaf tips sometimes follow over-fertilizing or salty soil; flush with clean water only if drainage is good and it fits your crop.\n\n" +
      "Reply with your crop name, growth stage, and whether spots are on old or new leaves for more specific steps."
    );
  }

  if (/yellow|chlorosis|pale|light green/.test(q)) {
    return (
      "Yellowing often ties to nitrogen shortage, waterlogging, pests, or disease - depending on pattern:\n\n" +
      "• Older leaves yellowing first while veins stay green can suggest magnesium or nitrogen issues (crop-dependent).\n\n" +
      "• New leaves yellow while veins stay dark may be iron-related in some crops.\n\n" +
      "• Uniform yellow with wilting: check roots and drainage.\n\n" +
      "• Mottled yellow with tiny dots on the leaf underside: inspect for mites.\n\n" +
      "Share crop, soil type, and a short description of which leaves are affected for tighter advice."
    );
  }

  if (/wilt|wilting|drooping|limp|soft stem|vaadi|vadi|vaadiya|wilting/.test(q)) {
    return isTa
      ? "தாவரம் வாடுவதற்கான முக்கிய காரணங்கள்:\n\n" +
          "1) மண் வறண்டிருந்தால்: வேர் பகுதியில் நன்கு தண்ணீர் பாய்ச்சுங்கள்; மேல் மண் உலர்ந்த பிறகு மீண்டும் தண்ணீர் கொடுங்கள்.\n\n" +
          "2) மண் எப்போதும் ஈரமாக இருந்தால், துர்நாற்றம் வந்தால்: தண்ணீர் குறைத்து, வடிகால் சரி செய்யுங்கள்; வேர் அழுகல் இருக்கலாம் - உழவர் அலுவலரை அணுகுங்கள்.\n\n" +
          "3) சில கிளைகள் மட்டும் வாடினால்: தண்டு புழு, பக்கோடு அல்லது பாக்டீரியா பாதிப்பு பார்க்கவும்.\n\n" +
          "பயிர் பெயர், மழை/பாசனம் விவரம் சொன்னால் துல்லியமான ஆலோசனை தரலாம்."
      : "Wilting is either too little water reaching the plant, or roots unable to take water (rot, disease, severe compaction):\n\n" +
          "1) If soil is dry: water deeply at the root zone; repeat when the top layer dries appropriately for that crop.\n\n" +
          "2) If soil is wet and smells sour or roots are brown/black: reduce watering, improve drainage, and seek local advice on root rot treatment.\n\n" +
          "3) If only some branches wilt: look for stem borers, cankers, or bacterial ooze.\n\n" +
          "Mention your crop and recent rainfall or irrigation for clearer next steps.";
  }

  if (/spot|spots|fungus|mildew|mold|blight|rot/.test(q)) {
    return (
      "Spots, patches, or fuzzy growth usually need a clear pattern to treat safely:\n\n" +
      "• Separate fungal (often circular spots, sometimes rings) from bacterial (water-soaked, angular between veins) and from physical hail or spray damage.\n\n" +
      "• General care: remove heavily infected leaves if practical, avoid overhead irrigation, space plants for air flow, and rotate crops next season where possible.\n\n" +
      "Always use crop-specific chemicals approved in your region - your local extension officer can match the symptom to the right product."
    );
  }

  if (/insect|pest|worm|caterpillar|aphid|mite|beetle|hole|chew|bore/.test(q)) {
    return (
      "For insect or pest damage:\n\n" +
      "1) Identify what you see (holes, chewed edges, sticky honeydew, webs, larvae color) and whether damage is on new growth or older leaves.\n\n" +
      "2) Many pests are managed with timing - spray only when thresholds are met and use products labeled for your crop.\n\n" +
      "3) Encourage predators (fewer broad-spectrum sprays) and remove heavily infested plant parts when reasonable.\n\n" +
      "Send the crop name and whether pests are under the leaves or inside stems for more targeted options."
    );
  }

  if (/flower|fruit|bud|blossom|pod/.test(q)) {
    return (
      "Flower or fruit problems depend heavily on crop and stage:\n\n" +
      "• Flower drop: often temperature stress, drought, nutrient imbalance, or excessive nitrogen.\n\n" +
      "• Fruit cracking: irregular watering or certain nutrient issues.\n\n" +
      "• Poor fruit set: pollination, heat, or boron/calcium (crop-specific).\n\n" +
      "State the crop, whether plants are in field or pot, and your general region’s season for better guidance."
    );
  }

  return isTa
    ? "உங்கள் கேள்விக்கான பொது வழிகாட்டுதல்:\n\n" +
        "1) பயிர் பெயர், வயது (நாற்று/பூக்கும் நிலை) சொல்லுங்கள்.\n\n" +
        "2) இலை, தண்டு, வேரில் என்ன அறிகுறி தெரிகிறது என்று விவரியுங்கள்.\n\n" +
        "3) தண்ணீர், உரம், பூச்சிமருந்து, வானிலை (மழை/வெயில்) குறித்து சொல்லுங்கள்.\n\n" +
        "4) பிரச்சனை பரவினால் அருகிலுள்ள விவசாய அலுவலரை அணுகுங்கள்.\n\n" +
        "இந்த விவரங்களுடன் மீண்டும் கேட்டால் துல்லியமான பதில் கிடைக்கும்."
    : "Practical first steps for your question:\n\n" +
        "1) Name the crop and variety if you know it, and the growth stage (seedling, flowering, etc.).\n\n" +
        "2) Describe symptoms on upper vs lower leaf sides, stems, and roots if visible.\n\n" +
        "3) Note soil moisture, recent fertilizer or pesticide, and weather (heavy rain, heat wave).\n\n" +
        "4) For serious or spreading damage, contact your nearest agriculture department - they can recommend approved treatments for your area.\n\n" +
        "You can ask again with those details for more specific advice.";
};

const TRANSCRIBE_MODELS = [
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemini-2.5-flash-preview-05-20",
  "google/gemini-2.0-flash-001:free",
  "openrouter/free"
];

/** Turn recorded farmer audio into text (Tamil or English) via OpenRouter. */
app.post("/transcribe", async (req, res) => {
  const audioParsed = parseImageDataUrl(req.body?.audio);
  const lang = req.body?.lang === "ta" ? "ta" : "en";

  if (!audioParsed) {
    return res.status(400).json({ error: "No audio received. Speak again and retry." });
  }

  if (!openrouter) {
    return res.status(503).json({
      error: "Voice transcription needs OPENROUTER_API_KEY in backend .env."
    });
  }

  const langHint =
    lang === "ta"
      ? "The farmer chose Tamil. Write the transcript in Tamil (தமிழ் script preferred). Output only the farmer's question, nothing else."
      : "The farmer chose English. Write the transcript in English only. Output only the farmer's question, nothing else.";

  const format = audioParsed.mime.includes("webm")
    ? "webm"
    : audioParsed.mime.includes("wav")
      ? "wav"
      : audioParsed.mime.includes("mp3")
        ? "mp3"
        : "webm";

  let lastError = null;
  for (const model of TRANSCRIBE_MODELS) {
    try {
      const completion = await chatCompletionWithBackoff(
        openrouter,
        {
          model,
          temperature: 0,
          max_tokens: 400,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "Listen to this farmer's voice message about crops or plants. " +
                    langHint +
                    " Reply with ONLY the farmer's question as plain text, nothing else."
                },
                {
                  type: "input_audio",
                  input_audio: {
                    data: audioParsed.base64,
                    format
                  }
                }
              ]
            }
          ]
        },
        { maxAttempts: 2, baseDelayMs: 1500 }
      );

      const transcript = completion?.choices?.[0]?.message?.content?.trim();
      if (transcript) {
        return res.json({ transcript, source: "openrouter", model: completion?.model || model });
      }
    } catch (e) {
      lastError = e;
      console.error(`Transcribe failed (${model}):`, String(e?.message || e).slice(0, 160));
    }
  }

  return res.status(502).json({
    error:
      "Could not understand the recording. Speak clearly in Tamil or English, or type your question.",
    detail: lastError ? String(lastError.message || lastError).slice(0, 200) : undefined
  });
});

// Main API — text, voice (transcribed text), and/or plant image
app.post("/ask", async (req, res) => {
  const rawQuestion = typeof req.body?.question === "string" ? req.body.question : "";
  const question = rawQuestion.trim();
  const imageParsed = parseImageDataUrl(req.body?.image);
  const clientInputType = req.body?.inputType;
  const uiLang = req.body?.lang === "ta" ? "ta" : "en";
  const replyLang = question ? detectReplyLanguage(question, uiLang) : uiLang;

  if (!question && !imageParsed) {
    return res.status(400).json({
      reply: "Please type a question, speak using the microphone, or upload a plant photo."
    });
  }

  if (imageParsed && !openrouter) {
    return res.status(400).json({
      reply: "Photo analysis needs OPENROUTER_API_KEY in backend .env. Text-only guidance is available without it."
    });
  }

  const inputType = detectInputType(question, Boolean(imageParsed), clientInputType);

  // Local JSON advisory (English only) — skip for Tamil / Tanglish questions
  if (replyLang !== "ta" && !imageParsed && question) {
    const questionLower = normalizeQuestion(question);
    const result = data.find(
      (item) => questionLower.includes(item.crop) && questionLower.includes(item.issue)
    );
    if (result) {
      return res.json({ reply: result.solution, source: "local", inputType, lang: replyLang });
    }
  }

  if (!openrouter) {
    return res.json({
      reply: getHeuristicFarmerReply(question, replyLang),
      source: "fallback",
      inputType,
      lang: replyLang,
      note:
        replyLang === "ta"
          ? "AI அமைப்பு இல்லை (OPENROUTER_API_KEY). பொது ஆலோசனை."
          : "AI not configured (OPENROUTER_API_KEY). Showing general guidance for your question."
    });
  }

  const outcome = await askOpenRouter({ question, imageParsed, inputType, lang: replyLang });
  if (outcome.error && !outcome.reply) {
    return res.status(400).json({
      reply:
        replyLang === "ta"
          ? "படம் அல்லது கேள்வியை செயலாக்க முடியவில்லை. சிறிய படம் மற்றும் மீண்டும் முயற்சிக்கவும்."
          : outcome.error,
      source: "error",
      inputType,
      lang: replyLang
    });
  }
  return res.json({ ...outcome, lang: outcome.lang || replyLang });
});

/** Text-to-Speech endpoint - uses best available service for natural Tamil voice */
app.post("/tts", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  const lang = req.body?.lang === "ta" ? "ta" : "en";

  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    // For Tamil, use VoiceRSS which has excellent Tamil support
    // VoiceRSS is free for personal/educational use
    if (lang === "ta") {
      if (!VOICERSS_API_KEY) {
        throw new Error("VOICERSS_API_KEY not configured");
      }
      const textToSpeak = text.slice(0, 500); // VoiceRSS limit
      const voiceCode = "ta-in"; // Tamil India voice
      const voiceRSSUrl = `https://api.voicerss.org/?key=${VOICERSS_API_KEY}&hl=${voiceCode}&v=Google%20Tamil&src=${encodeURIComponent(textToSpeak)}&r=2&c=mp3&f=16khz_16bit_stereo`;

      const ttsRes = await fetch(voiceRSSUrl, { timeout: 10000 });

      if (!ttsRes.ok) {
        throw new Error(`VoiceRSS failed: ${ttsRes.status}`);
      }

      const audioBuffer = await ttsRes.arrayBuffer();
      
      // Check if response is valid audio
      if (audioBuffer.byteLength < 1000) {
        throw new Error("VoiceRSS returned invalid audio data");
      }

      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "no-cache");
      res.send(Buffer.from(audioBuffer));
      return;
    }

    // For English, use Google Translate TTS
    const textToSpeak = text.slice(0, 200);
    const encoded = encodeURIComponent(textToSpeak);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=en&client=tw-ob`;

    const ttsRes = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 10000
    });

    if (!ttsRes.ok) {
      throw new Error(`Google TTS failed: ${ttsRes.status}`);
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.set("Cache-Control", "no-cache");
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.warn("TTS error:", String(err?.message || err).slice(0, 150));
    return res.status(503).json({
      error: "TTS service unavailable. Browser voices will be used instead.",
      shouldFallback: true
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});