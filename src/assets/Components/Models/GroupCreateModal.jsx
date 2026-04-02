import React, { useEffect, useRef, useState } from "react";
import instance from "../../Services/axiosInstance";
import { X, Camera, Search, Loader2, Check } from "lucide-react";
import { useSelector } from "react-redux";

/* ── Dark theme + Instagram gradient tokens ── */
const D = {
  /* backgrounds */
  modalBg:       "#000000",
  stepBarBg:     "#0a0a0a",
  bodyBg:        "#000000",
  footerBg:      "#0d0d0d",
  inputBg:       "#1a1a1a",
  rowHoverBg:    "#1a1a1a",
  selRowBg:      "#1a0a10",
  summaryCardBg: "#111111",
  chipBg:        "#2a0d18",
  pillBg:        "#1f0a14",
  userListBg:    "#0f0f0f",

  /* borders */
  borderSubtle:  "rgba(255,255,255,0.07)",
  borderMid:     "rgba(255,255,255,0.12)",
  borderInput:   "rgba(255,255,255,0.13)",
  chipBorder:    "rgba(240,100,120,0.35)",
  pillBorder:    "rgba(240,100,120,0.25)",
  selRowBorder:  "rgba(240,100,120,0.2)",
  summaryBorder: "rgba(220,39,67,0.2)",

  /* text */
  textPrimary:   "#ffffff",
  textSecondary: "rgba(255,255,255,0.55)",
  textTertiary:  "rgba(255,255,255,0.32)",
  textDisabled:  "rgba(255,255,255,0.2)",
  chipText:      "#ff8fa3",
  pillText:      "#ff8fa3",
  selNameColor:  "#ff8fa3",
  labelColor:    "rgba(255,255,255,0.4)",

  /* Instagram gradient */
  grad:          "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
  gradSuccess:   "linear-gradient(45deg, #43b89c, #1d9e75)",
  primary:       "#dc2743",
  doneColor:     "#1D9E75",

  /* avatar */
  avatarBg:      "linear-gradient(135deg, #f09433, #dc2743, #bc1888)",
  avatarText:    "#fff",

  /* input focus */
  focusBorder:   "#dc2743",
  focusShadow:   "0 0 0 3px rgba(220,39,67,0.18)",

  /* step inactive */
  stepInactiveBg: "rgba(255,255,255,0.08)",
  stepInactiveColor: "rgba(255,255,255,0.3)",
};

const STEPS = ["Basics", "Members", "Review"];

