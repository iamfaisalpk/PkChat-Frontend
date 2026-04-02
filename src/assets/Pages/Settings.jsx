import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { setUser } from "../store/slices/authSlice";
import { toast } from "react-hot-toast";
import {
  Shield,
  Lock,
  Bell,
  Database,
  FileText,
  ChevronRight,
  User,
  Camera,
  Check,
  UserCircle,
  Edit3,
  X,
  Save,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SEO from "../Components/SEO/SEO";

const baseURL = import.meta.env.VITE_API_URL;

/* ─── shared IG style token ─── */
const S = {
  bg: "#0a0a0a",
  panel: "#161616",
  card: "#1e1e1e",
  border: "rgba(255,255,255,0.08)",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.4)",
  faint: "rgba(255,255,255,0.12)",
  gradient:
    "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
  primary: "#e1306c",
};

/* ─── reusable atoms ─── */
const Card = ({ children, style = {} }) => (
  <div
    style={{
      background: S.card,
      borderRadius: "20px",
      border: `1px solid ${S.border}`,
      padding: "20px",
      ...style,
    }}
  >
    {children}
  </div>
);

const Row = ({ label, value, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 0",
      borderBottom: `1px solid ${S.border}`,
      cursor: onClick ? "pointer" : "default",
      transition: "background 0.15s",
    }}
  >
    <span style={{ color: S.text, fontSize: "14px", fontWeight: 600 }}>
      {label}
    </span>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ color: S.primary, fontSize: "13px", fontWeight: 700 }}>
        {value}
      </span>
      {onClick && <ChevronRight size={14} color={S.muted} />}
    </div>
  </div>
);

