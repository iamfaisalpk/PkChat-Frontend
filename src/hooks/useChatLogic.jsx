import { useState, useRef, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import socket from "@/utils/socket";
import instance from "../assets/Services/axiosInstance";
import { v4 as uuidv4 } from "uuid";
import {
  updateSeenByInSelectedChat,
  messageSent,
  messageDeleted,
} from "../assets/store/slices/chatSlice";

const useChatLogic = () => {
  const { selectedChat } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [voiceNoteFile, setVoiceNoteFile] = useState(null);
  const [voiceNoteDuration, setVoiceNoteDuration] = useState(0);
  const [typingUserId, setTypingUserId] = useState(null);

  const typingTimeoutRef = useRef();
  const remoteTypingTimeoutRef = useRef();
  const pendingMessagesRef = useRef(new Set());
  const processedMessageIdsRef = useRef(new Set());

  const selectedChatId = useSelector((s) => s.chat.selectedChat?._id);

  /* ── helpers ── */

  // Normalize timestamp: backend sometimes sends createdAt, sometimes timestamp
  const getTimestamp = (msg) =>
    msg.timestamp || msg.createdAt || new Date().toISOString();

  // Compute message status from readBy & deliveredTo arrays
  const computeStatus = (msg, totalMembers = 2) => {
    if (!msg) return "sent";
    const readCount = (msg.readBy || []).length;
    const deliveredCount = (msg.deliveredTo || []).length;
    // In a 1-1 chat, totalMembers = 2 (including sender)
    if (readCount >= totalMembers) return "seen";
    if (readCount > 1) return "seen"; // at least one other person read it
    if (deliveredCount > 0) return "delivered";
    return "sent";
  };

  const addMessageSafely = useCallback((newMsg) => {
    setMessages((prev) => {
      if (newMsg._id) {
        const idx = prev.findIndex((msg) => msg._id === newMsg._id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...newMsg };
          return updated;
        }
      }

      if (newMsg._id && newMsg.tempId) {
        const idx = prev.findIndex((msg) => msg.tempId === newMsg.tempId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...newMsg, _clientKey: newMsg._id };
          processedMessageIdsRef.current.add(newMsg._id);
          pendingMessagesRef.current.delete(newMsg.tempId);
          return updated;
        }
      }

      if (newMsg.tempId && prev.some((msg) => msg.tempId === newMsg.tempId))
        return prev;

      if (newMsg._id) processedMessageIdsRef.current.add(newMsg._id);
      if (newMsg.tempId) pendingMessagesRef.current.add(newMsg.tempId);

      return [
        ...prev,
        {
          ...newMsg,
          _clientKey: newMsg._id || newMsg.tempId || uuidv4(),
        },
      ];
    });
  }, []);

  const markChatAsSeen = useCallback(async () => {
    if (!selectedChat?._id || !user?._id) return;

    try {
      const response = await instance.put("/api/messages/seen", {
        conversationId: selectedChat._id,
      });

      const seenMessageIds = response.data.messageIds || [];

      socket.emit("message-seen", {
        conversationId: selectedChat._id,
        messageIds: seenMessageIds,
        readBy: user._id,
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg._id || !seenMessageIds.includes(msg._id)) return msg;

          const seenIds = (msg.readBy || []).map((u) =>
            typeof u === "object" ? u._id : u,
          );

          if (!seenIds.includes(user._id)) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), user._id],
            };
          }
          return msg;
        }),
      );
    } catch (err) {
      console.error("Seen error:", err.message);
    }
  }, [selectedChat?._id, user?._id]);

  const markMessageAsDelivered = useCallback(
    async (messageId) => {
      if (!selectedChat?._id || !messageId) return;

      try {
        socket.emit("message-delivered", {
          messageId,
          conversationId: selectedChat._id,
          deliveredTo: user._id,
        });

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg._id === messageId) {
              const deliveredIds = (msg.deliveredTo || []).map((u) =>
                typeof u === "object" ? u._id : u,
              );

              if (!deliveredIds.includes(user._id)) {
                return {
                  ...msg,
                  deliveredTo: [...(msg.deliveredTo || []), user._id],
                };
              }
            }
            return msg;
          }),
        );
      } catch (err) {
        console.error("Delivery confirmation error:", err.message);
      }
    },
    [selectedChat?._id, user._id],
  );

  /* ── Voice send ── */
  const handleVoiceSend = async (audioBlob, duration, replyToMessageParam) => {
    if (!selectedChat?._id || !audioBlob || audioBlob.size === 0) {
      console.warn("Empty or invalid audio blob");
      return;
    }

    // Capture the current reply state if not passed explicitly
    const actualReply = replyToMessageParam || replyToMessage;

    const voiceFile = new File([audioBlob], `voiceNote-${Date.now()}.webm`, {
      type: "audio/webm",
    });

    handleSend({
      voiceFile,
      duration,
      replyToMessage: actualReply,
    });
  };

  /* ── Fetch messages on chat select ── */
  useEffect(() => {
    if (!selectedChat?._id) return;

    setMessages([]);
    setReplyToMessage(null);
    setSelectedMessages([]);
    setIsSelectionMode(false);
    setTypingUserId(null);
    pendingMessagesRef.current.clear();
    processedMessageIdsRef.current.clear();

    instance.get(`/api/messages/${selectedChat._id}`).then((res) => {
      const withKeys = res.data.messages.map((msg) => ({
        ...msg,
        _clientKey: msg._id || uuidv4(),
        // Normalize timestamp
        timestamp: msg.timestamp || msg.createdAt,
        readBy: (msg.readBy || []).map((u) =>
          typeof u === "object" ? u._id : u,
        ),
        conversationParticipants: selectedChat.participants || [],
      }));

      setMessages(withKeys);
      withKeys.forEach(
        (msg) => msg._id && processedMessageIdsRef.current.add(msg._id),
      );
      markChatAsSeen();
    });
    socket.emit("join chat", selectedChat._id);
  }, [selectedChat?._id, markChatAsSeen]);

  /* ── Typing ── */
  const handleTyping = () => {
    if (!selectedChat?._id) return;
    socket.emit("typing", { conversationId: selectedChat._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", { conversationId: selectedChat._id });
    }, 2000);
  };

  /* ── Send message ── */
  const handleSend = async ({
    voiceFile = voiceNoteFile,
    duration = voiceNoteDuration,
    replyToMessage: replyParam = replyToMessage,
  } = {}) => {
    if (!newMessage && !mediaFile && !voiceFile) return;

    const tempId = uuidv4();
    const now = new Date().toISOString();

    const tempMsg = {
      _id: null,
      tempId,
      conversationId: selectedChat._id,
      sender: user,
      text: newMessage || null,
      media: mediaFile
        ? {
            url: URL.createObjectURL(mediaFile),
            type: mediaFile.type.startsWith("image")
              ? "image"
              : mediaFile.type.startsWith("video")
                ? "video"
                : "file",
            name: mediaFile.name,
            size: mediaFile.size,
            uploading: true,
          }
        : null,
      voiceNote: voiceFile ? URL.createObjectURL(voiceFile) : null,
      voiceNoteDuration: voiceFile ? duration : null,
      timestamp: now,
      createdAt: now,
      replyTo: replyParam?._id || null,
      readBy: [user._id],
      sending: true, // Explicit sending state for clock icon
    };

    addMessageSafely(tempMsg);

    // Clear inputs immediately for responsive UX
    const sentText = newMessage;
    const sentMedia = mediaFile;
    setNewMessage("");
    setMediaFile(null);
    setVoiceNoteFile(null);
    setVoiceNoteDuration(0);
    setReplyToMessage(null);

    const formData = new FormData();
    formData.append("conversationId", selectedChat._id);
    if (sentText) formData.append("text", sentText);
    if (sentMedia) formData.append("media", sentMedia);
    if (voiceFile) formData.append("voiceNote", voiceFile);
    if (duration) formData.append("duration", duration.toString());
    if (replyParam?._id) formData.append("replyTo", replyParam._id);
    formData.append("tempId", tempId);

    try {
      const res = await instance.post("/api/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.tempId === tempId
                ? {
                    ...m,
                    media: m.media
                      ? { ...m.media, progress: percentCompleted }
                      : null,
                  }
                : m,
            ),
          );
        },
      });
      const finalMsg = {
        ...res.data.message,
        tempId,
        sending: false,
        timestamp:
          res.data.message.timestamp || res.data.message.createdAt || now,
      };

      if (!processedMessageIdsRef.current.has(finalMsg._id)) {
        addMessageSafely(finalMsg);
      }

      // Update ChatList in real-time — move this chat to top with new lastMessage
      dispatch(
        messageSent({
          chatId: selectedChat._id,
          message: {
            ...finalMsg,
            timestamp: finalMsg.timestamp || finalMsg.createdAt || now,
          },
        }),
      );
    } catch (err) {
      console.error("Send error:", err);
      pendingMessagesRef.current.delete(tempId);
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      alert(
        `Failed to send message: ${err.response?.data?.message || err.message}`,
      );
    }
  };

  /* ── Reactions ── */
  const handleReaction = async (messageId, emoji) => {
    if (!messageId) return;
    try {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            const existingReactions = msg.reactions || [];
            const existingIndex = existingReactions.findIndex(
              (r) => r.user?._id === user._id && r.emoji === emoji,
            );

            let newReactions;
            if (existingIndex > -1) {
              newReactions = existingReactions.filter(
                (_, index) => index !== existingIndex,
              );
            } else {
              newReactions = [
                ...existingReactions,
                {
                  emoji,
                  user: {
                    _id: user._id,
                    name: user.name,
                    profilePic: user.profilePic,
                  },
                  createdAt: new Date(),
                },
              ];
            }

            return { ...msg, reactions: newReactions };
          }
          return msg;
        }),
      );

      await instance.post(`/api/messages/react/${messageId}`, { emoji });
      socket.emit("react-message", {
        messageId,
        emoji,
        userId: user._id,
      });
    } catch (err) {
      console.error("Reaction error:", err.message);
      // Revert on failure
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            const existingReactions = msg.reactions || [];
            const existingIndex = existingReactions.findIndex(
              (r) => r.user?._id === user._id && r.emoji === emoji,
            );

            let revertedReactions;
            if (existingIndex > -1) {
              revertedReactions = [
                ...existingReactions,
                {
                  emoji,
                  user: {
                    _id: user._id,
                    name: user.name,
                    profilePic: user.profilePic,
                  },
                  createdAt: new Date(),
                },
              ];
            } else {
              revertedReactions = existingReactions.filter(
                (r) => !(r.user?._id === user._id && r.emoji === emoji),
              );
            }

            return { ...msg, reactions: revertedReactions };
          }
          return msg;
        }),
      );
    }
  };

  /* ── Delete message ── */
  const deleteMessage = async (messageId, deleteForEveryone = true) => {
    try {
      if (deleteForEveryone) {
        await instance.delete(`/api/messages/delete-message/${messageId}`);
      } else {
        await instance.post(`/api/messages/delete-for-me/${messageId}`);
      }

      socket.emit("delete-message", {
        messageId,
        conversationId: selectedChat._id,
        deleteForEveryone,
      });

      // Remove locally immediately
      if (deleteForEveryone) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? {
                  ...msg,
                  text: null,
                  media: null,
                  voiceNote: null,
                  deletedForEveryone: true,
                  deletedAt: new Date(),
                }
              : msg,
          ),
        );
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }

      dispatch(
        messageDeleted({
          messageId,
          conversationId: selectedChat._id,
          deleteForEveryone,
        }),
      );
    } catch (err) {
      console.error("Delete error:", err.message);
    }
  };

  /* ── Seen handler ── */
  const handleSeenUpdate = useCallback(
    (data) => {
      const { conversationId, messageIds } = data;
      // Backend sends `seenBy`, but our Redux expects `readBy`
      const readBy = data.readBy || data.seenBy;
      if (conversationId !== selectedChatId || !Array.isArray(messageIds))
        return;

      dispatch(
        updateSeenByInSelectedChat({ conversationId, readBy, messageIds }),
      );

      const seenUserId = typeof readBy === "object" ? readBy._id : readBy;

      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg._id || !messageIds.includes(msg._id)) return msg;

          const seenIds = (msg.readBy || []).map((u) =>
            typeof u === "object" ? u._id : u,
          );

          if (!seenIds.includes(seenUserId)) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), readBy],
            };
          }

          return msg;
        }),
      );
    },
    [dispatch, selectedChatId],
  );

  /* ── Main socket listeners ── */
  useEffect(() => {
    if (!selectedChat?._id || !user?._id) return;

    const handleNewMessage = (msg) => {
      if (msg.conversationId !== selectedChat._id) return;
      if (processedMessageIdsRef.current.has(msg._id)) return;
      if (msg.sender?._id === user._id) return;

      // Normalize timestamp
      const normalizedMsg = {
        ...msg,
        timestamp: msg.timestamp || msg.createdAt,
      };

      addMessageSafely(normalizedMsg);
      markMessageAsDelivered(msg._id);
      markChatAsSeen(); // Auto mark as seen since chat is open
    };

    const handleDeliveryUpdate = ({ messageIds, deliveredTo }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg._id || !messageIds.includes(msg._id)) return msg;
          const deliveredIds = (msg.deliveredTo || []).map((u) =>
            typeof u === "object" ? u._id : u,
          );
          if (!deliveredIds.includes(deliveredTo)) {
            return {
              ...msg,
              deliveredTo: [...(msg.deliveredTo || []), deliveredTo],
            };
          }
          return msg;
        }),
      );
    };

    const handleMessageDelivered = ({ messageId, deliveredTo }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            const deliveredIds = (msg.deliveredTo || []).map((u) =>
              typeof u === "object" ? u._id : u,
            );
            if (!deliveredIds.includes(deliveredTo)) {
              return {
                ...msg,
                deliveredTo: [...(msg.deliveredTo || []), deliveredTo],
              };
            }
          }
          return msg;
        }),
      );
    };

    const handleMessageDeleted = ({
      messageId,
      deleteForEveryone,
      conversationId,
    }) => {
      if (conversationId !== selectedChat._id) return;

      setMessages((prev) =>
        prev
          .map((msg) => {
            if (String(msg._id) === String(messageId)) {
              if (deleteForEveryone) {
                return {
                  ...msg,
                  text: null,
                  media: null,
                  voiceNote: null,
                  deletedForEveryone: true,
                  deletedAt: new Date(),
                };
              } else {
                return null;
              }
            }
            return msg;
          })
          .filter(Boolean),
      );

      dispatch(
        messageDeleted({
          messageId,
          conversationId,
          deleteForEveryone,
        }),
      );
    };

    const handleReactionUpdate = ({
      messageId,
      emoji,
      userId: reactUserId,
      action,
      user: reactUser,
    }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            const existingReactions = msg.reactions || [];

            let newReactions;
            if (action === "remove") {
              newReactions = existingReactions.filter(
                (r) => !(r.user?._id === reactUserId && r.emoji === emoji),
              );
            } else {
              const existingIndex = existingReactions.findIndex(
                (r) => r.user?._id === reactUserId && r.emoji === emoji,
              );

              if (existingIndex === -1) {
                newReactions = [
                  ...existingReactions,
                  {
                    emoji,
                    user: reactUser || { _id: reactUserId },
                    createdAt: new Date(),
                  },
                ];
              } else {
                newReactions = existingReactions;
              }
            }

            return { ...msg, reactions: newReactions };
          }
          return msg;
        }),
      );
    };

    /* ── Typing indicator via socket ── */
    // Backend emits "user-typing" and "user-stop-typing" (see Socket.js lines 108, 121)
    const handleTypingStart = ({ userId, conversationId }) => {
      if (conversationId !== selectedChat._id) return;
      if (userId === user._id) return;
      setTypingUserId(userId);
      clearTimeout(remoteTypingTimeoutRef.current);
      remoteTypingTimeoutRef.current = setTimeout(() => {
        setTypingUserId(null);
      }, 3000);
    };

    const handleTypingStop = ({ userId, conversationId }) => {
      if (conversationId !== selectedChat._id) return;
      if (userId === user._id) return;
      setTypingUserId(null);
      clearTimeout(remoteTypingTimeoutRef.current);
    };

    // Handle "message-reacted" from HTTP endpoint (full reactions array)
    const handleMessageReacted = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            return { ...msg, reactions: reactions || [] };
          }
          return msg;
        }),
      );
    };

    const handleChatCleared = ({ chatId }) => {
      if (chatId === selectedChat._id) {
        setMessages([]);
      }
    };

    // Register all event listeners
    socket.on("message received", handleNewMessage);
    socket.on("message-delivered", handleMessageDelivered);
    socket.on("delivery-update", handleDeliveryUpdate);
    socket.on("seen-update", handleSeenUpdate);
    socket.on("message-deleted", handleMessageDeleted);
    socket.on("react-message", handleReactionUpdate);
    socket.on("message-reacted", handleMessageReacted);
    socket.on("user-typing", handleTypingStart);
    socket.on("user-stop-typing", handleTypingStop);
    socket.on("chat cleared", handleChatCleared);

    return () => {
      socket.off("message received", handleNewMessage);
      socket.off("message-delivered", handleMessageDelivered);
      socket.off("delivery-update", handleDeliveryUpdate);
      socket.off("seen-update", handleSeenUpdate);
      socket.off("message-deleted", handleMessageDeleted);
      socket.off("react-message", handleReactionUpdate);
      socket.off("message-reacted", handleMessageReacted);
      socket.off("user-typing", handleTypingStart);
      socket.off("user-stop-typing", handleTypingStop);
      socket.off("chat cleared", handleChatCleared);
      clearTimeout(remoteTypingTimeoutRef.current);
    };
  }, [
    selectedChat?._id,
    user?._id,
    markChatAsSeen,
    addMessageSafely,
    markMessageAsDelivered,
    handleSeenUpdate,
  ]);

  return {
    selectedChat,
    user,
    messages,
    setMessages,
    newMessage,
    setNewMessage,
    mediaFile,
    setMediaFile,
    voiceNoteFile,
    setVoiceNoteFile,
    voiceNoteDuration,
    setVoiceNoteDuration,
    searchText,
    setSearchText,
    replyToMessage,
    setReplyToMessage,
    selectedMessages,
    setSelectedMessages,
    isSelectionMode,
    setIsSelectionMode,
    typingUserId,
    handleSend,
    handleTyping,
    handleReaction,
    deleteMessage,
    addMessageSafely,
    markChatAsSeen,
    handleVoiceSend,
  };
};

export default useChatLogic;
