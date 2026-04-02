import React, { useState, useRef, useMemo , useEffect} from "react";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { FaShieldAlt, FaArrowRight, FaLock } from "react-icons/fa";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  setPhoneNumber,
  setCountryCode,
  sendOTP,
  verifyOTP,
  setCurrentStep,
  setOtp,
  setIsoCode,
} from "../../store/slices/authSlice";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const ModernAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    phoneNumber,
    countryCode,
    isoCode,
    currentStep,
    loading,
    user,
    token,
    isAuthLoaded,
    otp,
    generatedOtpForTest,
  } = useSelector((state) => state.auth);

  const otpRefs = useRef([]);

  const isPhoneValid = useMemo(() => {
    if (!phoneNumber) return false;
    const digits = phoneNumber.replace(/\D/g, "");

    if (!countryCode) return false;
    const dialDigits = countryCode.replace(/\D/g, "");

    if (isoCode === "in" || dialDigits === "91") {
      return digits.length === dialDigits.length + 10;
    }

    return digits.length >= dialDigits.length + 8 && digits.length <= 15;
  }, [phoneNumber, isoCode, countryCode]);


  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(sendOTP()).unwrap();
      dispatch(setCurrentStep("otp"));
      toast.success("Verification code sent!");
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    }
  };

  const handleOtpSubmit = async (e) => {
    e?.preventDefault();
    try {
      await dispatch(verifyOTP()).unwrap();
      toast.success("Welcome back!");
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error(err.message || "Invalid code");
    }
  };

  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (isAuthLoaded && user && token) return <Navigate to="/app" replace />;

  const handleResendOtp = async () => {
    try {
      await dispatch(sendOTP()).unwrap();
      setResendTimer(60);
      toast.success("Verification code resent!");
    } catch (err) {
      toast.error(err.message || "Failed to resend");
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = otp.split("");
    newOtp[index] = value;
    const otpString = newOtp.slice(0, 6).join("");
    dispatch(setOtp(otpString));
    if (value && index < 5) otpRefs.current[index + 1].focus();
    if (otpString.length === 6 && !loading) {
      setTimeout(() => handleOtpSubmit(), 100);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        padding: "16px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* ── Global styles: spin + country modal dropdown ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }

        input[type="text"]:focus {
          border-color: rgba(193,53,132,0.6) !important;
          background: rgba(193,53,132,0.08) !important;
          box-shadow: 0 0 0 3px rgba(193,53,132,0.1) !important;
        }

        /* ── Flag button ── */
        .react-tel-input .flag-dropdown {
          background: transparent !important;
          border: none !important;
        }
        .react-tel-input .selected-flag {
          background: transparent !important;
          border-right: 1px solid rgba(255,255,255,0.08) !important;
          transition: background 0.15s ease !important;
        }
        .react-tel-input .selected-flag:hover,
        .react-tel-input .selected-flag:focus {
          background: rgba(255,255,255,0.06) !important;
        }
        .react-tel-input .flag-dropdown.open .selected-flag {
          background: rgba(255,255,255,0.08) !important;
        }

        /* ── Backdrop when open ── */
        .react-tel-input .flag-dropdown.open::before {
          content: '';
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 998;
          pointer-events: none;
          animation: fadeInBackdrop 0.2s ease forwards;
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ── Modal panel ── */
        .react-tel-input .country-list {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -48%) !important;
          width: min(420px, 92vw) !important;
          max-height: 68vh !important;
          background: #141414 !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          border-radius: 20px !important;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04),
            0 32px 80px rgba(0,0,0,0.85),
            0 8px 24px rgba(0,0,0,0.60) !important;
          overflow: hidden !important;
          z-index: 999 !important;
          padding: 0 !important;
          margin: 0 !important;
          animation: popIn 0.22s cubic-bezier(0.34, 1.4, 0.64, 1) forwards !important;
        }
        @keyframes popIn {
          from {
            opacity: 0;
            transform: translate(-50%, -46%) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -48%) scale(1);
          }
        }

        /* ── Modal title header ── */
        .react-tel-input .country-list::before {
          content: 'Select Country';
          display: block;
          color: rgba(255,255,255,0.9);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 18px 20px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: #141414;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        /* ── Search wrapper ── */
        .react-tel-input .country-list .search {
          background: #141414 !important;
          padding: 12px 16px 10px !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          position: sticky !important;
          top: 52px !important;
          z-index: 1 !important;
        }

        /* ── Search input ── */
        .react-tel-input .country-list .search-box {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          color: #fff !important;
          width: 100% !important;
          border-radius: 10px !important;
          padding: 9px 14px !important;
          font-size: 13.5px !important;
          outline: none !important;
          transition: border-color 0.2s ease !important;
        }
        .react-tel-input .country-list .search-box:focus {
          border-color: rgba(193,53,132,0.5) !important;
          background: rgba(255,255,255,0.07) !important;
        }
        .react-tel-input .country-list .search-box::placeholder {
          color: rgba(255,255,255,0.28) !important;
        }

        /* ── Country rows ── */
        .react-tel-input .country-list .country {
          padding: 11px 18px !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          color: rgba(255,255,255,0.80) !important;
          font-size: 13.5px !important;
          cursor: pointer !important;
          transition: background 0.12s ease !important;
        }
        .react-tel-input .country-list .country:hover {
          background: rgba(255,255,255,0.07) !important;
          color: #fff !important;
        }
        .react-tel-input .country-list .country.highlight {
          background: rgba(193,53,132,0.12) !important;
          color: #fff !important;
        }

        /* ── Dial code (right side) ── */
        .react-tel-input .country-list .country .dial-code {
          color: rgba(255,255,255,0.32) !important;
          font-size: 12px !important;
          margin-left: auto !important;
        }

        /* ── Divider ── */
        .react-tel-input .country-list .divider {
          border-color: rgba(255,255,255,0.06) !important;
          margin: 4px 0 !important;
        }

        /* ── Scrollbar ── */
        .react-tel-input .country-list::-webkit-scrollbar { width: 4px; }
        .react-tel-input .country-list::-webkit-scrollbar-track { background: transparent; }
        .react-tel-input .country-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 99px;
        }

        .react-tel-input input::placeholder {
          color: rgba(255,255,255,0.2) !important;
        }
      `}</style>

      {/* Instagram-style gradient blobs */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "60%",
          height: "60%",
          background:
            "radial-gradient(circle, rgba(193,53,132,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "60%",
          height: "60%",
          background:
            "radial-gradient(circle, rgba(131,58,180,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          right: "20%",
          width: "30%",
          height: "30%",
          background:
            "radial-gradient(circle, rgba(253,88,44,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#161616",
          borderRadius: "28px",
          padding: "clamp(24px, 6vw, 44px)",
          position: "relative",
          zIndex: 10,
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(193,53,132,0.05)",
          boxSizing: "border-box",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "36px",
          }}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            style={{
              width: "72px",
              height: "72px",
              background: "#fff",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            <img
              src="/WhatsApp.svg.png"
              alt="WA"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </motion.div>

          <h1
            style={{
              fontSize: "clamp(28px, 7vw, 36px)",
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-1px",
              marginBottom: "6px",
              margin: "0 0 6px 0",
            }}
          >
            PK
            <span
              style={{
                background:
                  "linear-gradient(135deg, #f09433, #dc2743, #bc1888)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              .
            </span>
            Chat
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {currentStep === "phone" ? "Join the circle" : "Verify identity"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === "phone" ? (
            <motion.form
              key="phone"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handlePhoneSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <label
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.35)",
                    marginLeft: "4px",
                  }}
                >
                  Phone Number
                </label>
                <div
                  style={{
                    background: "#1e1e1e",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <PhoneInput
                    country={"in"}
                    value={phoneNumber}
                    onChange={(val, country) => {
                      dispatch(setPhoneNumber(val));
                      dispatch(setCountryCode("+" + country.dialCode));
                      dispatch(setIsoCode(country.countryCode));
                    }}
                    enableSearch
                    searchPlaceholder="Search country..."
                    containerStyle={{ width: "100%" }}
                    inputStyle={{
                      width: "100%",
                      height: "56px",
                      background: "transparent",
                      border: "none",
                      color: "#ffffff",
                      fontSize: "16px",
                      fontWeight: 700,
                      paddingLeft: "60px",
                      outline: "none",
                    }}
                    buttonStyle={{
                      background: "transparent",
                      border: "none",
                      borderRight: "1px solid rgba(255,255,255,0.08)",
                    }}
                    dropdownStyle={{
                      background: "#1e1e1e",
                      color: "#ffffff",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPhoneValid}
                style={{
                  width: "100%",
                  height: "56px",
                  background:
                    loading || !isPhoneValid
                      ? "rgba(255,255,255,0.05)"
                      : "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                  border: "none",
                  borderRadius: "16px",
                  color:
                    loading || !isPhoneValid
                      ? "rgba(255,255,255,0.2)"
                      : "#ffffff",
                  fontSize: "16px",
                  fontWeight: 800,
                  cursor: loading || !isPhoneValid ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.2s",
                  boxShadow:
                    loading || !isPhoneValid
                      ? "none"
                      : "0 8px 32px rgba(193,53,132,0.35)",
                  letterSpacing: "0.02em",
                }}
              >
                {loading ? (
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTop: "2px solid white",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                ) : (
                  <>
                    Continue
                    <FaArrowRight style={{ fontSize: "13px", opacity: 0.7 }} />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleOtpSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <div
                style={{
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 14px",
                      background: "rgba(193,53,132,0.1)",
                      border: "1px solid rgba(193,53,132,0.2)",
                      borderRadius: "999px",
                      fontSize: "9px",
                      fontWeight: 800,
                      color: "#e1306c",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    <FaLock style={{ fontSize: "8px" }} /> Verification Required
                  </span>
                </div>
                <p
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: "13px",
                    margin: 0,
                  }}
                >
                  Code sent to
                </p>
                <p
                  style={{
                    color: "#ffffff",
                    fontWeight: 900,
                    fontSize: "clamp(16px, 4vw, 20px)",
                    letterSpacing: "0.1em",
                    margin: 0,
                  }}
                >
                  +{phoneNumber}
                </p>
              </div>

              {/* OTP Inputs */}
              <div
                style={{
                  display: "flex",
                  gap: "clamp(6px, 2vw, 10px)",
                  justifyContent: "center",
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    maxLength={1}
                    value={otp[index] || ""}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading}
                    style={{
                      width: "clamp(40px, 12vw, 52px)",
                      height: "clamp(48px, 14vw, 60px)",
                      background: otp[index]
                        ? "rgba(193,53,132,0.12)"
                        : "#1e1e1e",
                      border: otp[index]
                        ? "1.5px solid rgba(193,53,132,0.5)"
                        : "1.5px solid rgba(255,255,255,0.07)",
                      borderRadius: "14px",
                      color: "#ffffff",
                      fontSize: "clamp(18px, 5vw, 24px)",
                      fontWeight: 900,
                      textAlign: "center",
                      outline: "none",
                      transition: "all 0.2s",
                      opacity: loading ? 0.5 : 1,
                      cursor: loading ? "not-allowed" : "text",
                    }}
                  />
                ))}
              </div>

              {generatedOtpForTest && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "rgba(193,53,132,0.08)",
                    border: "1px solid rgba(193,53,132,0.15)",
                    borderRadius: "16px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      color: "#e1306c",
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      margin: "0 0 6px 0",
                    }}
                  >
                    Testing Protocol Active
                  </p>
                  <p
                    style={{
                      fontSize: "22px",
                      fontWeight: 900,
                      color: "#e1306c",
                      letterSpacing: "0.25em",
                      margin: 0,
                    }}
                  >
                    {generatedOtpForTest}
                  </p>
                </motion.div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    height: "56px",
                    background: loading
                      ? "rgba(255,255,255,0.05)"
                      : "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                    border: "none",
                    borderRadius: "16px",
                    color: loading ? "rgba(255,255,255,0.2)" : "#ffffff",
                    fontSize: "16px",
                    fontWeight: 800,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    boxShadow: loading
                      ? "none"
                      : "0 8px 32px rgba(193,53,132,0.35)",
                  }}
                >
                  {loading ? (
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  ) : (
                    "Authorize Access"
                  )}
                </button>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    disabled={resendTimer > 0}
                    onClick={handleResendOtp}
                    style={{
                      background: "none",
                      border: "none",
                      color:
                        resendTimer > 0 ? "rgba(255,255,255,0.2)" : "#e1306c",
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      cursor: resendTimer > 0 ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      padding: "4px 8px",
                    }}
                  >
                    {resendTimer > 0
                      ? `Resend in ${resendTimer}s`
                      : "Resend Verification Code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(setCurrentStep("phone"));
                      dispatch(setOtp(""));
                      setResendTimer(0);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.25)",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "color 0.2s",
                      padding: "4px 8px",
                    }}
                  >
                    Use different number
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 16px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <FaShieldAlt style={{ color: "#e1306c", fontSize: "11px" }} />
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Military Grade Encryption
            </span>
          </div>
          <p
            style={{
              fontSize: "9px",
              color: "rgba(255,255,255,0.15)",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textAlign: "center",
              margin: 0,
            }}
          >
            By continuing, you acknowledge our security protocol
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ModernAuth;