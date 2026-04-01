import React, { useRef, useState, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import {
  Plus,
  Send,
  Mic,
  X,
  Smile,
  Image as ImageIcon,
  FileText,
  Camera,
  User as UserIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AttachmentOption = ({ icon, label, color = "#fff", onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      background: "none",
      border: "none",
      color: "#fff",
      padding: "10px 16px",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
      width: "100%",
      textAlign: "left",
      transition: "background 0.15s",
    }}
    onMouseEnter={(e) =>
      (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
    }
    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
  >
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <span>{label}</span>
  </button>
);

import { useDispatch } from "react-redux";
import { unblockUser } from "@/utils/chatThunks";
import { toast } from "react-hot-toast";

const ChatInput = ({
  newMessage,
  setNewMessage,
  mediaFile,
  setMediaFile,
  onSend = () => {},
  onTyping = () => {},
  onVoiceSend = () => {},
  replyToMessage,
  setReplyToMessage,
  isBlocked,
  otherUser,
}) => {
  const dispatch = useDispatch();
  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiRef = useRef(null);
  const attachRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const intervalRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  /* close pickers on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target))
        setShowEmojiPicker(false);
      if (attachRef.current && !attachRef.current.contains(e.target))
        setShowAttachMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    } else {
      onTyping();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setShowAttachMenu(false);
    }
    e.target.value = "";
  };

  /* auto-resize textarea */
  const handleInput = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  /* Recording */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorderRef.current.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunks.current.push(ev.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        onVoiceSend(blob, recordTime, replyToMessage);
        setRecordTime(0);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      intervalRef.current = setInterval(
        () => setRecordTime((p) => p + 1),
        1000,
      );
    } catch (err) {
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(intervalRef.current);
    }
  };

  const discardRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordTime(0);
    clearInterval(intervalRef.current);
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const hasContent = newMessage.trim() || mediaFile;

  return (
    <div
      style={{
        background: "var(--ig-bg,#000)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "10px 16px 14px",
        zIndex: 20,
        position: "relative",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto", width: "100%" }}>
        {/* ── Reply Preview ── */}
        <AnimatePresence>
          {replyToMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "8px 12px",
                marginBottom: "8px",
                borderLeft: "3px solid #dc2743",
                overflow: "hidden",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#dc2743",
                    display: "block",
                    marginBottom: "2px",
                  }}
                >
                  Replying to {replyToMessage.sender?.name}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.5)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {replyToMessage.text ||
                    (replyToMessage.voiceNote
                      ? "🎤 Voice message"
                      : "📎 Media")}
                </p>
              </div>
              <button
                onClick={() => setReplyToMessage(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  padding: "4px",
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Media Preview ── */}
        <AnimatePresence>
          {mediaFile && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ marginBottom: "8px", display: "inline-block" }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "14px",
                  overflow: "hidden",
                  background: "#1a1a1a",
                  position: "relative",
                }}
              >
                {mediaFile.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(mediaFile)}
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
                    }}
                  >
                    <FileText size={28} color="rgba(255,255,255,0.5)" />
                  </div>
                )}
                <button
                  onClick={() => setMediaFile(null)}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Blocked UI ── */}
        {isBlocked ? (
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: "16px",
              padding: "16px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "rgba(255,255,255,0.6)",
                fontWeight: 500,
              }}
            >
              {otherUser?.isBlockedByMe
                ? "You blocked this contact. Tap to unblock."
                : "This contact has blocked you."}
            </p>
            {otherUser?.isBlockedByMe && (
              <button
                onClick={async () => {
                  try {
                    await dispatch(unblockUser(otherUser._id)).unwrap();
                    toast.success("User unblocked");
                  } catch (err) {
                    toast.error("Failed to unblock");
                  }
                }}
                style={{
                  background: "var(--ig-primary, #e1306c)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 16px",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Unblock
              </button>
            )}
          </div>
        ) : !isRecording ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            {/* Emoji Button */}
            <div ref={emojiRef} style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => {
                  setShowEmojiPicker((p) => !p);
                  setShowAttachMenu(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.15s",
                  marginBottom: "4px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.6)")
                }
              >
                <Smile size={24} strokeWidth={1.5} />
              </button>

              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    style={{
                      position: "absolute",
                      bottom: "48px",
                      left: "0",
                      zIndex: 100,
                      borderRadius: "20px",
                      overflow: "hidden",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                    }}
                  >
                    <EmojiPicker
                      theme="dark"
                      onEmojiClick={(e) => {
                        setNewMessage((p) => p + e.emoji);
                        setShowEmojiPicker(false);
                        textareaRef.current?.focus();
                      }}
                      skinTonesDisabled
                      height={380}
                      width={320}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Text input pill */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "flex-end",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "24px",
                padding: "8px 14px",
                gap: "8px",
                transition: "border-color 0.2s",
              }}
            >
              <textarea
                ref={textareaRef}
                placeholder="Message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                rows={1}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  resize: "none",
                  outline: "none",
                  maxHeight: "120px",
                  overflowY: "auto",
                  fontFamily: "inherit",
                  padding: 0,
                }}
              />

              {/* Right icons inside pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                {!hasContent && (
                  <>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.5)",
                        cursor: "pointer",
                        padding: "3px",
                        display: "flex",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#fff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
                      }
                    >
                      <ImageIcon size={22} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={startRecording}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.5)",
                        cursor: "pointer",
                        padding: "3px",
                        display: "flex",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#fff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
                      }
                    >
                      <Mic size={22} strokeWidth={1.5} />
                    </button>
                  </>
                )}

                {hasContent && (
                  <button
                    onClick={onSend}
                    style={{
                      background: "linear-gradient(135deg,#dc2743,#bc1888)",
                      border: "none",
                      borderRadius: "50%",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(193,53,132,0.4)",
                      transition: "transform 0.15s, opacity 0.15s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.08)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    <Send size={14} color="#fff" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Attachment (+) button */}
            <div
              ref={attachRef}
              style={{ position: "relative", flexShrink: 0 }}
            >
              <button
                onClick={() => {
                  setShowAttachMenu((p) => !p);
                  setShowEmojiPicker(false);
                }}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                  width: "38px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.7)",
                  transition: "background 0.15s",
                  marginBottom: "2px",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.14)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
                }
              >
                <Plus size={20} strokeWidth={2} />
              </button>

              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    style={{
                      position: "absolute",
                      bottom: "52px",
                      right: "0",
                      width: "200px",
                      background: "#1a1a1a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "20px",
                      padding: "8px",
                      zIndex: 100,
                      boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                    }}
                  >
                    <AttachmentOption
                      icon={<ImageIcon size={18} color="#fff" />}
                      color="linear-gradient(135deg,#f09433,#dc2743)"
                      label="Gallery"
                      onClick={() => imageInputRef.current?.click()}
                    />
                    <AttachmentOption
                      icon={<FileText size={18} color="#fff" />}
                      color="#3797f0"
                      label="Document"
                      onClick={() => documentInputRef.current?.click()}
                    />
                    <AttachmentOption
                      icon={<Camera size={18} color="#fff" />}
                      color="#44c767"
                      label="Camera"
                      onClick={() => alert("Coming soon")}
                    />
                    <AttachmentOption
                      icon={<UserIcon size={18} color="#fff" />}
                      color="#8b5cf6"
                      label="Contact"
                      onClick={() => alert("Coming soon")}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* ── Recording UI ── */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(135deg,#dc2743,#bc1888)",
              borderRadius: "24px",
              padding: "12px 20px",
              boxShadow: "0 8px 32px rgba(193,53,132,0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#fff",
                  animation: "pulse 1s infinite",
                }}
              />
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "16px",
                  color: "#fff",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmt(recordTime)}
              </span>
            </div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              Recording…
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={discardRecording}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                Discard
              </button>
              <button
                onClick={stopRecording}
                style={{
                  background: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "38px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  transition: "transform 0.15s",
                  color: "#dc2743",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <Send size={16} strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        style={{ display: "none" }}
        accept="image/*,video/*"
        onChange={handleFileChange}
      />
      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        style={{ display: "none" }}
        accept="*"
        onChange={handleFileChange}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
};

export default ChatInput;
