import React, { useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { FaArrowRight, FaLock } from "react-icons/fa";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  setPhoneNumber,
  setCountryCode,
  sendOTP,
  setCurrentStep,
  setIsoCode,
} from "../../store/slices/authSlice";

const PhoneInputComponent = ({ setStep }) => {
  const dispatch = useDispatch();
  const { phoneNumber, countryCode, isoCode, loading, error } = useSelector(
    (state) => state.auth,
  );

  // Debounced phone number validation
  // Per-country validation logic
  const isValidPhone = useMemo(() => {
    if (!phoneNumber) return false;
    const digits = phoneNumber.replace(/\D/g, "");

    // If dial code is missing or too short, it's invalid
    if (!countryCode) return false;
    const dialDigits = countryCode.replace(/\D/g, "");

    // India validation: dial code (91) + 10 digits = 12 total digits
    if (isoCode === "in" || dialDigits === "91") {
      return digits.length === dialDigits.length + 10;
    }

    // Default validation for other countries: dial code + at least 8 digits
    return digits.length >= dialDigits.length + 8 && digits.length <= 15;
  }, [phoneNumber, isoCode, countryCode]);

  // Optimized phone change handler with minimal logging
  const handlePhoneChange = useCallback(
    (value, country) => {
      // Only log significant changes (not every keystroke)
      if (value.length % 3 === 0 || value.length < 3) {
        console.log(" Phone updated:", value.slice(-4).padStart(4, "*"));
      }
      dispatch(setPhoneNumber(value));
      dispatch(setCountryCode("+" + country.dialCode));
      dispatch(setIsoCode(country.countryCode));
    },
    [dispatch],
  );

  const handlePhoneSubmit = useCallback(
    (e) => {
      e.preventDefault();

      if (!phoneNumber || phoneNumber.trim() === "") {
        dispatch({
          type: "auth/sendOTP/rejected",
          payload: { message: "Please enter a phone number" },
        });
        return;
      }

      const rawPhone = phoneNumber.replace(/\D/g, "");

      if (rawPhone.length < 12 || rawPhone.length > 15) {
        dispatch({
          type: "auth/sendOTP/rejected",
          payload: { message: "Please enter a valid phone number" },
        });
        return;
      }

      const cleanPhone = `+${rawPhone}`;

      console.log(" Sending OTP to:", cleanPhone.replace(/\d(?=\d{4})/g, "*"));

      dispatch(sendOTP({ phone: cleanPhone }))
        .unwrap()
        .then(() => {
          console.log(" OTP sent successfully");
          dispatch(setCurrentStep("otp"));
        })
        .catch((error) => {
          console.error(" OTP sending failed:", error);
        });
    },
    [phoneNumber, dispatch],
  );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <style>{`
        /* ── Overlay backdrop when dropdown opens ── */
        .custom-phone-input .flag-dropdown.open::before {
          content: '';
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.70);
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

        /* ── Flag button styles ── */
        .custom-phone-input .selected-flag {
          background-color: transparent !important;
          border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
          padding: 0 12px !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          transition: background 0.15s ease !important;
        }

        .custom-phone-input .selected-flag:hover,
        .custom-phone-input .selected-flag:focus {
          background-color: rgba(255, 255, 255, 0.06) !important;
        }

        .custom-phone-input .flag-dropdown.open .selected-flag {
          background-color: rgba(255, 255, 255, 0.08) !important;
        }

        /* ── Dropdown modal panel ── */
        .custom-phone-input .country-list {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -48%) !important;
          width: min(420px, 92vw) !important;
          max-height: 68vh !important;
          background: #141414 !important;
          border: 1px solid rgba(255, 255, 255, 0.10) !important;
          border-radius: 20px !important;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04),
            0 32px 80px rgba(0, 0, 0, 0.80),
            0 8px 24px rgba(0, 0, 0, 0.60) !important;
          overflow: hidden !important;
          z-index: 999 !important;
          animation: popIn 0.22s cubic-bezier(0.34, 1.4, 0.64, 1) forwards !important;
          padding: 0 !important;
          margin: 0 !important;
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

        /* ── Modal header strip ── */
        .custom-phone-input .country-list::before {
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

        /* ── Search bar wrapper ── */
        .custom-phone-input .country-list .search {
          background: #141414 !important;
          padding: 12px 16px 10px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
          position: sticky !important;
          top: 52px !important;
          z-index: 1 !important;
        }

        /* ── Search input ── */
        .custom-phone-input .country-list .search-box {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.10) !important;
          color: #fff !important;
          width: 100% !important;
          border-radius: 10px !important;
          padding: 9px 14px !important;
          font-size: 13.5px !important;
          outline: none !important;
          transition: border-color 0.2s ease !important;
        }

        .custom-phone-input .country-list .search-box:focus {
          border-color: rgba(220, 39, 67, 0.5) !important;
          background: rgba(255, 255, 255, 0.07) !important;
        }

        .custom-phone-input .country-list .search-box::placeholder {
          color: rgba(255, 255, 255, 0.30) !important;
        }

        /* ── Country list items ── */
        .custom-phone-input .country-list .country {
          padding: 11px 18px !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          color: rgba(255, 255, 255, 0.80) !important;
          font-size: 13.5px !important;
          cursor: pointer !important;
          transition: background 0.12s ease !important;
          border-radius: 0 !important;
        }

        .custom-phone-input .country-list .country:hover {
          background: rgba(255, 255, 255, 0.07) !important;
          color: #fff !important;
        }

        .custom-phone-input .country-list .country.highlight {
          background: rgba(220, 39, 67, 0.12) !important;
          color: #fff !important;
        }

        /* Dial code muted text */
        .custom-phone-input .country-list .country .dial-code {
          color: rgba(255, 255, 255, 0.35) !important;
          font-size: 12px !important;
          margin-left: auto !important;
        }

        /* Divider between preferred & full list */
        .custom-phone-input .country-list .divider {
          border-color: rgba(255, 255, 255, 0.06) !important;
          margin: 4px 0 !important;
        }

        /* Scrollbar */
        .custom-phone-input .country-list::-webkit-scrollbar {
          width: 4px;
        }
        .custom-phone-input .country-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-phone-input .country-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 99px;
        }
      `}</style>

      <div className="flex flex-col items-center justify-center mb-8">
        <div style={{
          width: "72px",
          height: "72px",
          background: "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
          borderRadius: "50%",
          padding: "2px",
          marginBottom: "16px"
        }}>
          <div style={{
            width: "100%",
            height: "100%",
            background: "#000",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <img
              src="/WhatsApp.svg.png"
              alt=""
              className="w-10 h-10 object-contain drop-shadow-md"
            />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">PK.Chat</h1>
      </div>

      {/* Phone Input Box */}
      <div className="bg-[#111111] rounded-2xl shadow-2xl border border-white/5 p-8 w-full max-w-md">
        <h2 className="text-2xl text-white font-bold mb-2 text-center tracking-tight">
          Welcome to PK.Chat
        </h2>
        <p className="text-sm text-gray-400 text-center mb-8">
          Pick your country and enter your phone number to continue.
        </p>

        <div className="custom-phone-input mb-2">
          <PhoneInput
            country={"in"}
            value={phoneNumber}
            onChange={handlePhoneChange}
            inputClass="!w-full !pl-[60px] !pr-4 !py-4 !text-base !bg-[#000] !border !border-white/10 !rounded-xl !text-white focus:!border-[#e1306c] focus:!ring-0 !outline-none !transition-colors"
            buttonClass="!bg-transparent !border-none !rounded-l-xl hover:!bg-white/5 !transition-colors"
            dropdownClass="!bg-[#1a1a1a] !border !border-white/10 !shadow-2xl !rounded-xl"
            placeholder="Phone number"
            enableSearch
            searchPlaceholder="Search country..."
            countryCodeEditable={false}
            autoFormat={true}
            disableDropdown={false}
          />
        </div>

        {/* Debug info - only show when needed */}
        {import.meta.env.NODE_ENV === "development" && phoneNumber && (
          <div className="text-xs text-gray-500 mt-2 mb-2">
            Debug: Length {phoneNumber.replace(/\D/g, "").length} | Valid:{" "}
            {isValidPhone ? "✅" : "❌"}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mt-4">
            <p className="text-red-400 text-sm font-medium text-center">{error}</p>
          </div>
        )}

        {/* Next Button */}
        <button
          onClick={handlePhoneSubmit}
          disabled={loading || !isValidPhone}
          style={{
            background: loading || !isValidPhone ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#dc2743,#bc1888)"
          }}
          className={`w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center mt-8 transition-all duration-200 ${
            loading || !isValidPhone ? "text-gray-500 cursor-not-allowed" : "text-white hover:opacity-90 hover:scale-[1.02] shadow-[0_8px_24px_rgba(225,48,108,0.25)]"
          }`}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Sending OTP...
            </div>
          ) : (
            <>
              Continue <FaArrowRight className="ml-2 text-sm" />
            </>
          )}
        </button>

        {/* QR Code Login */}
        <button
          onClick={() => setStep("qr")}
          className="block mx-auto mt-6 text-gray-400 hover:text-white text-sm font-semibold cursor-pointer transition-colors"
        >
          Log in with QR code instead
        </button>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p className="mb-3">
          Don&apos;t have a PK.Chat account?{" "}
          <Link
            to="/signup"
            className="text-[#e1306c] hover:text-[#bc1888] font-bold transition-colors"
          >
            Create one
          </Link>
        </p>
        <div className="flex items-center justify-center text-gray-600 bg-white/5 py-2 px-4 rounded-full w-fit mx-auto">
          <FaLock className="mr-2" size={10} />
          <span className="font-medium">End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default PhoneInputComponent;