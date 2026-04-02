import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { ArrowLeft, MoreVertical, Search, Brush, LogOut } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import instance from "../../Services/axiosInstance";
import { setSelectedChat } from "../../store/slices/chatSlice";
import { fetchChats } from "@/utils/chatThunks";
import toast from "react-hot-toast";
import socket from "@/utils/socket";

const GroupHeader = ({
  onBack,
  onSearch,
  onClearLocalMessages,
  onGroupInfo,
}) => {
  const dispatch = useDispatch();
  const { selectedChat } = useSelector((state) => state.chat);
  const [showOptions, setShowOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const menuRef = useRef();

  const groupMembers = useMemo(() => {
    if (!selectedChat?.members) return [];

    return [
      ...new Map(
        selectedChat.members
          .filter((m) => m)
          .map((m) => {
            const id = m._id || m;
            return [id, m];
          }),
      ).values(),
    ];
  }, [selectedChat?.members]);

  const participantCount = groupMembers.length;

  // Improved toast helper function
  const showToast = useCallback((type, message, options = {}) => {
    switch (type) {
      case "success":
        return toast.success(message, {
          duration: 3000,
          position: "top-center",
          ...options,
        });
      case "error":
        return toast.error(message, {
          duration: 4000,
          position: "top-center",
          ...options,
        });
      case "info":
        return toast(message, {
          icon: "ℹ️",
          duration: 3000,
          position: "top-center",
          ...options,
        });
      case "loading":
        return toast.loading(message, {
          position: "top-center",
          ...options,
        });
      default:
        return toast(message, options);
    }
  }, []);

  const handleOutsideClick = useCallback((e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setShowOptions(false);
    }
  }, []);

  useEffect(() => {
    if (!socket || !selectedChat?._id) return;

    const handleLeftGroup = ({ chatId }) => {
      if (chatId !== selectedChat._id) return;
      dispatch(setSelectedChat(null));
      dispatch(fetchChats());
      showToast("info", "You have been removed from the group");
    };

    const handleDescriptionUpdate = ({ chatId }) => {
      if (chatId !== selectedChat._id) return;

      dispatch(fetchChats());
      showToast("info", "Group description was updated");
    };

    const handleMemberChange = ({ chatId }) => {
      if (chatId !== selectedChat._id) return;

      dispatch(fetchChats());
      showToast("info", "Group members have changed");
    };

    socket.on("left-group", handleLeftGroup);
    socket.on("group description updated", handleDescriptionUpdate);
    socket.on("user-added-to-group", handleMemberChange);
    socket.on("user-removed-from-group", handleMemberChange);

    return () => {
      socket.off("left-group", handleLeftGroup);
      socket.off("group description updated", handleDescriptionUpdate);
      socket.off("user-added-to-group", handleMemberChange);
      socket.off("user-removed-from-group", handleMemberChange);
    };
  }, [socket, selectedChat?._id, dispatch, showToast]);

  // Outside click effect
  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [handleOutsideClick]);

  const handleClearChat = async () => {
    if (!selectedChat?._id || isLoading) return;

    const loadingToast = showToast("loading", "Clearing chat...");
    setIsLoading(true);

    try {
      await instance.delete(`/api/messages/clear/${selectedChat._id}`);
      dispatch(fetchChats());
      onClearLocalMessages?.();
      setShowOptions(false);

      toast.dismiss(loadingToast);
      showToast("success", "Chat cleared successfully");
    } catch (err) {
      console.error("Error clearing chat:", err);
      toast.dismiss(loadingToast);

      // More specific error messages
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to clear chat. Please try again.";
      showToast("error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedChat?._id || isLoading) return;

    const loadingToast = showToast("loading", "Leaving group...");
    setIsLoading(true);

    try {
      await instance.put(`/api/chat/group-leave`, { chatId: selectedChat._id });
      dispatch(setSelectedChat(null));
      dispatch(fetchChats());
      setShowOptions(false);

      toast.dismiss(loadingToast);
      showToast("success", "Left group successfully");
    } catch (err) {
      console.error("Error leaving group:", err);
      toast.dismiss(loadingToast);

      // More specific error messages
      const errorMessage =
        err?.response?.status === 403
          ? "You do not have permission to leave this group"
          : err?.response?.data?.message ||
            err?.message ||
            "Failed to leave group. Please try again.";
      showToast("error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOptions = useCallback(() => {
    setShowOptions((prev) => !prev);
  }, []);

  // Early return if no selected chat
  if (!selectedChat) {
    return null;
  }

  const groupInitial = selectedChat.groupName?.charAt(0)?.toUpperCase() || "G";

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#161717] text-white relative">
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="lg:hidden block p-1 rounded hover:bg-[#2a3942] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-[#8696a0]" />
        </button>

        {/* Group Avatar */}
        <div
          className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onGroupInfo}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onGroupInfo?.();
            }
          }}
          aria-label="View group info"
        >
          {selectedChat.groupAvatar ? (
            <img
              src={selectedChat.groupAvatar}
              alt={`${selectedChat.groupName} avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm bg-[#2a3942] text-gray-300">
              {groupInitial}
            </div>
          )}
        </div>

        <div className="leading-4">
          <div className="font-medium text-sm truncate max-w-48">
            {selectedChat.groupName}
          </div>
          <div className="text-xs text-[#8696a0]">
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 relative">
        <button
          onClick={onSearch}
          className="p-2 rounded hover:bg-[#2a3942] transition-colors"
          aria-label="Search"
        >
          <Search className="w-5 h-5 text-[#8696a0]" />
        </button>

        <button
          onClick={toggleOptions}
          className="p-2 rounded hover:bg-[#2a3942] transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5 text-[#8696a0] cursor-pointer" />
        </button>

        {showOptions && (
          <div
            ref={menuRef}
            className="absolute right-0 top-12 w-40 bg-[#233138] rounded-md shadow-lg z-20 border border-[#2a3942]"
            role="menu"
          >
            <button
              onClick={handleClearChat}
              disabled={isLoading}
              className="flex items-center px-4 py-2 text-sm w-full text-white hover:bg-[#2a3942] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              role="menuitem"
            >
              <Brush className="w-4 h-4 mr-2 cursor-pointer" />
              {isLoading ? "Clearing..." : "Clear Chat"}
            </button>

            <button
              onClick={handleLeaveGroup}
              disabled={isLoading}
              className="flex items-center px-4 py-2 text-sm w-full text-red-400 hover:bg-[#2a3942] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              role="menuitem"
            >
              <LogOut className="w-4 h-4 mr-2 cursor-pointer" />
              {isLoading ? "Leaving..." : "Leave Group"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupHeader;
