import { useEffect, useState, useRef } from "react";
import FarmerChat from "./FarmerChat";
//import LoginPage from "./LoginPage";
import LoginPage from "./LoginPage";
import LandingPage from "./LandingPage";
import History from "./History";
import styles from "./App.module.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [lang, setLang] = useState("en");
  const [currentPage, setCurrentPage] = useState("chat");
  const [userId, setUserId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const inactivityTimeoutRef = useRef(null);
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Security: Check session on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const saved = localStorage.getItem("farmer_logged_in");
    const savedUserId = localStorage.getItem("farmer_user_id");
    const loginTime = localStorage.getItem("farmer_login_time");

    if (saved === "true" && savedUserId) {
      // Verify session hasn't expired (allow 8 hours)
      if (loginTime && Date.now() - parseInt(loginTime) > 8 * 60 * 60 * 1000) {
        handleLogout();
        return;
      }

      setIsLoggedIn(true);
      setShowLanding(false);
      setShowLogin(false);
      setUserId(savedUserId);
      setupInactivityTimeout();
    }
  }, []);

  // Security: Language preference
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const savedLang = localStorage.getItem("farmer_lang");
    if (savedLang === "ta" || savedLang === "en") setLang(savedLang);
  }, []);

  // Security: Inactivity timeout - logs user out after 30 minutes of no activity
  const setupInactivityTimeout = () => {
    clearTimeout(inactivityTimeoutRef.current);
    inactivityTimeoutRef.current = setTimeout(() => {
      console.warn("🔒 SECURITY: Session timeout due to inactivity");
      handleLogout();
    }, SESSION_TIMEOUT);
  };

  // Reset inactivity timer on user interaction

  const handleUserActivity = () => {
    if (isLoggedIn) {
      setupInactivityTimeout();
    }
  };

  useEffect(() => {
    // Listen for user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearTimeout(inactivityTimeoutRef.current);
    };
  }, [isLoggedIn]);

  const toggleLang = () => {
    setLang((prev) => {
      const next = prev === "en" ? "ta" : "en";
      localStorage.setItem("farmer_lang", next);
      return next;
    });
  };

  const handleLogin = (userIdentifier) => {
    const id = userIdentifier || "user_" + Date.now();
    localStorage.setItem("farmer_logged_in", "true");
    localStorage.setItem("farmer_user_id", id);
    localStorage.setItem("farmer_login_time", Date.now().toString());
    setUserId(id);
    setIsLoggedIn(true);
    setShowLogin(false);
    setShowLanding(false);
    setCurrentPage("chat");
    setupInactivityTimeout();
  };

  const handleLogout = () => {
    localStorage.removeItem("farmer_logged_in");
    localStorage.removeItem("farmer_user_id");
    localStorage.removeItem("farmer_login_time");
    // Clear security-related session storage
    sessionStorage.removeItem("farmer_failed_attempts");
    sessionStorage.removeItem("farmer_lock_time");
    sessionStorage.removeItem("farmer_last_otp_time");
    sessionStorage.removeItem("farmer_otp_attempts");
    
    clearTimeout(inactivityTimeoutRef.current);
    setIsLoggedIn(false);
    setShowLanding(true);
    setShowLogin(false);
    setCurrentPage("chat");
    setSidebarOpen(false);
  };

  const handleProceedToLogin = () => {
    setShowLanding(false);
    setShowLogin(true);
  };

  const handleBackToLanding = () => {
    setShowLogin(false);
    setShowLanding(true);
  };

  const t = (key) => {
    const dict = {
      en: {
        chat: "Ask Question",
        history: "History",
        logout: "Logout",
        language: "Language"
      },
      ta: {
        chat: "கேள்வி கேளுங்கள்",
        history: "வரலாறு",
        logout: "வெளியேறு",
        language: "மொழி"
      }
    };
    return (dict[lang] || dict.en)[key] || key;
  };

  if (!isLoggedIn) {
    if (showLanding) {
      return (
        <LandingPage 
          onProceed={handleProceedToLogin} 
          lang={lang}
          onLangChange={toggleLang}
        />
      );
    }
    if (showLogin) {
      return (
        <LoginPage 
          onLogin={handleLogin} 
          lang={lang}
          onLangChange={toggleLang}
          onBack={handleBackToLanding}
        />
      );
    }
  }

  return (
    <div className={styles.appContainer}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.appTitle}>
            {lang === "en" ? "Farmer Advisory" : "விவசாய ஆலோசனை"}
          </h2>
          <button
            className={styles.closeSidebar}
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          <button
            className={`${styles.navButton} ${currentPage === "chat" ? styles.active : ""}`}
            onClick={() => {
              setCurrentPage("chat");
              setSidebarOpen(false);
            }}
          >
            💬 {t("chat")}
          </button>
          <button
            className={`${styles.navButton} ${currentPage === "history" ? styles.active : ""}`}
            onClick={() => {
              setCurrentPage("history");
              setSidebarOpen(false);
            }}
          >
            📋 {t("history")}
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.langToggle}
            onClick={toggleLang}
            title={t("language")}
          >
            {lang === "en" ? "🇮🇳 தமிழ்" : "🇬🇧 English"}
          </button>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={handleLogout}
          >
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Mobile Menu Button */}
        <button
          className={styles.menuToggle}
          onClick={() => setSidebarOpen(true)}
          title="Menu"
        >
          ☰
        </button>

        {/* Language Toggle (Desktop) */}
        <div className={styles.topRightControls}>
          <button
            type="button"
            className={styles.langToggleMobile}
            onClick={toggleLang}
            title={t("language")}
          >
            {lang === "en" ? "தமிழ்" : "English"}
          </button>
        </div>

        {/* Content Pages */}
        {currentPage === "chat" && <FarmerChat lang={lang} userId={userId} />}
        {currentPage === "history" && <History userId={userId} lang={lang} />}
      </main>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default App;