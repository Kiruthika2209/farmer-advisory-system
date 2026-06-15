/**
 * Pick reply language from the farmer's question:
 * - English question -> English answer
 * - Tamil script or Tanglish -> Tamil answer
 */
export function detectReplyLanguage(question, uiLang = "en") {
  const q = String(question || "").trim();
  if (!q) return uiLang === "ta" ? "ta" : "en";

  if (/[\u0B80-\u0BFF]/.test(q)) return "ta";

  const lower = q.toLowerCase();
  const words = lower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

  const tanglish = new Set([
    "enadhu", "enaku", "enakku", "enoda", "ennota", "enga", "engal", "engalukku", "namma", "nammal",
    "nan", "naan", "neenga", "ungal", "ungalukku", "avanga", "ivan", "ival", "ithu", "idu", "adhu",
    "eppadi", "epdi", "enna", "yenna", "yen", "yean", "sollunga", "sollu", "paaru", "vanga", "ponga",
    "thakkali", "chesi", "chedi", "maram", "poo", "ilai", "vayal", "vithai", "pazham", "pachai", "manjal",
    "vaadi", "vaadiya", "vaadiyatha", "vaaduthu", "padugiradhu", "paduthu", "kana", "kanum", "kanu",
    "nilai", "nilaiyil", "irukku", "illai", "aaguthu", "varuthu", "pannanum", "kudukka", "marundhu",
    "noi", "sogam", "poochi", "kurippu", "mann", "thanneer", "uzhavan", "nel", "vazhai", "karumbu",
    "paruthi", "valarpu", "pizham", "vilaivil", "sollungal", "theriyuma", "yaru", "evalo"
  ]);

  const english = new Set([
    "the", "my", "is", "are", "was", "what", "how", "why", "when", "where", "can", "could", "would",
    "should", "please", "help", "find", "give", "solution", "disease", "plant", "tomato", "leaf",
    "leaves", "water", "crop", "farm", "farmer", "problem", "cause", "treatment", "look", "wilted",
    "wilt", "wilting", "yellow", "brown", "spot", "spots", "this", "that", "with", "for", "and", "or"
  ]);

  let taScore = 0;
  let enScore = 0;

  for (const w of words) {
    if (tanglish.has(w)) taScore += 2;
    if (english.has(w)) enScore += 1;
  }

  if (/\b\w*(iradhu|ikkiradhu|ugiradhu|giradhu|kkanum|pannanum|aagum|aaguthu|varuthu|irukku|illai|padugiradhu|kanpadu)\b/i.test(lower)) {
    taScore += 3;
  }
  if (/\b(enadhu|ennota|ungalukku|engalukku)\b/i.test(lower)) taScore += 2;
  if (/thakkali|poo chedi|vaadiya nilai|nilaiyil kana|chedi vaadi/.test(lower)) taScore += 3;

  if (taScore > enScore) return "ta";
  if (enScore >= 2 && enScore > taScore) return "en";
  if (taScore > 0) return "ta";

  return uiLang === "ta" ? "ta" : "en";
}
