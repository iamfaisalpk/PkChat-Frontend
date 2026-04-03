import {
  Check,
  CheckCheck,
  CornerUpLeft,
  Trash2,
  MoreHorizontal,
  Plus,
  Clock,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useRef, useEffect, forwardRef } from "react";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

/* Quick emoji reactions */
const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "👏", "🔥"];

const MessageBubble = forwardRef((props, ref) => {
  const {
    msg,
    user,
    otherUser,
    replyToMessage,
    setReplyToMessage,
    selectedMessages,
    setSelectedMessages,
    setSelectedUser,
    setInfoPanelType,
    setViewedMedia,
    onDelete,
    onReact,
  } = props;

  const [showActions, setShowActions] = useState(false);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const bubbleRef = useRef(null);
  const actionsRef = useRef(null);

  const isOwn = msg.sender?._id === user?._id;
  const showAvatar = !isOwn && msg.type !== "notification";

  /* Close menus on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(e.target) &&
        bubbleRef.current &&
        !bubbleRef.current.contains(e.target)
      ) {
        setShowActions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Deleted message ── */
  if (msg.deletedForEveryone) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          display: "flex",
          justifyContent: isOwn ? "flex-end" : "flex-start",
          margin: "4px 0",
          width: "100%",
        }}
      >
        <div
          style={{
            padding: "8px 14px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontSize: "13px",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          🚫 This message was deleted
        </div>
      </motion.div>
    );
  }

  /* ── Notification bubble ── */
  if (msg.type === "notification") {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            padding: "4px 14px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.05em",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {msg.text}
        </div>
      </div>
    );
  }

  /* ── Compute tick status from readBy/deliveredTo ── */
  const StatusTick = () => {
    if (!isOwn) return null;

    // If message is still sending (no _id yet)
    if (!msg._id || msg.sending) {
      return <Clock size={11} style={{ color: "rgba(255,255,255,0.4)" }} />;
    }

    const readBy = msg.readBy || [];
    const deliveredTo = msg.deliveredTo || [];

    // If anyone other than sender has read it
    const othersRead = readBy.filter((u) => {
      const uid = typeof u === "object" ? u._id : u;
      return uid !== user._id;
    });
    if (
      othersRead.length > 0 ||
      msg.status === "seen" ||
      msg.status === "read"
    ) {
      return <CheckCheck size={14} style={{ color: "#3797f0" }} />;
    }
    // If delivered to anyone
    if (deliveredTo.length > 0 || msg.status === "delivered") {
      return (
        <CheckCheck size={14} style={{ color: "rgba(255,255,255,0.6)" }} />
      );
    }
    return <Check size={14} style={{ color: "rgba(255,255,255,0.5)" }} />;
  };

  /* ── Get voice note URL (handles both string and object) ── */
  const getVoiceNoteUrl = () => {
    if (!msg.voiceNote) return null;
    if (typeof msg.voiceNote === "string") return msg.voiceNote;
    if (typeof msg.voiceNote === "object" && msg.voiceNote.url)
      return msg.voiceNote.url;
    return null;
  };

  const voiceUrl = getVoiceNoteUrl();

  /* ── Get timestamp safely ── */
  const msgTime = msg.timestamp || msg.createdAt;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "8px",
        marginBottom: "2px",
        width: "100%",
        flexDirection: isOwn ? "row-reverse" : "row",
        position: "relative",
      }}
    >
      {/* ── Avatar ── */}
      {showAvatar ? (
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            marginBottom: "4px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <img
            src={msg.sender?.profilePic || "/WhatsApp.jpg"}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : (
        !isOwn && <div style={{ width: "30px", flexShrink: 0 }} />
      )}

      {/* ── Bubble column ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isOwn ? "flex-end" : "flex-start",
          maxWidth: "72%",
          gap: "2px",
        }}
      >
        {/* Reply preview */}
        {msg.replyTo && (
          <div
            style={{
              padding: "6px 12px",
              background: "rgba(255,255,255,0.07)",
              borderRadius: "14px",
              fontSize: "11px",
              borderLeft: isOwn
                ? "2px solid rgba(225,48,108,0.7)"
                : "2px solid rgba(255,255,255,0.3)",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                opacity: 0.6,
                display: "block",
                marginBottom: "2px",
              }}
            >
              {msg.replyTo.sender?.name}
            </span>
            <p
              style={{
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                opacity: 0.75,
                color: "#fff",
              }}
            >
              {msg.replyTo.text ||
                (msg.replyTo.voiceNote ? "🎤 Voice message" : "📎 Media")}
            </p>
          </div>
        )}

        {/* ── Main Bubble ── */}
        <div
          ref={bubbleRef}
          onDoubleClick={() => {
            setReplyToMessage(msg);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowActions((p) => !p);
          }}
          className="message-bubble-container"
          style={{
            position: "relative",
            padding: msg.media?.url || voiceUrl ? "6px" : "10px 14px",
            borderRadius: isOwn ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
            background: isOwn
              ? "linear-gradient(135deg,#dc2743,#bc1888)"
              : "rgba(255,255,255,0.09)",
            color: "#fff",
            border: isOwn ? "none" : "1px solid rgba(255,255,255,0.08)",
            cursor: "default",
            userSelect: "text",
            wordBreak: "break-word",
          }}
        >
          {/* Action trigger button shown on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="bubble-action-trigger"
            style={{
              position: "absolute",
              top: "0",
              [isOwn ? "left" : "right"]: "-32px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              opacity: 0,
              transition: "opacity 0.2s, background 0.2s",
              zIndex: 5,
            }}
          >
            <MoreHorizontal size={14} />
          </button>
          {/* Group sender name */}
          {!isOwn && otherUser?.isGroup && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "rgba(255,255,255,0.5)",
                display: "block",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {msg.sender?.name}
            </span>
          )}

          {/* Media */}
          {msg.media?.url && (
            <div
              style={{
                borderRadius: "14px",
                overflow: "hidden",
                cursor: "pointer",
                marginBottom: msg.text ? "6px" : "0",
              }}
              onClick={() => setViewedMedia(msg.media)}
            >
              {msg.media.type === "image" ? (
                <img
                  src={msg.media.url}
                  alt=""
                  style={{
                    maxWidth: "260px",
                    maxHeight: "300px",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: "14px",
                    opacity: msg.media.uploading ? 0.6 : 1,
                  }}
                />
              ) : (
                <video
                  src={msg.media.url}
                  style={{
                    maxWidth: "260px",
                    maxHeight: "300px",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: "14px",
                    opacity: msg.media.uploading ? 0.6 : 1,
                  }}
                  controls={!msg.media.uploading}
                />
              )}
              {msg.media.uploading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.3)",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 800,
                    borderRadius: "14px",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    {msg.media.progress || 0}%
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voice note */}
          {voiceUrl && (
            <div style={{ padding: "4px 6px" }}>
              <VoiceMessagePlayer
                url={voiceUrl}
                duration={
                  msg.voiceNoteDuration ||
                  (typeof msg.voiceNote === "object"
                    ? msg.voiceNote.duration
                    : 0)
                }
                isOwnMessage={isOwn}
              />
            </div>
          )}

          {/* Text */}
          {msg.text && (
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
                color: "#fff",
              }}
            >
              {msg.text.split(/(\s+)/).map((part, i) => {
                const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-z]{2,})/g;
                if (part.match(urlRegex)) {
                  const href = part.startsWith("http") ? part : `https://${part}`;
                  return (
                    <a
                      key={i}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="message-link"
                      style={{
                        color: isOwn ? "#fff" : "#3797f0",
                        textDecoration: "underline",
                        cursor: "pointer",
                        fontWeight: 700,
                        wordBreak: "break-all",
                        transition: "opacity 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {part}
                    </a>
                  );
                }
                return part;
              })}
            </p>
          )}

          {/* Time + tick — shown inside bubble at bottom right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "4px",
              marginTop: "4px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: isOwn
                  ? "rgba(255,255,255,0.65)"
                  : "rgba(255,255,255,0.4)",
              }}
            >
              {msgTime
                ? new Date(msgTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
            <StatusTick />
          </div>

          {/* Reactions */}
          {msg.reactions?.length > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: "-10px",
                right: isOwn ? "8px" : "auto",
                left: isOwn ? "auto" : "8px",
                display: "flex",
                gap: "2px",
              }}
            >
              {msg.reactions.map((r, i) => {
                const isMyReaction =
                  r.user?._id === user?._id || r.user === user?._id;
                return (
                  <div
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMyReaction) onReact(msg._id, r.emoji);
                    }}
                    style={{
                      background: isMyReaction
                        ? "rgba(225,48,108,0.2)"
                        : "var(--ig-bg,#000)",
                      border: isMyReaction
                        ? "1px solid rgba(225,48,108,0.5)"
                        : "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "999px",
                      padding: "2px 6px",
                      fontSize: "11px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                      cursor: isMyReaction ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    {r.emoji}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Hover Quick Actions (react + reply + delete) ── */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              ref={actionsRef}
              initial={{ opacity: 0, scale: 0.88, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 6 }}
              transition={{ duration: 0.14 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                zIndex: 50,
              }}
            >
              {/* Quick emoji row */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  alignItems: "center",
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "999px",
                  padding: "6px 10px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      if (msg._id) {
                        onReact(msg._id, emoji);
                      }
                      setShowActions(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "20px",
                      cursor: "pointer",
                      padding: "2px 4px",
                      borderRadius: "8px",
                      transition: "transform 0.1s",
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.3)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    {emoji}
                  </button>
                ))}

                {/* Plus button for full picker */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowFullEmojiPicker(!showFullEmojiPicker)}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "none",
                      color: "#fff",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={16} />
                  </button>

                  {showFullEmojiPicker && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "40px",
                        [isOwn ? "right" : "left"]: 0,
                        zIndex: 100,
                      }}
                    >
                      <EmojiPicker
                        theme="dark"
                        onEmojiClick={(e) => {
                          onReact(msg._id, e.emoji);
                          setShowFullEmojiPicker(false);
                          setShowActions(false);
                        }}
                        width={280}
                        height={350}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  justifyContent: isOwn ? "flex-end" : "flex-start",
                }}
              >
                <button
                  onClick={() => {
                    setReplyToMessage(msg);
                    setShowActions(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    padding: "6px 12px",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <CornerUpLeft size={13} /> Reply
                </button>
                {(isOwn || (otherUser?.isGroup && otherUser.groupAdmin?._id === user?._id)) && msg._id && (
                  <button
                    onClick={() => {
                      onDelete(msg._id, true);
                      setShowActions(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(220,39,67,0.12)",
                      border: "1px solid rgba(220,39,67,0.25)",
                      borderRadius: "10px",
                      padding: "6px 12px",
                      color: "#ff4d6d",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        .message-bubble-container:hover .bubble-action-trigger {
          opacity: 1 !important;
        }
        .bubble-action-trigger:hover {
          background: rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }
      `}</style>
    </motion.div>
  );
});

MessageBubble.displayName = "MessageBubble";

const MemoizedMessageBubble = React.memo(MessageBubble);
export default MemoizedMessageBubble;
