import { createSlice } from "@reduxjs/toolkit";
import {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  leaveGroup,
  deleteChat,
  toggleFavorite,
  markAsRead,
  markAsUnread,
  getBlockedUsers,
  toggleMuteChat,
  toggleArchiveChat,
  togglePinChat,
  updateGroupAvatar,
  blockUser,
  unblockUser,
  clearChat,
} from "@/utils/chatThunks";

const savedChat = JSON.parse(localStorage.getItem("selectedChat"));

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    chats: [],
    blockedUsers: [],
    blockedByMe: [],
    archivedChats: [],
    selectedChat: savedChat || null,
    mediaToView: null,
    loading: false,
    error: null,
  },
  reducers: {
    updateChatMembers: (state, action) => {
      const { chatId, updatedChat } = action.payload;
      const index = state.chats.findIndex((chat) => chat._id === chatId);
      if (index !== -1) {
        state.chats[index] = updatedChat;
      }
    },

    removeChat: (state, action) => {
      const chatId = action.payload;
      state.chats = state.chats.filter((chat) => chat._id !== chatId);
    },

    messageReceived: (state, action) => {
      const newMessage = action.payload;
      const chatId = newMessage.conversationId || newMessage.chatId;
      if (!chatId) {
        console.warn("Message received without chatId:", newMessage);
        return;
      }

      const currentUserId = newMessage.currentUserId;
      const isMyMessage = newMessage.sender?._id === currentUserId;
      const existingIndex = state.chats.findIndex(
        (chat) => chat._id === chatId,
      );

      const alreadyExists =
        state.selectedChat &&
        state.selectedChat._id === chatId &&
        Array.isArray(state.selectedChat.messages) &&
        state.selectedChat.messages.some((msg) => {
          if (newMessage._id && msg._id === newMessage._id) return true;
          if (newMessage.tempId && msg.tempId === newMessage.tempId)
            return true;
          return false;
        });

      const chatInList = state.chats[existingIndex];
      const alreadyInList =
        chatInList &&
        chatInList.lastMessage &&
        ((newMessage._id && chatInList.lastMessage._id === newMessage._id) ||
          (newMessage.tempId &&
            chatInList.lastMessage.tempId === newMessage.tempId));

      if (alreadyExists || alreadyInList) {
        console.log(
          " Duplicate message skipped:",
          newMessage._id || newMessage.tempId,
        );
        return;
      }

      if (existingIndex !== -1) {
        const existingChat = state.chats[existingIndex];
        const updatedChat = {
          ...existingChat,
          lastMessage: newMessage,
          lastMessageTime: newMessage.timestamp || new Date().toISOString(),
          unreadCount: isMyMessage
            ? existingChat.unreadCount || 0
            : state.selectedChat?._id === chatId
              ? 0
              : (existingChat.unreadCount || 0) + 1,
          isRead: isMyMessage
            ? existingChat.isRead
            : state.selectedChat?._id === chatId
              ? true
              : false,
        };
        state.chats = [
          updatedChat,
          ...state.chats.filter((_, i) => i !== existingIndex),
        ];
      } else {
        const newChat = {
          _id: chatId,
          lastMessage: newMessage,
          lastMessageTime: newMessage.timestamp || new Date().toISOString(),
          unreadCount: isMyMessage ? 0 : 1,
          isRead: isMyMessage ? true : false,
          isGroup: newMessage.isGroup || false,
          members: newMessage.members || [],
          groupName: newMessage.groupName || "",
          groupAvatar: newMessage.groupAvatar || "/WhatsApp.jpg",
        };
        state.chats = [newChat, ...state.chats];
      }

      if (state.selectedChat?._id === chatId) {
        state.selectedChat = {
          ...state.selectedChat,
          lastMessage: newMessage,
          lastMessageTime: newMessage.timestamp || new Date().toISOString(),
          unreadCount: 0,
          isRead: true,
          messages: [...(state.selectedChat.messages || []), newMessage],
        };
        localStorage.setItem(
          "selectedChat",
          JSON.stringify(state.selectedChat),
        );
      }
    },

    messageDeleted: (state, action) => {
      const { messageId, conversationId, deleteForEveryone } = action.payload;

      // Update selectedChat if it's the right one
      if (
        state.selectedChat?._id === conversationId &&
        state.selectedChat.messages
      ) {
        state.selectedChat.messages = state.selectedChat.messages
          .map((msg) =>
            String(msg._id) === String(messageId) && deleteForEveryone
              ? {
                  ...msg,
                  text: null,
                  media: null,
                  voiceNote: null,
                  deletedForEveryone: true,
                  deletedAt: new Date(),
                }
              : msg,
          )
          .filter(
            (msg) => String(msg._id) !== String(messageId) || deleteForEveryone,
          );

        localStorage.setItem(
          "selectedChat",
          JSON.stringify(state.selectedChat),
        );
      }

      // Update Chat List - change lastMessage if it matches
      const allChatLists = ["chats", "archivedChats"];
      allChatLists.forEach((listName) => {
        const chatIndex = state[listName].findIndex(
          (c) => c._id === conversationId,
        );
        if (chatIndex !== -1) {
          const chat = state[listName][chatIndex];
          if (String(chat.lastMessage?._id) === String(messageId)) {
            if (deleteForEveryone) {
              chat.lastMessage = {
                ...chat.lastMessage,
                text: null,
                media: null,
                voiceNote: null,
                deletedForEveryone: true,
              };
            }
          }
        }
      });
    },

    messageSent: (state, action) => {
      const { chatId, message } = action.payload;
      const chatIndex = state.chats.findIndex((chat) => chat._id === chatId);

      if (chatIndex !== -1) {
        const chat = state.chats[chatIndex];
        const updatedChat = {
          ...chat,
          lastMessage: message,
          lastMessageTime: message.timestamp || new Date().toISOString(),
          unreadCount: 0,
          isRead: true,
        };

        state.chats.splice(chatIndex, 1);
        state.chats.unshift(updatedChat);

        if (state.selectedChat?._id === chatId) {
          state.selectedChat = {
            ...state.selectedChat,
            lastMessage: message,
            lastMessageTime: message.timestamp || new Date().toISOString(),
          };
          localStorage.setItem(
            "selectedChat",
            JSON.stringify(state.selectedChat),
          );
        }
      }
    },

    updateLastMessage: (state, action) => {
      const { chatId, lastMessage, senderId, currentUserId } = action.payload;
      const chatIndex = state.chats.findIndex((chat) => chat._id === chatId);

      if (chatIndex !== -1) {
        const chat = state.chats[chatIndex];
        const isMyMessage = senderId === currentUserId;
        const isSelectedChat = state.selectedChat?._id === chatId;

        state.chats[chatIndex].lastMessage = lastMessage;
        state.chats[chatIndex].lastMessageTime =
          lastMessage.timestamp || new Date().toISOString();

        if (!isMyMessage && !isSelectedChat) {
          state.chats[chatIndex].unreadCount = (chat.unreadCount || 0) + 1;
          state.chats[chatIndex].isRead = false;
        }

        const updatedChat = state.chats.splice(chatIndex, 1)[0];
        state.chats.unshift(updatedChat);
      }
    },

    setSelectedChat: (state, action) => {
      const payload = action.payload;

      if (!payload) {
        state.selectedChat = null;
        localStorage.removeItem("selectedChat");
        return;
      }

      const chatData = {
        ...payload,
        groupAvatar: payload.groupAvatar || "/WhatsApp.jpg",
        unreadCount: 0,
        isRead: true,
      };

      state.selectedChat = chatData;
      localStorage.setItem("selectedChat", JSON.stringify(chatData));

      const chatIndex = state.chats.findIndex((c) => c._id === payload._id);
      if (chatIndex !== -1) {
        state.chats[chatIndex].unreadCount = 0;
        state.chats[chatIndex].isRead = true;
      }
    },

    updateUnreadCount: (state, action) => {
      const { chatId, senderId, currentUserId } = action.payload;
      const chat = state.chats.find((c) => c._id === chatId);

      if (chat && senderId !== currentUserId) {
        if (state.selectedChat?._id !== chatId) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
          chat.isRead = false;
        }
      }
    },

    updateSeenByInSelectedChat: (state, action) => {
      const { conversationId, readBy, messageIds } = action.payload;

      if (state.selectedChat && state.selectedChat._id === conversationId) {
        const seenById = typeof readBy === "object" ? readBy._id : readBy;

        if (state.selectedChat.messages) {
          state.selectedChat.messages = state.selectedChat.messages.map(
            (msg) => {
              if (!messageIds.includes(msg._id)) return msg;

              const seenIds = (msg.readBy || []).map((u) =>
                typeof u === "object" ? u._id : u,
              );

              if (!seenIds.includes(seenById)) {
                return {
                  ...msg,
                  readBy: [...(msg.readBy || []), readBy],
                };
              }
              return msg;
            },
          );
        }

        if (
          state.selectedChat.members &&
          Array.isArray(state.selectedChat.members)
        ) {
          const isAlreadyMember = state.selectedChat.members.some(
            (u) => u && (u._id || u) === seenById,
          );

          if (!isAlreadyMember) {
            state.selectedChat.members.push(readBy);
          }
        }
      }
    },

    refreshChat: (state, action) => {
      const chatId = action.payload;
      const chatIndex = state.chats.findIndex((c) => c._id === chatId);

      if (chatIndex !== -1) {
        state.chats[chatIndex] = { ...state.chats[chatIndex] };
      }
    },

    clearChatError: (state) => {
      state.error = null;
    },

    updateSeenBy: (state, action) => {
      const { conversationId, readBy } = action.payload;
      const chat = state.chats.find((c) => c._id === conversationId);
      if (chat && !chat.readBy?.includes(readBy)) {
        chat.readBy = [...(chat.readBy || []), readBy];
      }
    },

    setMediaToView: (state, action) => {
      state.mediaToView = action.payload;
    },

    updateChatInList: (state, action) => {
      const updatedChat = action.payload;
      const index = state.chats.findIndex((c) => c._id === updatedChat._id);
      if (index !== -1) {
        state.chats[index] = { ...state.chats[index], ...updatedChat };
      } else {
        state.chats.unshift(updatedChat);
      }
    },
    updateUserStatus: (state, action) => {
      const { userId, isOnline } = action.payload;

      // Efficient update for chats only if the user is a member
      state.chats.forEach((chat) => {
        const memberIndex = chat.members.findIndex(
          (m) => String(m && (m._id || m)) === String(userId),
        );
        if (memberIndex !== -1) {
          const member = chat.members[memberIndex];
          if (member.isOnline !== isOnline) {
            chat.members[memberIndex] = { ...member, isOnline };
          }
        }
      });

      // Efficient update for archivedChats
      state.archivedChats.forEach((chat) => {
        const memberIndex = chat.members.findIndex(
          (m) => String(m && (m._id || m)) === String(userId),
        );
        if (memberIndex !== -1) {
          const member = chat.members[memberIndex];
          if (member.isOnline !== isOnline) {
            chat.members[memberIndex] = { ...member, isOnline };
          }
        }
      });

      // Also update selectedChat if it's the target user
      if (state.selectedChat) {
        const memberIndex = state.selectedChat.members.findIndex(
          (m) => String(m && (m._id || m)) === String(userId),
        );
        if (memberIndex !== -1) {
          const member = state.selectedChat.members[memberIndex];
          if (member.isOnline !== isOnline) {
            state.selectedChat.members[memberIndex] = { ...member, isOnline };
          }
        }
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(updateGroupAvatar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGroupAvatar.fulfilled, (state, action) => {
        state.loading = false;
        const updatedChat = {
          ...action.payload,
          groupPic: action.payload.groupAvatar || action.payload.groupPic,
          groupAvatar: action.payload.groupAvatar || action.payload.groupPic,
        };

        const index = state.chats.findIndex((c) => c._id === updatedChat._id);
        if (index !== -1) {
          state.chats[index] = updatedChat;
        }

        if (state.selectedChat && state.selectedChat._id === updatedChat._id) {
          state.selectedChat = updatedChat;
          localStorage.setItem("selectedChat", JSON.stringify(updatedChat));
        }
      })
      .addCase(updateGroupAvatar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(accessChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(accessChat.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.chats.findIndex(
          (c) => c._id === action.payload._id,
        );
        if (index !== -1) {
          state.chats[index] = action.payload;
        } else {
          state.chats.unshift(action.payload);
        }
        state.selectedChat = action.payload;
        localStorage.setItem("selectedChat", JSON.stringify(action.payload));
      })
      .addCase(accessChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.loading = false;

        const formatChat = (chat) => ({
          ...chat,
          groupPic: chat.groupAvatar || chat.groupPic || chat.groupProfilePic,
          groupAvatar:
            chat.groupAvatar || chat.groupPic || chat.groupProfilePic,
          unreadCount: chat.unreadCount || 0,
          isRead: chat.isRead !== undefined ? chat.isRead : true,
          isFavorite: Boolean(chat.isFavorite),
        });

        state.chats = action.payload.activeChats.map((c) => ({
          ...formatChat(c),
          isArchived: false,
        }));
        state.archivedChats = action.payload.archivedChats.map((c) => ({
          ...formatChat(c),
          isArchived: true,
        }));

        if (state.selectedChat) {
          const updatedSelectedChat =
            state.chats.find((c) => c._id === state.selectedChat._id) ||
            state.archivedChats.find((c) => c._id === state.selectedChat._id);
          if (updatedSelectedChat) {
            state.selectedChat = updatedSelectedChat;
            localStorage.setItem(
              "selectedChat",
              JSON.stringify(updatedSelectedChat),
            );
          }
        }
      })

      .addCase(fetchChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createGroupChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGroupChat.fulfilled, (state, action) => {
        state.loading = false;
        const newGroup = {
          ...action.payload,
          groupPic: action.payload.groupAvatar || action.payload.groupPic,
          groupAvatar: action.payload.groupAvatar || action.payload.groupPic,
          unreadCount: 0,
          isRead: true,
        };
        state.chats.unshift(newGroup);
        if (state.selectedChat && state.selectedChat._id === newGroup._id) {
          state.selectedChat = newGroup;
          localStorage.setItem("selectedChat", JSON.stringify(newGroup));
        }
      })
      .addCase(createGroupChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(renameGroup.fulfilled, (state, action) => {
        const updatedChat = {
          ...action.payload,
          groupPic: action.payload.groupAvatar || action.payload.groupPic,
          groupAvatar: action.payload.groupAvatar || action.payload.groupPic,
        };
        const index = state.chats.findIndex((c) => c._id === updatedChat._id);
        if (index !== -1) {
          state.chats[index] = updatedChat;
        }
        if (state.selectedChat && state.selectedChat._id === updatedChat._id) {
          state.selectedChat = updatedChat;
          localStorage.setItem("selectedChat", JSON.stringify(updatedChat));
        }
      })

      .addCase(addToGroup.fulfilled, (state, action) => {
        const updatedChat = {
          ...action.payload,
          groupPic: action.payload.groupAvatar || action.payload.groupPic,
          groupAvatar: action.payload.groupAvatar || action.payload.groupPic,
        };
        const index = state.chats.findIndex((c) => c._id === updatedChat._id);
        if (index !== -1) {
          state.chats[index] = updatedChat;
        }
        if (state.selectedChat && state.selectedChat._id === updatedChat._id) {
          state.selectedChat = updatedChat;
          localStorage.setItem("selectedChat", JSON.stringify(updatedChat));
        }
      })

      .addCase(removeFromGroup.fulfilled, (state, action) => {
        const updatedChat = {
          ...action.payload,
          groupPic: action.payload.groupAvatar || action.payload.groupPic,
          groupAvatar: action.payload.groupAvatar || action.payload.groupPic,
        };
        const index = state.chats.findIndex((c) => c._id === updatedChat._id);
        if (index !== -1) {
          state.chats[index] = updatedChat;
        }
        if (state.selectedChat && state.selectedChat._id === updatedChat._id) {
          state.selectedChat = updatedChat;
          localStorage.setItem("selectedChat", JSON.stringify(updatedChat));
        }
      })

      .addCase(leaveGroup.fulfilled, (state, action) => {
        const leftGroupId = action.payload._id;
        state.chats = state.chats.filter((c) => c._id !== leftGroupId);
        if (state.selectedChat?._id === leftGroupId) {
          state.selectedChat = null;
          localStorage.removeItem("selectedChat");
        }
      })

      .addCase(deleteChat.fulfilled, (state, action) => {
        const deletedChatId = action.payload;
        state.chats = state.chats.filter((c) => c._id !== deletedChatId);

        if (state.selectedChat?._id === deletedChatId) {
          state.selectedChat = null;
          localStorage.removeItem("selectedChat");
        }
      })

      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { chatId, isFavorite } = action.payload;

        const chat = state.chats.find(
          (c) => c._id === chatId || c.id === chatId,
        );
        if (chat) {
          chat.isFavorite = isFavorite;
        }

        const archivedChat = state.archivedChats.find(
          (c) => c._id === chatId || c.id === chatId,
        );
        if (archivedChat) {
          archivedChat.isFavorite = isFavorite;
        }

        if (
          state.selectedChat &&
          (state.selectedChat._id === chatId ||
            state.selectedChat.id === chatId)
        ) {
          state.selectedChat.isFavorite = isFavorite;
          localStorage.setItem(
            "selectedChat",
            JSON.stringify(state.selectedChat),
          );
        }
      })

      .addCase(markAsRead.fulfilled, (state, action) => {
        const chatId = action.payload;
        const chat = state.chats.find((c) => c._id === chatId);

        if (chat) {
          chat.isRead = true;
          chat.unreadCount = 0;
        }

        if (state.selectedChat && state.selectedChat._id === chatId) {
          state.selectedChat.isRead = true;
          state.selectedChat.unreadCount = 0;
          localStorage.setItem(
            "selectedChat",
            JSON.stringify(state.selectedChat),
          );
        }
      })

      .addCase(getBlockedUsers.fulfilled, (state, action) => {
        state.blockedUsers = action.payload.blockedMe || [];
        state.blockedByMe = (action.payload.iBlocked || []).map(
          (u) => u._id || u,
        );
      })

      .addCase(markAsUnread.fulfilled, (state, action) => {
        const chat = state.chats.find((c) => c._id === action.payload);
        if (chat) {
          chat.isRead = false;
          chat.unreadCount = Math.max(1, chat.unreadCount || 0);
        }
      })

      .addCase(toggleMuteChat.fulfilled, (state, action) => {
        const chatId = action.payload;
        const chat = state.chats.find((c) => c._id === chatId);
        if (chat) {
          chat.isMuted = !chat.isMuted;
        }
        if (state.selectedChat && state.selectedChat._id === chatId) {
          state.selectedChat.isMuted = !state.selectedChat.isMuted;
          localStorage.setItem(
            "selectedChat",
            JSON.stringify(state.selectedChat),
          );
        }
      })
      .addCase(toggleArchiveChat.fulfilled, (state, action) => {
        const chatId = action.payload;

        const archivedIndex = state.archivedChats.findIndex(
          (c) => c._id === chatId,
        );
        if (archivedIndex !== -1) {
          const [chat] = state.archivedChats.splice(archivedIndex, 1);
          chat.isArchived = false;
          state.chats.unshift(chat);
        }

        const activeIndex = state.chats.findIndex((c) => c._id === chatId);
        if (activeIndex !== -1) {
          const [chat] = state.chats.splice(activeIndex, 1);
          chat.isArchived = true;
          state.archivedChats.unshift(chat);
        }

        if (state.selectedChat && state.selectedChat._id === chatId) {
          state.selectedChat.isArchived = !state.selectedChat.isArchived;
          localStorage.setItem(
            "selectedChat",
            JSON.stringify(state.selectedChat),
          );
        }
      })

      .addCase(togglePinChat.fulfilled, (state, action) => {
        const chat = state.chats.find((c) => c._id === action.payload);
        if (chat) {
          chat.isPinned = !chat.isPinned;
        }

        if (state.selectedChat && state.selectedChat._id === action.payload) {
          state.selectedChat.isPinned = !state.selectedChat.isPinned;
          localStorage.setItem(
            "selectedChat",
            JSON.stringify(state.selectedChat),
          );
        }
      })

      // Error handling
      .addCase(deleteChat.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(renameGroup.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(addToGroup.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(removeFromGroup.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(leaveGroup.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(blockUser.fulfilled, (state, action) => {
        const blockedId = String(action.payload);
        if (!state.blockedByMe.some((id) => String(id) === blockedId)) {
          state.blockedByMe.push(blockedId);
        }
      })
      .addCase(unblockUser.fulfilled, (state, action) => {
        const unblockedId = String(action.payload);
        state.blockedByMe = state.blockedByMe.filter(
          (id) => String(id) !== unblockedId,
        );
      })
      .addCase(clearChat.fulfilled, (state, action) => {
        const chatId = action.payload;
        if (state.selectedChat?._id === chatId) {
          state.selectedChat.messages = [];
        }
        const chat = state.chats.find((c) => c._id === chatId);
        if (chat) {
          chat.lastMessage = null;
        }
      });
  },
});

export const {
  setSelectedChat,
  clearChatError,
  updateSeenBy,
  setMediaToView,
  updateSeenByInSelectedChat,
  updateChatInList,
  updateUnreadCount,
  updateLastMessage,
  messageReceived,
  messageSent,
  refreshChat,
  removeChat,
  updateChatMembers,
  updateUserStatus,
  messageDeleted,
} = chatSlice.actions;

export default chatSlice.reducer;