const initials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const GroupCreateModal = ({ onClose, onGroupCreated }) => {
  const { user } = useSelector((state) => state.auth);

  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [preview, setPreview] = useState(null);

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (step === 1) nameInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await instance.get("/api/users", { params: { search: "" } });
        const others = data.filter((u) => u._id !== user._id);
        setUsers(others);
        setFilteredUsers(others);
      } catch (err) {
        console.error("Error fetching users", err);
      }
    };
    fetchUsers();
  }, [user._id]);

  useEffect(() => {
    setFilteredUsers(
      users.filter((u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, users]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setGroupAvatar(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.length < 1) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("groupName", groupName);
    formData.append("members", JSON.stringify(selectedMembers));
    formData.append("groupDescription", groupDescription);
    if (groupAvatar) formData.append("groupAvatar", groupAvatar);
    try {
      const { data } = await instance.post("/api/chat/group", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${user?.token}`,
        },
      });
      setSuccess(true);
      setTimeout(() => {
        onGroupCreated(data.group);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Group creation failed", err);
    } finally {
      setLoading(false);
    }
  };

  const canNext =
    step === 1
      ? groupName.trim().length > 0
      : step === 2
      ? selectedMembers.length >= 1
      : true;

  const goNext = () => {
    if (step < 3) setStep((s) => s + 1);
    else handleCreate();
  };

  const goBack = () => setStep((s) => s - 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: 480,
          width: "100%",
          background: D.modalBg,
          borderRadius: 20,
          border: `1px solid ${D.borderMid}`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          maxHeight: "92vh",
          overflow: "hidden",
        }}
      >
        {/* ── Instagram gradient top bar ── */}
        <div style={{ height: 3, background: D.grad, flexShrink: 0 }} />

        {/* ── Step bar ── */}
        <div
          style={{
            display: "flex",
            background: D.stepBarBg,
            borderBottom: `1px solid ${D.borderSubtle}`,
            flexShrink: 0,
          }}
        >
          {STEPS.map((label, i) => {
            const n = i + 1;
            const isDone = n < step;
            const isActive = n === step;
            return (
              <button
                key={n}
                onClick={() => n < step && setStep(n)}
                style={{
                  flex: 1,
                  padding: "13px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  borderBottom: `2.5px solid ${
                    isDone ? D.doneColor : isActive ? D.primary : "transparent"
                  }`,
                  cursor: n < step ? "pointer" : "default",
                  transition: "border-color 0.2s",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    background: isDone
                      ? D.doneColor
                      : isActive
                      ? D.grad
                      : D.stepInactiveBg,
                    color: isDone || isActive ? "#fff" : D.stepInactiveColor,
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {isDone ? <Check size={11} strokeWidth={3} /> : n}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isDone || isActive ? 700 : 500,
                    color: isDone
                      ? D.doneColor
                      : isActive
                      ? D.primary
                      : D.stepInactiveColor,
                    transition: "color 0.2s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.25rem",
            background: D.bodyBg,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* STEP 1 – Basics */}
          {step === 1 && (
            <div style={{ animation: "gm-in 0.2s ease" }}>
              {/* Avatar upload */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    border: "2.5px dashed rgba(220,39,67,0.45)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    transition: "border-color 0.2s, transform 0.2s",
                    background: "rgba(220,39,67,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#dc2743";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(220,39,67,0.45)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />
                  {preview ? (
                    <img
                      src={preview}
                      alt="preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        position: "absolute",
                        inset: 0,
                      }}
                    />
                  ) : (
                    <>
                      <Camera size={22} color="#dc2743" />
                      <span style={{ fontSize: 10, color: "#dc2743", marginTop: 4, fontWeight: 600 }}>
                        Add photo
                      </span>
                    </>
                  )}
                </div>
                <span style={{ fontSize: 12, color: D.textTertiary }}>
                  Group photo (optional)
                </span>
              </div>

              <FieldWrap label="Group Name" count={groupName.length} max={50}>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Design Team"
                  maxLength={50}
                  style={mkInput()}
                  onFocus={(e) => {
                    e.target.style.borderColor = D.focusBorder;
                    e.target.style.boxShadow = D.focusShadow;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = D.borderInput;
                    e.target.style.boxShadow = "none";
                  }}
                />
              </FieldWrap>

              <FieldWrap label="Description" optional count={groupDescription.length} max={200}>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                  maxLength={200}
                  rows={2}
                  style={{ ...mkInput(), resize: "none" }}
                  onFocus={(e) => {
                    e.target.style.borderColor = D.focusBorder;
                    e.target.style.boxShadow = D.focusShadow;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = D.borderInput;
                    e.target.style.boxShadow = "none";
                  }}
                />
              </FieldWrap>
            </div>
          )}

          {/* STEP 2 – Members */}
          {step === 2 && (
            <div style={{ animation: "gm-in 0.2s ease" }}>
              {/* Selected chips */}
              {selectedMembers.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.75rem" }}>
                  {selectedMembers.map((id) => {
                    const u = users.find((x) => x._id === id);
                    return u ? (
                      <div
                        key={id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          background: D.chipBg,
                          color: D.chipText,
                          border: `0.5px solid ${D.chipBorder}`,
                          borderRadius: 20,
                          padding: "4px 8px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {u.name.split(" ")[0]}
                        <button
                          onClick={() => toggleMember(id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: D.chipText,
                            display: "flex",
                            padding: 0,
                            marginLeft: 2,
                          }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {/* Search */}
              <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: D.textTertiary,
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people..."
                  style={{ ...mkInput(), paddingLeft: 36 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = D.focusBorder;
                    e.target.style.boxShadow = D.focusShadow;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = D.borderInput;
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* User list */}
              <div
                style={{
                  border: `1px solid ${D.borderSubtle}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  maxHeight: 260,
                  overflowY: "auto",
                  background: D.userListBg,
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {filteredUsers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: D.textTertiary, fontSize: 13 }}>
                    {searchQuery ? "No users found" : "No users available"}
                  </div>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const sel = selectedMembers.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() => toggleMember(u._id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 14px",
                          cursor: "pointer",
                          background: sel ? D.selRowBg : "transparent",
                          borderBottom:
                            idx < filteredUsers.length - 1
                              ? `1px solid ${D.borderSubtle}`
                              : "none",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!sel) e.currentTarget.style.background = D.rowHoverBg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = sel ? D.selRowBg : "transparent";
                        }}
                      >
                        {u.profilePic ? (
                          <img
                            src={u.profilePic}
                            alt={u.name}
                            style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <AvatarCircle name={u.name} size={38} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: sel ? D.selNameColor : D.textPrimary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {u.name}
                          </div>
                          <div style={{ fontSize: 11, color: D.textTertiary }}>
                            @{u.username || "user"}
                          </div>
                        </div>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: `1.5px solid ${sel ? D.primary : D.borderMid}`,
                            background: sel ? D.grad : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.2s",
                          }}
                        >
                          {sel && <Check size={11} color="#fff" strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 3 – Review */}
          {step === 3 && (
            <div style={{ animation: "gm-in 0.2s ease" }}>
              {/* Summary card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: D.summaryCardBg,
                  border: `1px solid ${D.summaryBorder}`,
                  borderRadius: 14,
                  padding: "1rem 1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="group"
                    style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <AvatarCircle name={groupName || "G"} size={56} fontSize={18} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: D.textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {groupName || "Untitled"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: D.textTertiary,
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {groupDescription || "No description"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: D.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Members ({selectedMembers.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectedMembers.map((id) => {
                  const u = users.find((x) => x._id === id);
                  return u ? (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: D.pillBg,
                        border: `0.5px solid ${D.pillBorder}`,
                        borderRadius: 20,
                        padding: "4px 10px 4px 6px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: D.pillText,
                      }}
                    >
                      <AvatarCircle name={u.name} size={20} fontSize={9} />
                      {u.name.split(" ")[0]}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "0.875rem 1.25rem",
            borderTop: `1px solid ${D.borderSubtle}`,
            background: D.footerBg,
            flexShrink: 0,
          }}
        >
          {step > 1 ? (
            <button onClick={goBack} style={ghostBtnStyle}>Back</button>
          ) : (
            <button onClick={onClose} style={ghostBtnStyle}>Cancel</button>
          )}
          <button
            onClick={goNext}
            disabled={!canNext || loading}
            style={{
              ...primaryBtnStyle,
              background: success
                ? D.gradSuccess
                : !canNext || loading
                ? "rgba(255,255,255,0.07)"
                : D.grad,
              color: !canNext || loading ? D.textDisabled : "#fff",
              cursor: !canNext || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                Creating...
              </span>
            ) : success ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                <Check size={16} /> Created!
              </span>
            ) : step === 3 ? (
              `Create Group (${selectedMembers.length})`
            ) : (
              "Next →"
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes gm-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 360px) {
          .gm-step-label { display: none; }
        }
      `}</style>
    </div>
  );
};

/* ── Helpers ── */

const AvatarCircle = ({ name = "", size = 36, fontSize = 13 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #f09433, #dc2743, #bc1888)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize,
      fontWeight: 700,
      color: "#fff",
      flexShrink: 0,
    }}
  >
    {initials(name)}
  </div>
);

const FieldWrap = ({ label, optional, count, max, children }) => (
  <div style={{ marginBottom: "1rem" }}>
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 6,
      }}
    >
      {label}
      {optional && (
        <span style={{ fontWeight: 400, textTransform: "none", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          (optional)
        </span>
      )}
    </label>
    {children}
    {max && (
      <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
        {count}/{max}
      </div>
    )}
  </div>
);

/* input style as a function so it's always fresh */
const mkInput = () => ({
  width: "100%",
  padding: "10px 14px",
  border: "1px solid rgba(255,255,255,0.13)",
  borderRadius: 10,
  fontSize: 14,
  fontFamily: "inherit",
  background: "#1a1a1a",
  color: "#ffffff",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  boxSizing: "border-box",
});

const ghostBtnStyle = {
  flex: 1,
  padding: "11px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "rgba(255,255,255,0.45)",
  transition: "all 0.2s",
  whiteSpace: "nowrap",
};

const primaryBtnStyle = {
  flex: 2,
  padding: "11px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "inherit",
  border: "none",
  transition: "all 0.25s",
  whiteSpace: "nowrap",
};

export default GroupCreateModal;