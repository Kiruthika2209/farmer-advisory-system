import { useState, useEffect } from "react";
import styles from "./LandingPage.module.css";
import logo from "./asssts/logotipo-da-planta-verde-com-uma-mao-e-um-circulo_898845-4.avif";

function LandingPage({ onProceed, lang, onLangChange }) {
  const t = (key) => {
    const dict = {
      en: {
        appName: "Farmer Advisory System",
        welcomeTitle: "Welcome to Farmer Advisory System",
        welcomeDesc: "Get expert agricultural advice in your language",
        getStarted: "Get Started",
        language: "Language"
      },
      ta: {
        appName: "விவசாய ஆலோசனை அமைப்பு",
        welcomeTitle: "விவசாய ஆலோசனை அமைப்புக்கு வாழ்ந�க்கம்",
        welcomeDesc: "உங்கள் மொழியில் வல்லுநர் விவசாய ஆலோசனை பெறுங்கள்",
        getStarted: "தொடங்க",
        language: "மொழி"
      }
    };
    return (dict[lang] || dict.en)[key] || key;
  };

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setIsAnimating(true);
  }, []);

  return (
    <div className={styles.landingPage}>
      <div className={styles.container}>
        {/* Language Toggle */}
        <div className={styles.langToggleContainer}>
          <button
            className={styles.langToggle}
            onClick={onLangChange}
            title={t("language")}
          >
            {lang === "en" ? "🇮🇳 தமிழ்" : "🇬🇧 English"}
          </button>
        </div>

        {/* Logo Section */}
        <div className={`${styles.logoSection} ${isAnimating ? styles.fadeIn : ""}`}>
          <img 
            src={logo} 
            alt="Farmer Advisory System Logo" 
            className={styles.logo}
          />
        </div>

        {/* App Name */}
        <div className={`${styles.nameSection} ${isAnimating ? styles.slideUp : ""}`}>
          <h1 className={styles.appName}>{t("appName")}</h1>
          <p className={styles.tagline}>{t("welcomeDesc")}</p>
        </div>

        {/* Call to Action */}
        <div className={`${styles.ctaSection} ${isAnimating ? styles.slideUp : ""}`}>
          <button 
            className={styles.getStartedBtn}
            onClick={onProceed}
          >
            {t("getStarted")}
          </button>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p>
            {lang === "en" 
              ? "© 2026 Farmer Advisory System."
              : "© 2026 விவசாய ஆலோசனை அமைப்பு. அனைத்து உரிமைகளும் உள்ளன."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
