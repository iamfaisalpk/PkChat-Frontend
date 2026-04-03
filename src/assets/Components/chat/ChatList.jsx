import React, { useEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  updateChatInList,
  setSelectedChat,
} from "../../store/slices/chatSlice";
import {
  Star,
  Archive,
  Trash2,
  VolumeX,
  Volume2,
  Check,
  CheckCheck,
  Pin,
  Users,
  UserCircle,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import {
  deleteChat,
  markAsRead,
  toggleArchiveChat,
  toggleFavorite,
  toggleMuteChat,
} from "@/utils/chatThunks";
import { motion, AnimatePresence } from "framer-motion";

const ChatList = ({ activeTab }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { chats, archivedChats, selectedChat } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setActiveDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChatSelect = (chat) => {
    dispatch(setSelectedChat(chat));
    if (chat.unreadCount > 0 || !chat.isRead) {
      dispatch(markAsRead(chat._id));
    }
    navigate(`/app/chats/${chat._id}`);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const diff = (now - date) / (1000 * 60 * 60 * 24);
    if (diff < 1)
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (diff < 2) return "Yesterday";
    if (diff < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  const getMessagePreview = (chat) => {
    if (!chat.lastMessage) return "No messages yet";
    const m = chat.lastMessage;
    if (m.deletedForEveryone) return "🚫 Message deleted";
    if (m.voiceNote) return "🎤 Voice message";
    if (m.media) {
      const t = (m.media.type || "").toLowerCase();
      if (t === "image" || t.startsWith("image/")) return "📷 Photo";
      if (t === "video" || t.startsWith("video/")) return "🎥 Video";
      if (t === "audio" || t.startsWith("audio/")) return "🎵 Audio";
      return "📎 Document";
    }
    return m.text || "Message";
  };

  /* Double-tick with blue for seen */
  const StatusTick = ({ chat }) => {
    if (!user?._id) return null;
    if (!chat.lastMessage || chat.lastMessage.sender?._id !== user._id)
      return null;
    const s = chat.lastMessage.status;
    if (s === "read")
      return (
        <CheckCheck size={14} style={{ color: "#3797f0", flexShrink: 0 }} />
      );
    if (s === "delivered")
      return (
        <CheckCheck
          size={14}
          style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}
        />
      );
    return (
      <Check
        size={14}
        style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}
      />
    );
  };

  
  const allChats = activeTab === "Archived" ? archivedChats : chats;
  const filteredChats = useMemo(() => {
    return allChats
      .filter((chat) => {
        if (!chat?._id) return false;
        if (activeTab === "Unread") return chat.unreadCount > 0;
        if (activeTab === "Favorites") return chat.isFavorite;
        if (activeTab === "Groups") return chat.isGroup;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessageTime || b.lastMessage?.timestamp || 0) -
          new Date(a.lastMessageTime || a.lastMessage?.timestamp || 0),
      );
  }, [allChats, activeTab]);

  if (filteredChats.length === 0) {
    return (
      <div
        style={{
          padding: "60px 16px",
          textAlign: "center",
          color: "rgba(255,255,255,0.4)",
          fontSize: "15px",
          fontWeight: 600,
        }}
      >
        <div style={{ marginBottom: "16px", opacity: 0.3 }}>
          <MessageSquare
            size={48}
            style={{ margin: "0 auto" }}
            strokeWidth={1}
          />
        </div>
        No chats yet
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "4px" }}>
      <AnimatePresence>
        {filteredChats.map((chat) => {
          // Stable user identification to prevent "User" labels on refresh
          const currentUserId =
            user?._id || JSON.parse(localStorage.getItem("user") || "{}")._id;
          const otherUser =
            !chat.isGroup &&
            chat.members?.find(
              (m) => m && String(m._id) !== String(currentUserId),
            );
          const isBlocked =
            otherUser?.isBlockedByMe || otherUser?.isBlockedByThem;
          const chatId = String(chat._id);
          const isOpen = activeDropdown === chatId;
          const isSelected = selectedChat?._id === chat._id;

          const name = chat.isGroup
            ? chat.groupName || "Group"
            : otherUser?.savedName ||
              otherUser?.name ||
              otherUser?.phone ||
              "User";
          const pic = chat.isGroup ? chat.groupAvatar : otherUser?.profilePic;
          const unread = chat.unreadCount || 0;

          return (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              key={chat._id}
              onClick={() => handleChatSelect(chat)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 16px",
                cursor: "pointer",
                position: "relative",
                background: isSelected
                  ? "rgba(255,255,255,0.07)"
                  : "transparent",
                transition: "background 0.15s",
                borderRadius: "12px",
                margin: "1px 4px",
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Avatar */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#1e1e1e",
                    border:
                      unread > 0
                        ? "2px solid #dc2743"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {pic ? (
                    <img
                      src={pic}
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
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      {chat.isGroup ? (
                        <Users size={24} color="rgba(255,255,255,0.3)" />
                      ) : (
                        <span
                          style={{
                            color: "#fff",
                            fontSize: "20px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                          }}
                        >
                          {name.charAt(0)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* Online dot */}
                {!chat.isGroup && otherUser?.isOnline && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "1px",
                      right: "1px",
                      width: "13px",
                      height: "13px",
                      background: "#44c767",
                      borderRadius: "50%",
                      border: "2px solid var(--ig-bg,#000)",
                    }}
                  />
                )}
              </div>

              {/* Text content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "8px",
                    marginBottom: "3px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: unread > 0 ? 800 : 600,
                      color: "#fff",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {name}
                    {chat.isMuted && (
                      <VolumeX
                        size={14}
                        style={{ opacity: 0.4, flexShrink: 0 }}
                      />
                    )}
                  </h3>
                  <span
                    style={{
                      fontSize: "11px",
                      color: unread > 0 ? "#dc2743" : "rgba(255,255,255,0.3)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      fontWeight: unread > 0 ? 700 : 400,
                    }}
                  >
                    {formatTimestamp(
                      chat.lastMessageTime || chat.lastMessage?.timestamp,
                    )}
                  </span>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <StatusTick chat={chat} />
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color:
                        unread > 0
                          ? "rgba(255,255,255,0.8)"
                          : "rgba(255,255,255,0.4)",
                      fontWeight: unread > 0 ? 600 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {chat.isGroup &&
                      chat.lastMessage?.sender?._id !== user?._id &&
                      chat.lastMessage?.sender?.name && (
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>
                          {chat.lastMessage.sender.name.split(" ")[0]}:{" "}
                        </span>
                      )}
                    {getMessagePreview(chat)}
                  </p>
                  {/* Unread dot */}
                  {unread > 0 && (
                    <div
                      style={{
                        minWidth: "18px",
                        height: "18px",
                        background: "#dc2743",
                        borderRadius: "999px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#fff",
                        padding: "0 5px",
                        flexShrink: 0,
                      }}
                    >
                      {unread > 99 ? "99+" : unread}
                    </div>
                  )}
                </div>
              </div>

              {/* Dropdown menu trigger */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(isOpen ? null : chatId);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "8px",
                  transition: "opacity 0.15s, color 0.15s",
                  flexShrink: 0,
                }}
                className="chat-menu-btn"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.8)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.4)")
                }
              >
                <ChevronDown size={20} />
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, scale: 0.9, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "52px",
                      background: "#1a1a1a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "16px",
                      padding: "6px",
                      zIndex: 50,
                      minWidth: "160px",
                      boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                    }}
                  >
                    {[
                      {
                        label: chat.isFavorite ? "Unfavorite" : "Favorite",
                        icon: <Star size={15} />,
                        action: () => dispatch(toggleFavorite(chat._id)),
                      },
                      {
                        label: chat.isMuted ? "Unmute" : "Mute",
                        icon: chat.isMuted ? (
                          <Volume2 size={15} />
                        ) : (
                          <VolumeX size={15} />
                        ),
                        action: () => dispatch(toggleMuteChat(chat._id)),
                      },
                      {
                        label: chat.isArchived ? "Unarchive" : "Archive",
                        icon: <Archive size={15} />,
                        action: () => dispatch(toggleArchiveChat(chat._id)),
                      },
                      {
                        label: "Delete",
                        icon: <Trash2 size={15} />,
                        action: () => dispatch(deleteChat(chat._id)),
                        danger: true,
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          item.action();
                          setActiveDropdown(null);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: "none",
                          border: "none",
                          color: item.danger
                            ? "#ff4d6d"
                            : "rgba(255,255,255,0.8)",
                          padding: "9px 12px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          width: "100%",
                          textAlign: "left",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = item.danger
                            ? "rgba(255,77,109,0.1)"
                            : "rgba(255,255,255,0.07)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "none")
                        }
                      >
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <style>{`
  .chat-menu-btn { opacity: 0.6; }
  .chat-menu-btn:hover { opacity: 1; }
`}</style>
    </div>
  );
};

export default React.memo(ChatList);
