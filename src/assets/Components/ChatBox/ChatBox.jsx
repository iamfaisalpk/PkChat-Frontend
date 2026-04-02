import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setSelectedChat,
  updateSeenByInSelectedChat,
} from "../../store/slices/chatSlice";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ForwardMessageModal from "./ForwardMessageModal";
import useChatLogic from "../../../hooks/useChatLogic";
import MediaViewer from "../common/MediaViewer";
import UserInfoPopup from "./UserInfoPopup";
import GroupInfoPopup from "./GroupInfoPopup";
import socket from "@/utils/socket";
import GroupHeader from "./GroupHeader";
import SkeletonLoader from "../common/SkeletonLoader";
import { useParams, useNavigate } from "react-router-dom";
import {
  closeAllPopups,
  showUserInfo,
  showGroupInfo,
} from "../../store/slices/uiSlice";
import { fetchChats } from "@/utils/chatThunks";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ArrowLeft } from "lucide-react";

/* ── Inject shared IG styles once ── */
const igChatStyles = `
  .ig-chat-bg { background: var(--ig-bg, #000); }
  
  @keyframes spin { to { transform: rotate(360deg); } }

  .chat-scroll-area {
    overflow-y: auto;
    height: 100%;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  .chat-scroll-area::-webkit-scrollbar { width: 4px; }
  .chat-scroll-area::-webkit-scrollbar-track { background: transparent; }
  .chat-scroll-area::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.12);
    border-radius: 4px;
  }
  .chat-scroll-area::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.25);
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .avatar-ring {
    background: linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
    padding: 2px;
    border-radius: 50%;
    display: inline-block;
  }

  @media (max-width: 768px) {
    .ig-info-panel {
      position: fixed !important;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100% !important;
      height: 100% !important;
      z-index: 1000 !important;
      border-left: none !important;
    }
    
    .chat-scroll-area {
      scroll-behavior: auto; /* Faster on mobile */
    }
  }
`;

