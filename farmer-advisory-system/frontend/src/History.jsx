import { useState, useEffect } from "react";
import styles from "./History.module.css";

function History({ userId, lang = "en" }) {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const t = (key) => {
    const dict = {
      en: {
        title: "Query History",
        loading: "Loading history...",
        noHistory: "No queries yet. Start by asking a question!",
        search: "Search history...",
        delete: "Delete",
        deleteConfirm: "Are you sure you want to delete this query?",
        timestamp: "Date",
        question: "Question",
        reply: "Reply",
        language: "Language",
        inputType: "Type",
        filter: "Filter:",
        filterAll: "All",
        filterTamil: "Tamil",
        filterEnglish: "English",
        filterWithImage: "With Image",
        stats: "Statistics",
        totalQueries: "Total Queries",
        tamiQueries: "Tamil Queries",
        englishQueries: "English Queries",
        imageQueries: "With Images",
        error: "Error loading history",
        deleteSuccess: "Query deleted successfully",
        source: "Source",
        model: "Model"
      },
      ta: {
        title: "கேள்வி வரலாறு",
        loading: "வரலாறு ஏற்றுகிறது...",
        noHistory: "இன்னும் கேள்விகள் இல்லை. கேள்வி கேட்ட தொடங்குங்கள்!",
        search: "வரலாறு தேடுங்கள்...",
        delete: "நீக்கு",
        deleteConfirm: "இந்த கேள்வியை நிச்சயமாக நீக்க விரும்புகிறீர்களா?",
        timestamp: "தேதி",
        question: "கேள்வி",
        reply: "பதில்",
        language: "மொழி",
        inputType: "வகை",
        filter: "வடிகட்டுங்கள்:",
        filterAll: "அனைத்து",
        filterTamil: "தமிழ்",
        filterEnglish: "ஆங்கிலம்",
        filterWithImage: "படத்தோடு",
        stats: "புள்ளிவிவரங்கள்",
        totalQueries: "மொத்த கேள்விகள்",
        tamiQueries: "தமிழ் கேள்விகள்",
        englishQueries: "ஆங்கில கேள்விகள்",
        imageQueries: "படங்களுடன்",
        error: "வரலாறு ஏற்றுவதில் பிழை",
        deleteSuccess: "கேள்வி வெற்றிகரமாக நீக்கப்பட்டது",
        source: "மூலம்",
        model: "மாதிரி"
      }
    };
    return (dict[lang] || dict.en)[key] || key;
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [history, searchTerm, selectedFilter]);

  const loadHistory = () => {
    try {
      const storageKey = "farmerAdvisory_history";
      const storedHistory = localStorage.getItem(storageKey);
      if (storedHistory) {
        const data = JSON.parse(storedHistory);
        setHistory(data);
      } else {
        setHistory([]);
      }
      setError("");
    } catch (err) {
      console.error("Error loading history:", err);
      setHistory([]);
    }
  };

  const filterHistory = () => {
    let filtered = [...history];

    // Apply search filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.question?.toLowerCase().includes(lower) ||
          item.reply?.toLowerCase().includes(lower)
      );
    }

    // Apply language/type filter
    if (selectedFilter === "tamil") {
      filtered = filtered.filter((item) => item.language === "ta");
    } else if (selectedFilter === "english") {
      filtered = filtered.filter((item) => item.language === "en");
    } else if (selectedFilter === "withImage") {
      filtered = filtered.filter((item) => item.hasImage === true);
    }

    setFilteredHistory(filtered);
  };

  const handleDelete = (id) => {
    if (window.confirm(t("deleteConfirm"))) {
      const updatedHistory = history.filter((item) => item.id !== id);
      setHistory(updatedHistory);
      localStorage.setItem("farmerAdvisory_history", JSON.stringify(updatedHistory));
      alert(t("deleteSuccess"));
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN") +
      " " +
      d.toLocaleTimeString(lang === "ta" ? "ta-IN" : "en-IN");
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("title")}</h1>

      {/* Search and Filter */}
      <div className={styles.controlsContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={t("search")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className={styles.filterGroup}>
          <label>{t("filter")}</label>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">{t("filterAll")}</option>
            <option value="tamil">{t("filterTamil")}</option>
            <option value="english">{t("filterEnglish")}</option>
            <option value="withImage">{t("filterWithImage")}</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && <div className={styles.error}>{error}</div>}

      {/* History List */}
      {filteredHistory.length === 0 && !error && (
        <div className={styles.empty}>{t("noHistory")}</div>
      )}

      {filteredHistory.length > 0 && (
        <div className={styles.historyList}>
          {filteredHistory.map((item) => (
            <div key={item.id} className={styles.historyItem}>
              <div
                className={styles.historyHeader}
                onClick={() =>
                  setExpandedId(expandedId === item.id ? null : item.id)
                }
              >
                <div className={styles.headerLeft}>
                  <div className={styles.question}>
                    {truncateText(item.question, 80)}
                  </div>
                  <div className={styles.meta}>
                    <span className={styles.timestamp}>
                      {formatDate(item.timestamp)}
                    </span>
                    <span
                      className={`${styles.badge} ${
                        item.language === "ta" ? styles.badgeTamil : ""
                      }`}
                    >
                      {item.language === "ta" ? "தமிழ்" : "English"}
                    </span>
                    {item.hasImage && (
                      <span className={`${styles.badge} ${styles.badgeImage}`}>
                        📷
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.headerRight}>
                  <span className={styles.expandIcon}>
                    {expandedId === item.id ? "▼" : "▶"}
                  </span>
                </div>
              </div>

              {expandedId === item.id && (
                <div className={styles.historyContent}>
                  <div className={styles.section}>
                    <h4>{t("question")}</h4>
                    <p>{item.question}</p>
                  </div>

                  <div className={styles.section}>
                    <h4>{t("reply")}</h4>
                    <p>{item.reply}</p>
                  </div>

                  <div className={styles.detailsGrid}>
                    <div>
                      <strong>{t("inputType")}:</strong> {item.inputType}
                    </div>
                    {item.source && (
                      <div>
                        <strong>{t("source")}:</strong> {item.source}
                      </div>
                    )}
                    {item.model && (
                      <div>
                        <strong>{t("model")}:</strong>{" "}
                        {item.model.length > 40
                          ? item.model.slice(0, 37) + "..."
                          : item.model}
                      </div>
                    )}
                  </div>

                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(item.id)}
                  >
                    {t("delete")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default History;
