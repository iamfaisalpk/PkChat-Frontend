import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Pencil,
  UserCircle,
  X,
  Check,
  Camera,
  ShieldCheck,
  Phone,
  Info,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { setUser, logoutUser, fetchMe } from "../store/slices/authSlice";
import authAxios from "../Services/axiosInstance";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SEO from "../Components/SEO/SEO";

/* ── Instagram dark tokens ── */
const S = {
  bg: "#0a0a0a",
  panel: "#111111",
  card: "#1a1a1a",
  input: "#242424",
  border: "rgba(255,255,255,0.08)",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.4)",
  faint: "rgba(255,255,255,0.06)",
  gradient:
    "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
  primary: "#e1306c",
  green: "#44c767",
};

const UserProfile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [editName, setEditName] = useState(false);
  const [editAbout, setEditAbout] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [about, setAbout] = useState(user?.about || "");
  const [preview, setPreview] = useState(user?.profilePic || "");
  const [loading, setLoading] = useState({ image: false, profile: false });

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAbout(user.about || "Available");
      setPreview(user.profilePic || "");
    }
  }, [user]);

  /* ── profile pic upload ── */
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    const formData = new FormData();
    formData.append("profilePic", file);
    try {
      setLoading((p) => ({ ...p, image: true }));
      const res = await authAxios.put("/api/profile/update", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      dispatch(setUser(res.data.user));
      await dispatch(fetchMe()).unwrap(); // Sync with DB
      toast.success("Photo updated!");
    } catch {
      toast.error("Upload failed");
      setPreview(user?.profilePic || "");
    } finally {
      setLoading((p) => ({ ...p, image: false }));
      e.target.value = "";
    }
  };

  /* ── name / about update ── */
  const handleProfileUpdate = async (field) => {
    if (field === "name" && !name.trim()) {
      toast.error("Name required");
      return;
    }
    try {
      setLoading((p) => ({ ...p, profile: true }));
      const payload =
        field === "name"
          ? { name: name.trim(), about: user?.about || about }
          : { name: user?.name || name, about: about.trim() };
      const res = await authAxios.put("/api/profile/update", payload);
      dispatch(setUser(res.data.user));
      toast.success(field === "name" ? "Name updated!" : "About updated!");
      setEditName(false);
      setEditAbout(false);
    } catch {
      toast.error("Update failed");
    } finally {
      setLoading((p) => ({ ...p, profile: false }));
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: S.bg,
        overflow: "hidden",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        color: S.text,
      }}
    >
      <SEO
        title="My Profile"
        description="View and edit your PK.Chat profile, name, and about information."
      />
      {/* ════════ LEFT PANEL ════════ */}
      <div
        className="profile-left-panel"
        style={{
          width: "100%",
          maxWidth: "480px",
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${S.border}`,
          background: S.panel,
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            position: "sticky",
            top: 0,
            background: S.panel,
            borderBottom: `1px solid ${S.border}`,
            paddingBottom: "16px",
            zIndex: 10,
          }}
        >
          <button
            onClick={() => navigate("/app")}
            style={{
              background: S.faint,
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: S.text,
              flexShrink: 0,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = S.faint)}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color: S.text,
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              My Profile
            </h2>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: S.muted,
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Personal Profile Control
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* ── Avatar ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "28px 0 12px",
            }}
          >
            <div style={{ position: "relative", marginBottom: "16px" }}>
              {/* gradient ring */}
              <div
                style={{
                  background: S.gradient,
                  borderRadius: "50%",
                  padding: "3px",
                  boxShadow: "0 8px 40px rgba(193,53,132,0.45)",
                  width: "clamp(100px,22vw,130px)",
                  height: "clamp(100px,22vw,130px)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#1a1a1a",
                    border: "2px solid #111",
                    position: "relative",
                  }}
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: S.faint,
                      }}
                    >
                      <span
                        style={{
                          color: "#fff",
                          fontSize: "42px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        {user?.name ? user.name.charAt(0) : "?"}
                      </span>
                    </div>
                  )}

                  {/* loading overlay */}
                  {loading.image && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "26px",
                          height: "26px",
                          border: "3px solid rgba(255,255,255,0.2)",
                          borderTop: "3px solid #fff",
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
                  width: "34px",
                  height: "34px",
                  background: S.gradient,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "2px solid #111",
                  boxShadow: "0 4px 14px rgba(193,53,132,0.5)",
                  transition: "transform 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.12)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
                <Camera size={14} color="#fff" />
              </label>
            </div>

            <h3
              style={{
                fontSize: "20px",
                fontWeight: 900,
                color: S.text,
                margin: "0 0 4px",
              }}
            >
              {user?.name || "Your Name"}
            </h3>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "10px",
                fontWeight: 800,
                color: S.primary,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: S.green,
                  display: "inline-block",
                }}
              />
              Active Account
            </span>
          </div>

          {/* ── Name Field ── */}
          <FieldCard
            label="Profile Name"
            isEditing={editName}
            onEdit={() => {
              setEditName(true);
              setEditAbout(false);
            }}
            onCancel={() => {
              setEditName(false);
              setName(user?.name || "");
            }}
            onSave={() => handleProfileUpdate("name")}
            loading={loading.profile}
          >
            {editName ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={25}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: S.text,
                  fontSize: "16px",
                  fontWeight: 700,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: S.text,
                  margin: 0,
                }}
              >
                {user?.name || "—"}
              </p>
            )}
          </FieldCard>

          {/* ── About Field ── */}
          <FieldCard
            label="About"
            isEditing={editAbout}
            onEdit={() => {
              setEditAbout(true);
              setEditName(false);
            }}
            onCancel={() => {
              setEditAbout(false);
              setAbout(user?.about || "");
            }}
            onSave={() => handleProfileUpdate("about")}
            loading={loading.profile}
            extra={
              editAbout && (
                <span style={{ fontSize: "10px", color: S.muted }}>
                  {about.length}/139
                </span>
              )
            }
          >
            {editAbout ? (
              <textarea
                autoFocus
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={139}
                rows={3}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: S.text,
                  fontSize: "14px",
                  fontWeight: 500,
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.75)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {user?.about || about || "Available"}
              </p>
            )}
          </FieldCard>

          {/* ── Meta cards ── */}
          <div
            style={{
              display: "flex",
              background: "rgba(16,80,44,0.2)",
              border: "1px solid rgba(68,199,103,0.2)",
              borderRadius: "16px",
              padding: "14px 16px",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "rgba(68,199,103,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={18} color={S.green} />
            </div>
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: S.green,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  margin: "0 0 2px",
                }}
              >
                Privacy Verified
              </p>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "rgba(68,199,103,0.75)",
                  margin: 0,
                }}
              >
                End-to-End Encryption enabled
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: S.card,
              border: `1px solid ${S.border}`,
              borderRadius: "16px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: S.faint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Phone size={16} color={S.muted} />
            </div>
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: S.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  margin: "0 0 2px",
                }}
              >
                Phone Number
              </p>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: S.text,
                  margin: 0,
                }}
              >
                {user?.phone || user?.phoneNumber || "Connected"}
              </p>
            </div>
          </div>

          {/* ── Logout Section ── */}
          <div style={{ marginTop: "auto", paddingTop: "20px" }}>
            <button
              onClick={() => {
                dispatch(logoutUser());
                navigate("/auth");
              }}
              style={{
                width: "100%",
                background: "rgba(255,59,48,0.1)",
                border: "1px solid rgba(255,59,48,0.2)",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: "pointer",
                color: "#ff3b30",
                fontSize: "15px",
                fontWeight: 800,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,59,48,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,59,48,0.1)";
              }}
            >
              <LogOut size={18} />
              Logout from account
            </button>
          </div>
        </div>
      </div>

      {/* ════════ RIGHT DECORATIVE PANEL ════════ */}
      <div
        style={{
          flex: 1,
          display: "none",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          position: "relative",
          overflow: "hidden",
          background: S.bg,
        }}
        className="ig-profile-right"
      >
        {/* gradient blobs */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            right: "-10%",
            width: "60%",
            height: "60%",
            background:
              "radial-gradient(circle,rgba(193,53,132,0.12) 0%,transparent 70%)",
            borderRadius: "50%",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            left: "-10%",
            width: "60%",
            height: "60%",
            background:
              "radial-gradient(circle,rgba(131,58,180,0.1) 0%,transparent 70%)",
            borderRadius: "50%",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", zIndex: 10, maxWidth: "320px" }}
        >
          {/* Big avatar showcase */}
          <div
            style={{
              width: "120px",
              height: "120px",
              background: S.gradient,
              borderRadius: "50%",
              padding: "3px",
              margin: "0 auto 28px",
              boxShadow: "0 12px 60px rgba(193,53,132,0.35)",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                background: "#1a1a1a",
                border: "2px solid #0a0a0a",
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
            </div>
          </div>

          <h2
            style={{
              fontSize: "26px",
              fontWeight: 900,
              color: S.text,
              letterSpacing: "-0.5px",
              marginBottom: "12px",
            }}
          >
            Identity Center
          </h2>
          <p
            style={{
              color: S.muted,
              fontSize: "14px",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Manage how others see you across the network. Your profile and photo
            sync across all devices.
          </p>

          {/* mini stat chips */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              marginTop: "28px",
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Encrypted", color: S.green },
              { label: "Synced", color: "#3797f0" },
              { label: "Private", color: S.primary },
            ].map((chip) => (
              <span
                key={chip.label}
                style={{
                  padding: "6px 14px",
                  background: `${chip.color}18`,
                  border: `1px solid ${chip.color}33`,
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: chip.color,
                  letterSpacing: "0.08em",
                }}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 900px) {
          .ig-profile-right { display: flex !important; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </div>
  );
};

/* ── Reusable editable field card ── */
const FieldCard = ({
  label,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  loading,
  children,
  extra,
}) => (
  <div
    style={{
      background: S.card,
      borderRadius: "18px",
      border: `1px solid ${isEditing ? "rgba(193,53,132,0.35)" : S.border}`,
      padding: "16px 18px",
      transition: "border-color 0.2s",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "10px",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          fontWeight: 800,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {extra}
        {!isEditing ? (
          <button
            onClick={onEdit}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.3)",
              padding: "4px",
              borderRadius: "8px",
              display: "flex",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e1306c")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
            }
          >
            <Pencil size={15} />
          </button>
        ) : (
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={onCancel}
              style={{
                background: "rgba(255,80,80,0.12)",
                border: "1px solid rgba(255,80,80,0.2)",
                borderRadius: "8px",
                padding: "4px 8px",
                color: "#ff5050",
                cursor: "pointer",
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
            <button
              onClick={onSave}
              disabled={loading}
              style={{
                background: S.gradient,
                border: "none",
                borderRadius: "8px",
                padding: "4px 8px",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid #fff",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              ) : (
                <Check size={14} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
    {children}
    <style>{`
      @media (max-width: 767px) {
        .profile-left-panel {
          max-width: 100% !important;
          border-right: none !important;
        }
      }
    `}</style>
  </div>
);

export default UserProfile;
