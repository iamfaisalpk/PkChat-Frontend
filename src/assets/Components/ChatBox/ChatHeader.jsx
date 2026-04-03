import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  Video as VideoIcon,
  Phone,
  Search,
  MoreVertical,
  Trash2,
  Brush,
  UserX,
  UserMinus,
} from "lucide-react";
import instance from "../../Services/axiosInstance";
import ChatSearch from "../chat/ChatSearch";
import socket from "@/utils/socket";
import { toggleGroupInfo, toggleUserInfo } from "../../store/slices/uiSlice";
import { fetchChats, unblockUser } from "@/utils/chatThunks";
import { setSelectedChat } from "../../store/slices/chatSlice";
import { UserCircle } from "lucide-react";

const ChatHeader = ({
  otherUser,
  onBack,
  onUserInfo,
  onGroupInfo,
  onSearch,
}) => {
  const dispatch = useDispatch();
  const { selectedChat } = useSelector((s) => s.chat);
  const isGroup = selectedChat?.isGroup;

  const title = isGroup ? selectedChat.groupName : otherUser?.name || "Chat";
  const avatar = isGroup ? selectedChat.groupAvatar : otherUser?.profilePic;
  const isOnline = !isGroup && otherUser?.isOnline;

  const formatLastSeen = (time) => {
    if (!time) return "Offline";
    try {
      const date = new Date(time);
      if (isNaN(date.getTime())) return "Offline";

      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);

      if (diffInSeconds < 60) return "Active just now";
      if (diffInSeconds < 3600)
        return `Active ${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400)
        return `Active ${Math.floor(diffInSeconds / 3600)}h ago`;

      return `Active ${date.toLocaleDateString()}`;
    } catch (e) {
      return "Offline";
    }
  };

  return (
    <div 
      className="flex items-center justify-between px-4 py-3 bg-[var(--ig-bg)] border-b border-[var(--ig-border)] z-30 transition-colors duration-300"
      style={{ 
        height: 'calc(68px + env(safe-area-inset-top))',
        paddingTop: 'calc(12px + env(safe-area-inset-top))'
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="md:hidden cursor-pointer p-1.5 text-[var(--ig-text-primary)] hover:bg-[var(--ig-secondary-bg)] rounded-full transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>

        <div
          className="relative cursor-pointer group flex items-center gap-3 min-w-0"
          onClick={isGroup ? onGroupInfo : onUserInfo}
        >
          <div className="avatar-ring p-[2px]">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--ig-bg)] flex items-center justify-center bg-[var(--ig-secondary-bg)]">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-black text-lg uppercase">
                  {title.charAt(0)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <h2 className="text-[15px] font-bold text-[var(--ig-text-primary)] truncate tracking-tight">
              {title}
            </h2>
            <div className="flex items-center gap-1.5">
              {isOnline && (
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              )}
              <span className="text-[12px] text-[var(--ig-text-secondary)] font-medium truncate">
                {isGroup
                  ? `${selectedChat.members?.length || 0} members`
                  : isOnline
                    ? "Active now"
                    : formatLastSeen(otherUser?.lastSeen)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {otherUser?.isBlockedByMe && (
          <button
            onClick={() => {
              if (window.confirm(`Unblock ${otherUser.name}?`)) {
                dispatch(unblockUser(otherUser._id));
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg text-[10px] font-bold transition-all border border-green-500/20"
          >
            <UserCircle size={14} /> UNBLOCK
          </button>
        )}
        <button className="p-2 text-[var(--ig-text-primary)] hover:bg-[var(--ig-secondary-bg)] rounded-full transition-all hidden sm:block">
          <Phone size={22} strokeWidth={2} />
        </button>
        <button className="p-2 text-[var(--ig-text-primary)] hover:bg-[var(--ig-secondary-bg)] rounded-full transition-all hidden sm:block">
          <VideoIcon size={24} strokeWidth={2} />
        </button>
        <button
          onClick={isGroup ? onGroupInfo : onUserInfo}
          className="p-2 text-[var(--ig-text-primary)] hover:bg-[var(--ig-secondary-bg)] rounded-full transition-all"
        >
          <MoreVertical size={24} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
