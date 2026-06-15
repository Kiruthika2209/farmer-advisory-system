import { useMemo, useState, useEffect } from "react";
import styles from "./Login_page.module.css";
import bg from "./asssts/loginbg.jpg";

function Login_page({ onLogin, onBack, lang = "en", onLangChange }) {
  const t = (key) => {
    const dict = {
      en: {
        title: "Farmer Login",
        subtitle: "Sign in using your mobile number & OTP",
        mobileLabel: "Mobile Number",
        mobilePlaceholder: "Enter 10-digit mobile number",
        otpLabel: "OTP (6 digits)",
        otpPlaceholder: "Enter 6-digit OTP",
        getOtp: "Send OTP",
        login: "Login",
        errMobile: "Enter a valid 10-digit mobile number.",
        errGetOtpFirst: "Please click 'Send OTP' first.",
        errInvalidOtp: "Invalid OTP. Please try again.",
        errRateLimit: "Too many OTP requests. Please wait 15 minutes.",
        errTooManyAttempts: "Too many failed attempts. Please try again later.",
        errOtpExpired: "OTP expired. Please request a new one.",
        errLocked: "Account temporarily locked. Please try after 15 minutes.",
        note: "Note: A 6-digit OTP has been sent to your mobile (demo mode - check browser console).",
        otpSent: "OTP sent! Valid for 5 minutes.",
        otpExpireIn: "OTP expires in",
        attempt: "Attempt",
        of: "of",
        resend: "Resend OTP",
        back: "← Back",
        language: "Language"
      },
      ta: {
        title: "விவசாயி உள்நுழைவு",
        subtitle: "மொபைல் எண் & OTP மூலம் உள்நுழையுங்கள்",
        mobileLabel: "மொபைல் எண்",
        mobilePlaceholder: "10 இலக்க மொபைல் எண்ணை உள்ளிடவும்",
        otpLabel: "OTP (6 இலக்கங்கள்)",
        otpPlaceholder: "6 இலக்க OTP-ஐ உள்ளிடவும்",
        getOtp: "OTP அனுப்பவும்",
        login: "உள்நுழை",
        errMobile: "சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.",
        errGetOtpFirst: "முதலில் 'OTP அனுப்பவும்' என்பதை அழுத்தவும்.",
        errInvalidOtp: "OTP தவறானது. மீண்டும் முயற்சிக்கவும்.",
        errRateLimit: "அதிக OTP கோரிக்கைகள். 15 நிமிடங்களுக்கு பிறகு முயற்சிக்கவும்.",
        errTooManyAttempts: "பல முறை தவறான முயற்சிகள். பின்னர் முயற்சிக்கவும்.",
        errOtpExpired: "OTP காலாவதியாகிவிட்டது. புதிய ஒன்றை கோரவும்.",
        errLocked: "கணக்கு தற்காலிகமாக பூட்டப்பட்டுள்ளது. 15 நிமிடங்களுக்கு பிறகு முயற்சிக்கவும்.",
        note: "குறிப்பு: உங்கள் மொபைலுக்கு 6 இலக்க OTP அனுப்பப்பட்டுள்ளது (டெமோ பயன்முறை - பிரவுசர் கன்சோல் பார்க்கவும்).",
        otpSent: "OTP அனுப்பப்பட்டது! 5 நிமிடங்களுக்கு செல்லுபடி ஆகும்.",
        otpExpireIn: "OTP இல் காலாவதி",
        attempt: "முயற்சி",
        of: "இல்",
        resend: "OTP மீண்டும் அனுப்பவும்",
        back: "← திரும்பி செல்",
        language: "மொழி"
      }
    };

    return (dict[lang] || dict.en)[key] || key;
  };

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lastOtpTime, setLastOtpTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load security state from sessionStorage on mount
  useEffect(() => {
    const savedAttempts = sessionStorage.getItem("farmer_failed_attempts");
    const savedLockTime = sessionStorage.getItem("farmer_lock_time");
    const savedOtpTime = sessionStorage.getItem("farmer_last_otp_time");

    if (savedAttempts) setFailedAttempts(parseInt(savedAttempts));
    if (savedOtpTime) setLastOtpTime(parseInt(savedOtpTime));

    // Check if account is locked
    if (savedLockTime) {
      const lockTime = parseInt(savedLockTime);
      const now = Date.now();
      if (now - lockTime < 15 * 60 * 1000) {
        setIsLocked(true);
      } else {
        // Lock expired, clear lock state
        sessionStorage.removeItem("farmer_lock_time");
        sessionStorage.removeItem("farmer_failed_attempts");
        setIsLocked(false);
      }
    }
  }, []);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          setGeneratedOtp("");
          setOtp("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const canRequestOtp = useMemo(() => {
    const digits = mobile.replace(/\D/g, "");
    return digits.length === 10;
  }, [mobile]);

  const handleMobileChange = (e) => {
    // Only allow numeric input
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setMobile(value);
      setError("");
    }
  };

  const handleOtpChange = (e) => {
    // Only allow numeric input
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setOtp(value);
      setError("");
    }
  };

  const requestOtp = () => {
    if (isLocked) {
      setError(t("errLocked"));
      return;
    }

    setError("");
    setSuccessMsg("");

    if (!canRequestOtp) {
      setError(t("errMobile"));
      return;
    }

    // Rate limiting: max 3 OTP requests per 15 minutes
    const now = Date.now();
    if (lastOtpTime && now - lastOtpTime < 15 * 60 * 1000) {
      if (otpAttempts >= 3) {
        setError(t("errRateLimit"));
        sessionStorage.setItem("farmer_last_otp_time", now.toString());
        return;
      }
    }

    setIsLoading(true);
    
    // Simulate OTP generation (in real app, backend would send SMS)
    setTimeout(() => {
      const newOtp = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedOtp(newOtp);
      setOtp("");
      setOtpTimer(300); // 5 minutes
      setOtpAttempts((prev) => prev + 1);
      
      // Save OTP request time
      sessionStorage.setItem("farmer_last_otp_time", now.toString());
      sessionStorage.setItem("farmer_otp_attempts", (otpAttempts + 1).toString());
      
      setSuccessMsg(t("otpSent"));
      
      // Security: Log OTP to console only (never display in UI)
      console.log(`🔒 SECURITY: OTP for ${mobile} is: ${newOtp} (Valid for 5 minutes)`);
      
      setIsLoading(false);
    }, 500);
  };

  const submit = (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (isLocked) {
      setError(t("errLocked"));
      return;
    }

    if (!canRequestOtp) {
      setError(t("errMobile"));
      return;
    }

    if (!generatedOtp) {
      setError(t("errGetOtpFirst"));
      return;
    }

    if (otpTimer <= 0) {
      setError(t("errOtpExpired"));
      setGeneratedOtp("");
      return;
    }

    if (!otp || otp.length !== 6) {
      setError(t("errInvalidOtp"));
      incrementFailedAttempts();
      return;
    }

    if (otp !== generatedOtp) {
      setError(t("errInvalidOtp"));
      incrementFailedAttempts();
      return;
    }

    // Successful login
    if (typeof onLogin === "function") {
      // Clear security state on successful login
      sessionStorage.removeItem("farmer_failed_attempts");
      sessionStorage.removeItem("farmer_lock_time");
      onLogin(mobile);
    }
  };

  const incrementFailedAttempts = () => {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    sessionStorage.setItem("farmer_failed_attempts", newAttempts.toString());

    if (newAttempts >= 5) {
      setIsLocked(true);
      const lockTime = Date.now();
      sessionStorage.setItem("farmer_lock_time", lockTime.toString());
      setError(t("errTooManyAttempts"));
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${bg})` }}>
      <div className={styles.overlay} />

      {/* Top Controls */}
      <div className={styles.topControls}>
        <button 
          className={styles.backBtn}
          onClick={onBack}
          type="button"
          title={t("back")}
        >
          {t("back")}
        </button>
        <button
          className={styles.langToggle}
          onClick={onLangChange}
          type="button"
          title={t("language")}
        >
          {lang === "en" ? "🇮🇳 தமிழ்" : "🇬🇧 English"}
        </button>
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>

        <form className={styles.form} onSubmit={submit} autoComplete="off">
          <div>
            <div className={styles.label}>{t("mobileLabel")}</div>
            <input
              className={styles.input}
              inputMode="numeric"
              placeholder={t("mobilePlaceholder")}
              value={mobile}
              onChange={handleMobileChange}
              disabled={isLocked}
              maxLength="10"
              autoComplete="off"
            />
          </div>

          <div>
            <div className={styles.label}>{t("otpLabel")}</div>
            <div className={styles.row}>
              <input
                className={styles.input}
                inputMode="numeric"
                placeholder={t("otpPlaceholder")}
                value={otp}
                onChange={handleOtpChange}
                disabled={!generatedOtp || isLocked}
                maxLength="6"
                autoComplete="off"
              />
              <button
                type="button"
                className={`${styles.otpButton} ${!canRequestOtp || isLoading ? styles.disabled : ""}`}
                onClick={requestOtp}
                disabled={!canRequestOtp || isLoading || isLocked}
              >
                {isLoading ? "..." : otpTimer > 0 ? t("resend") : t("getOtp")}
              </button>
            </div>

            {otpTimer > 0 && (
              <div className={styles.timer}>
                ⏱️ {t("otpExpireIn")}: {formatTime(otpTimer)}
              </div>
            )}

            {successMsg && <div className={styles.success}>{successMsg}</div>}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {failedAttempts > 0 && failedAttempts < 5 && (
            <div className={styles.warning}>
              {t("attempt")} {failedAttempts} {t("of")} 5
            </div>
          )}

          <button
            type="submit"
            className={`${styles.primary} ${!otp || isLoading || isLocked ? styles.disabled : ""}`}
            disabled={!otp || isLoading || isLocked}
          >
            {t("login")}
          </button>

          <div className={styles.note}>
            {t("note")}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login_page;