const ChatBox = () => {
  const dispatch = useDispatch();
  const { selectedChat, chats } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.auth);

  const { chatId } = useParams();
  const navigate = useNavigate();

  const [viewedMedia, setViewedMedia] = useState(null);
  const [infoPanelType, setInfoPanelType] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const { showUserInfo: showUserInfoState, showGroupInfo: showGroupInfoState } =
    useSelector((state) => state.ui);

  const scrollContainerRef = useRef(null);
  const bottomRef = useRef(null);

  /* inject styles once */
  useEffect(() => {
    const id = "ig-chat-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = igChatStyles;
      document.head.appendChild(el);
    }
  }, []);

  const {
    messages,
    newMessage,
    setNewMessage,
    setMessages,
    mediaFile,
    setMediaFile,
    typingUserId,
    replyToMessage,
    setReplyToMessage,
    searchText,
    setSearchText,
    selectedMessages,
    setSelectedMessages,
    isSelectionMode,
    setIsSelectionMode,
    handleSend,
    handleTyping,
    handleVoiceSend,
    handleReaction,
    deleteMessage,
    markChatAsSeen,
  } = useChatLogic();

  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (!searchText) return true;
      return msg.text?.toLowerCase().includes(searchText.toLowerCase());
    });
  }, [messages, searchText]);

  const otherUser = useMemo(() => {
    if (!selectedChat?.isGroup && selectedChat?.members) {
      const currentUserId =
        user?._id || JSON.parse(localStorage.getItem("user") || "{}")._id;
      return selectedChat.members.find(
        (m) => m && String(m._id) !== String(currentUserId),
      );
    }
    return null;
  }, [selectedChat, user]);

  const renderedMessages = useMemo(() => filteredMessages.map((msg, i) => (
    <MessageBubble
      key={msg._id || msg.tempId || i}
      msg={msg}
      user={user}
      otherUser={otherUser}
      replyToMessage={replyToMessage}
      setReplyToMessage={setReplyToMessage}
      selectedMessages={selectedMessages}
      setSelectedMessages={setSelectedMessages}
      setSelectedUser={setSelectedUser}
      setInfoPanelType={setInfoPanelType}
      setViewedMedia={setViewedMedia}
      onDelete={deleteMessage}
      onReact={handleReaction}
    />
  )), [filteredMessages, user, otherUser, replyToMessage, selectedMessages]);

  /* Auto-scroll to bottom when messages change */
  useEffect(() => {
    if (bottomRef.current) {
      // Use 'auto' on mobile for better performance, 'smooth' on desktop
      const behavior = window.innerWidth < 768 ? "auto" : "smooth";
      bottomRef.current.scrollIntoView({ behavior });
    }
  }, [filteredMessages.length, typingUserId]);

  /* Also scroll to bottom immediately when chat is first loaded */
  useEffect(() => {
    if (bottomRef.current && messages.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [selectedChat?._id]);

  /* Ensure selectedChat matches the URL chatId */
  useEffect(() => {
    if (chatId && (!selectedChat || selectedChat._id !== chatId)) {
      const chatFromList = chats.find((c) => c._id === chatId);
      if (chatFromList) {
        dispatch(setSelectedChat(chatFromList));
      }
    }
  }, [chatId, chats, selectedChat, dispatch]);

  const isBlocked = useMemo(() => {
    if (!otherUser) return false;
    return otherUser.isBlockedByMe || otherUser.isBlockedByThem;
  }, [otherUser]);

  if (!selectedChat) {
    if (chatId) {
      return (
        <div
          style={{ flex: 1, background: "var(--ig-bg,#000)", height: "100%" }}
        >
          <SkeletonLoader />
        </div>
      );
    }
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ig-bg, #000)",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ maxWidth: "320px" }}
        >
          <div
            style={{
              width: "88px",
              height: "88px",
              background:
                "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
              borderRadius: "50%",
              padding: "2px",
              margin: "0 auto 24px",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "var(--ig-bg,#000)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageSquare size={40} color="#fff" strokeWidth={1.5} />
            </div>
          </div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.5px",
              marginBottom: "10px",
            }}
          >
            Your Messages
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            Select a conversation to start messaging. Your chats are end-to-end
            encrypted.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: "var(--ig-bg,#000)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── MAIN CHAT COLUMN ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          zIndex: 10,
          height: "100%",
        }}
      >
        {/* Header */}
        <ChatHeader
          otherUser={otherUser}
          onBack={() => {
            dispatch(setSelectedChat(null));
            navigate("/app");
          }}
          onSearch={setSearchText}
          onClearLocalMessages={() => setMessages([])}
          onUserInfo={() => {
            dispatch(showUserInfo());
            setSelectedUser(otherUser);
            setInfoPanelType("user");
          }}
          onGroupInfo={() => {
            dispatch(showGroupInfo());
            setInfoPanelType("group");
          }}
        />

        {/* Messages Scroll Area */}
        <div
          ref={scrollContainerRef}
          className="chat-scroll-area"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            background: "var(--ig-bg,#000)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              padding: "16px",
              maxWidth: "760px",
              margin: "0 auto",
              width: "100%",
              minHeight: "100%",
            }}
          >
            {/* Chat intro header */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: "32px",
                marginTop: "16px",
              }}
            >
              <div className="avatar-ring" style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid var(--ig-bg,#000)",
                  }}
                >
                  {otherUser?.profilePic || selectedChat?.groupAvatar ? (
                    <img
                      src={otherUser?.profilePic || selectedChat?.groupAvatar}
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
                        background: "var(--ig-secondary-bg, #1a1a1a)",
                      }}
                    >
                      <span className="text-white text-4xl font-black uppercase">
                        {(
                          otherUser?.name ||
                          selectedChat?.groupName ||
                          "?"
                        ).charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#fff",
                  marginBottom: "4px",
                }}
              >
                {otherUser?.name || selectedChat?.groupName}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: "12px",
                }}
              >
                {selectedChat?.isGroup
                  ? `${selectedChat.members?.length || 0} members`
                  : otherUser?.isOnline
                    ? "● Online"
                    : "Offline"}
              </p>
              <button
                onClick={() => dispatch(showUserInfo())}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  padding: "7px 18px",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.14)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
                }
              >
                View Profile
              </button>
            </div>

            {/* Messages */}
            {renderedMessages}

            {typingUserId && typingUserId !== user?._id && (
              <div style={{ marginLeft: "8px", marginBottom: "16px" }}>
                <TypingIndicator />
              </div>
            )}

            {/* Invisible anchor to scroll to */}
            <div ref={bottomRef} style={{ height: "1px" }} />
          </div>
        </div>

        {/* Input */}
        <ChatInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          mediaFile={mediaFile}
          setMediaFile={setMediaFile}
          onSend={handleSend}
          onTyping={handleTyping}
          onVoiceSend={handleVoiceSend}
          replyToMessage={replyToMessage}
          setReplyToMessage={setReplyToMessage}
          isBlocked={isBlocked}
          otherUser={otherUser}
        />
      </div>

      {/* ── SIDE INFO PANELS ── */}
      <AnimatePresence>
        {(showUserInfoState || showGroupInfoState) && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            style={{
              width: "320px",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              background: "var(--ig-bg,#000)",
              zIndex: 20,
              flexShrink: 0,
              overflowY: "auto",
            }}
            className="no-scrollbar ig-info-panel"
          >
            {showUserInfoState ? (
              <UserInfoPopup
                user={otherUser}
                onClose={() => dispatch(closeAllPopups())}
              />
            ) : (
              <GroupInfoPopup
                chat={selectedChat}
                onClose={() => dispatch(closeAllPopups())}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Viewer */}
      {viewedMedia && (
        <MediaViewer media={viewedMedia} onClose={() => setViewedMedia(null)} />
      )}
    </div>
  );
};

export default ChatBox;