/* ─── PROFILE TAB ─── */
const ProfileTab = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((s) => s.auth);
  const storageToken =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const authToken = token || storageToken;

  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [about, setAbout] = useState(user?.about || "Available");
  const [loading, setLoading] = useState(false);
  const [picLoading, setPicLoading] = useState(false);
  const [preview, setPreview] = useState(user?.profilePic || "");
  const fileRef = useRef();

  /* save name or about */
  const handleSave = async (field) => {
    try {
      setLoading(true);
      const formData = new FormData();
      if (field === "name") formData.append("name", name.trim());
      if (field === "about") formData.append("about", about.trim());
      const res = await axios.put(`${baseURL}/api/profile/update`, formData, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      dispatch(setUser(res.data.user));
      toast.success(field === "name" ? "Name updated!" : "About updated!");
      setEditingName(false);
      setEditingAbout(false);
    } catch {
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  /* change profile picture */
  const handlePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    if (!file.type.match("image.*")) {
      toast.error("Images only");
      return;
    }
    setPreview(URL.createObjectURL(file));
    try {
      setPicLoading(true);
      const formData = new FormData();
      formData.append("profilePic", file);
      formData.append("name", user?.name || name);
      const res = await axios.put(`${baseURL}/api/profile/update`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${authToken}`,
        },
      });
      dispatch(setUser(res.data.user));
      toast.success("Photo updated!");
    } catch {
      toast.error("Photo upload failed");
      setPreview(user?.profilePic || "");
    } finally {
      setPicLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Avatar section */}
      <Card
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px 20px",
        }}
      >
        <div style={{ position: "relative", marginBottom: "20px" }}>
          {/* gradient ring */}
          <div
            style={{
              width: "110px",
              height: "110px",
              background: S.gradient,
              borderRadius: "50%",
              padding: "3px",
              boxShadow: "0 8px 32px rgba(193,53,132,0.4)",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                background: "#1a1a1a",
                border: "2px solid #1e1e1e",
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserCircle size={60} color="rgba(255,255,255,0.2)" />
                </div>
              )}
              {picLoading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.55)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTop: "2px solid #fff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* camera badge */}
          <label
            style={{
              position: "absolute",
              bottom: "2px",
              right: "2px",
              width: "32px",
              height: "32px",
              background: S.gradient,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "2px solid #1e1e1e",
              boxShadow: "0 4px 12px rgba(193,53,132,0.4)",
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.12)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePicChange}
            />
            <Camera size={14} color="#fff" />
          </label>
        </div>

        <h2
          style={{
            color: S.text,
            fontSize: "18px",
            fontWeight: 800,
            margin: "0 0 4px",
          }}
        >
          {user?.name || "Your Name"}
        </h2>
        <p style={{ color: S.muted, fontSize: "13px", margin: 0 }}>
          {user?.phone ? `+${user.phone}` : ""}
        </p>
      </Card>

      {/* Name */}
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: S.muted,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Name
          </span>
          <button
            onClick={() => {
              setEditingName((p) => !p);
              setEditingAbout(false);
            }}
            style={{
              background: "none",
              border: "none",
              color: editingName ? S.primary : S.muted,
              cursor: "pointer",
              display: "flex",
              gap: "4px",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {editingName ? (
              <>
                <X size={13} /> Cancel
              </>
            ) : (
              <>
                <Edit3 size={13} /> Edit
              </>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {editingName ? (
            <motion.div
              key="edit-name"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={25}
                style={{
                  width: "100%",
                  background: "#2a2a2a",
                  border: `1px solid rgba(193,53,132,0.3)`,
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: S.text,
                  fontSize: "15px",
                  fontWeight: 700,
                  outline: "none",
                  fontFamily: "inherit",
                  marginBottom: "12px",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => handleSave("name")}
                disabled={loading || !name.trim()}
                style={{
                  background: S.gradient,
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 20px",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: loading || !name.trim() ? 0.5 : 1,
                }}
              >
                {loading ? (
                  "Saving…"
                ) : (
                  <>
                    <Save size={13} /> Save
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.p
              key="show-name"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: S.text,
                fontSize: "16px",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {user?.name || "—"}
            </motion.p>
          )}
        </AnimatePresence>
      </Card>

      {/* About */}
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: S.muted,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            About
          </span>
          <button
            onClick={() => {
              setEditingAbout((p) => !p);
              setEditingName(false);
            }}
            style={{
              background: "none",
              border: "none",
              color: editingAbout ? S.primary : S.muted,
              cursor: "pointer",
              display: "flex",
              gap: "4px",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {editingAbout ? (
              <>
                <X size={13} /> Cancel
              </>
            ) : (
              <>
                <Edit3 size={13} /> Edit
              </>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {editingAbout ? (
            <motion.div
              key="edit-about"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <textarea
                autoFocus
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={139}
                rows={3}
                style={{
                  width: "100%",
                  background: "#2a2a2a",
                  border: `1px solid rgba(193,53,132,0.3)`,
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: S.text,
                  fontSize: "14px",
                  fontWeight: 600,
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  marginBottom: "8px",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "11px", color: S.muted }}>
                  {about.length}/139
                </span>
                <button
                  onClick={() => handleSave("about")}
                  disabled={loading}
                  style={{
                    background: S.gradient,
                    border: "none",
                    borderRadius: "12px",
                    padding: "10px 20px",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    "Saving…"
                  ) : (
                    <>
                      <Save size={13} /> Save
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="show-about"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: S.text,
                fontSize: "14px",
                fontWeight: 500,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {user?.about || about || "Available"}
            </motion.p>
          )}
        </AnimatePresence>
      </Card>

      {/* Phone (read-only) */}
      <Card>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            color: S.muted,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            display: "block",
            marginBottom: "10px",
          }}
        >
          Phone
        </span>
        <p
          style={{
            color: S.text,
            fontSize: "16px",
            fontWeight: 700,
            margin: 0,
          }}
        >
          {user?.phone ? `${user.phone}` : "—"}
        </p>
        <p style={{ color: S.muted, fontSize: "11px", margin: "4px 0 0" }}>
          Your phone number is not visible to others
        </p>
      </Card>
    </div>
  );
};

/* ─── PRIVACY TAB ─── */
const PrivacyTab = () => {
  const [settings, setSettings] = useState({
    "Last Seen & Online": "Everyone",
    "Profile Photo": "My Contacts",
    About: "Everyone",
    Groups: "Everyone",
  });

  const options = ["Everyone", "My Contacts", "Nobody"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "12px",
              background: "rgba(193,53,132,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lock size={18} color={S.primary} />
          </div>
          <div>
            <h3
              style={{
                color: S.text,
                fontSize: "15px",
                fontWeight: 800,
                margin: 0,
              }}
            >
              Privacy Controls
            </h3>
            <p style={{ color: S.muted, fontSize: "12px", margin: 0 }}>
              Who can see your info
            </p>
          </div>
        </div>

        {Object.entries(settings).map(([k, v], i, arr) => (
          <div
            key={k}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 0",
              borderBottom:
                i < arr.length - 1 ? `1px solid ${S.border}` : "none",
            }}
          >
            <span style={{ color: S.text, fontSize: "14px", fontWeight: 600 }}>
              {k}
            </span>
            <select
              value={v}
              onChange={(e) =>
                setSettings((p) => ({ ...p, [k]: e.target.value }))
              }
              style={{
                background: "#2a2a2a",
                border: `1px solid ${S.border}`,
                borderRadius: "10px",
                padding: "5px 10px",
                color: S.primary,
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        ))}
      </Card>

      <Card
        style={{
          background: "rgba(16,80,44,0.25)",
          border: "1px solid rgba(68,199,103,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <Shield size={18} color="#44c767" />
          <h3
            style={{
              color: "#44c767",
              fontSize: "14px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            End-to-End Encryption
          </h3>
        </div>
        <p
          style={{
            color: "rgba(68,199,103,0.75)",
            fontSize: "13px",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Your messages and calls are secured with end-to-end encryption. Not
          even the server can read them.
        </p>
      </Card>
    </div>
  );
};

/* ─── LEGAL TAB ─── */
const LegalTab = () => (
  <Card>
    <h3
      style={{
        color: S.text,
        fontSize: "17px",
        fontWeight: 900,
        marginBottom: "20px",
      }}
    >
      Privacy Policy
    </h3>
    <div
      style={{
        color: "rgba(255,255,255,0.6)",
        fontSize: "14px",
        lineHeight: 1.8,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <p>
        We take your privacy seriously. All communication remains private and
        secure.
      </p>
      <ul
        style={{
          paddingLeft: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {[
          "Encrypted messages by default",
          "No data sharing with third parties",
          "User-controlled visibility settings",
          "Secure media storage on encrypted volumes",
        ].map((i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              listStyle: "none",
            }}
          >
            <Check size={13} color={S.primary} style={{ flexShrink: 0 }} /> {i}
          </li>
        ))}
      </ul>
      <p>
        By using this service, you agree to our terms and acknowledge your data
        is processed securely.
      </p>
    </div>
  </Card>
);

/* ─── PLACEHOLDER ─── */
const PlaceholderTab = ({ label }) => (
  <Card
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 20px",
    }}
  >
    <div
      style={{
        width: "56px",
        height: "56px",
        borderRadius: "16px",
        background: S.faint,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "16px",
      }}
    >
      <Database size={28} color={S.muted} />
    </div>
    <h3
      style={{ color: S.muted, fontSize: "15px", fontWeight: 700, margin: 0 }}
    >
      {label} — Coming Soon
    </h3>
  </Card>
);

/* ─── MAIN SETTINGS ─── */
const Settings = () => {
  const [activeTab, setActiveTab] = useState("Profile");
  const navigate = useNavigate();

  const tabs = [
    { id: "Profile", icon: User, label: "Profile" },
    { id: "Privacy", icon: Lock, label: "Privacy" },
    { id: "Notifications", icon: Bell, label: "Notifications" },
    { id: "Data", icon: Database, label: "Data & Storage" },
    { id: "Law", icon: FileText, label: "Legal & Privacy" },
  ];

  const renderContent = () => {
    if (activeTab === "Profile") return <ProfileTab />;
    if (activeTab === "Privacy") return <PrivacyTab />;
    if (activeTab === "Law") return <LegalTab />;
    return (
      <PlaceholderTab label={tabs.find((t) => t.id === activeTab)?.label} />
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: S.bg,
        overflowY: "auto",
        height: "100%",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        minHeight: 0,
        position: "relative",
      }}
      className="ig-settings-container"
    >
      <SEO
        title="Settings"
        description="Manage your PK.Chat profile, privacy, and notification settings."
      />
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "clamp(16px,4vw,60px) clamp(12px,2vw,24px)", // Increased bottom padding
          width: "100%",
          boxSizing: "border-box",
          minHeight: "100%", // Ensure container takes full height
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <button
            onClick={() => navigate("/app")}
            className="ig-settings-back"
            style={{
              background: "none",
              border: "none",
              color: S.text,
              cursor: "pointer",
              padding: "8px",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: "-8px",
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1
              style={{
                fontSize: "clamp(22px,5vw,30px)",
                fontWeight: 900,
                color: S.text,
                letterSpacing: "-0.5px",
                margin: "0 0 4px",
              }}
            >
              Settings
            </h1>
            <p style={{ color: S.muted, fontSize: "14px", margin: 0 }}>
              Manage your account preferences and security.
            </p>
          </div>
        </div>

        {/* Layout */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* Sidebar tabs */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              flexShrink: 0,
            }}
            className="ig-settings-tabs"
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    border: "none",
                    cursor: "pointer",
                    background: active
                      ? "linear-gradient(135deg,#f09433 0%,#dc2743 50%,#bc1888 100%)"
                      : "transparent",
                    color: active ? "#fff" : S.muted,
                    fontSize: "14px",
                    fontWeight: 700,
                    textAlign: "left",
                    transition: "all 0.15s",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <tab.icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  <span style={{ flex: 1 }}>{tab.label}</span>
                  {!active && (
                    <ChevronRight size={14} style={{ opacity: 0.3 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: "280px" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        select option { background:#1e1e1e; color:#fff; }
        .ig-settings-tabs {
          flex-direction: column;
          width: clamp(140px,30%,220px);
        }
        @media (max-width: 767px) {
          .ig-settings-back { display: flex !important; }
          .ig-settings-tabs {
            flex-direction: row !important;
            width: 100% !important;
            overflow-x: auto;
            padding-bottom: 8px;
            white-space: nowrap;
          }
          .ig-settings-tabs > button {
            width: auto !important;
            padding: 10px 16px !important;
            border-radius: 999px !important;
            flex-shrink: 0;
          }
          .ig-settings-tabs > button span:last-child {
             display: none; /* hide chevron on mobile tabs row */
          }
        }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
      `}</style>
    </div>
  );
};

export default Settings;
