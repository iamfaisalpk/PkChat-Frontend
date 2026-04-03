import React, { useEffect, useState } from "react";
import {
  X,
  MessageSquare,
  Phone,
  Video,
  Search,
  Heart,
  Bell,
  BellOff,
  MessageCircle,
  Shield,
  Lock,
  Trash2,
  UserMinus,
  AlertTriangle,
  Info,
  ArrowLeft,
} from "lucide-react";
import instance from "../../Services/axiosInstance";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  toggleFavorite,
  toggleMuteChat,
  blockUser,
  unblockUser,
  clearChat,
  deleteChat,
} from "@/utils/chatThunks";
import { toast } from "react-hot-toast";
import { setSelectedChat } from "../../store/slices/chatSlice";

const UserInfoPopup = ({ user, onClose }) => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((s) => s.auth);
  const { selectedChat, blockedByMe } = useSelector((s) => s.chat);
  const [sharedGroups, setSharedGroups] = useState([]);
  const [sharedMedia, setSharedMedia] = useState([]);
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [loading, setLoading] = useState(false);

  const isBlocked = blockedByMe.some((id) => String(id) === String(user?._id));
  const isFavorite = selectedChat?.isFavorite;
  const isMuted = selectedChat?.muted;

  useEffect(() => {
    const fetchSharedGroups = async () => {
      try {
        if (!user?._id) return;
        const res = await instance.get(`/api/chat/shared-groups/${user._id}`);
        setSharedGroups(res.data.groups || []);
      } catch (err) {
        console.error("Error fetching shared groups:", err);
      }
    };
    const fetchSharedMedia = async () => {
      try {
        if (!selectedChat?._id) return;
        const res = await instance.get(
          `/api/messages/shared-media/${selectedChat._id}`,
        );
        setSharedMedia(res.data.media || []);
      } catch (err) {
        console.error("Error fetching shared media:", err);
      }
    };
    fetchSharedGroups();
    fetchSharedMedia();
  }, [user, selectedChat]);

  const handleToggleFavorite = async () => {
    if (!selectedChat?._id) return;
    try {
      await dispatch(toggleFavorite(selectedChat._id)).unwrap();
      toast.success(
        isFavorite ? "Removed from favorites" : "Added to favorites",
      );
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleToggleMute = async () => {
    if (!selectedChat?._id) return;
    try {
      await dispatch(toggleMuteChat(selectedChat._id)).unwrap();
      toast.success(isMuted ? "Notifications unmuted" : "Notifications muted");
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const [showBlockModal, setShowBlockModal] = useState(false);

  const handleBlockToggle = async () => {
    if (!user?._id) return;
    if (loading) return;
    
    if (isBlocked) {
      setLoading(true);
      try {
        await dispatch(unblockUser(user._id)).unwrap();
        toast.success("User unblocked");
      } catch (err) {
        toast.error(err || "Action failed");
      } finally {
        setLoading(false);
      }
    } else {
      setShowBlockModal(true);
    }
  };

  const confirmBlock = async () => {
    setShowBlockModal(false);
    setLoading(true);
    try {
      await dispatch(blockUser(user._id)).unwrap();
      toast.success("User blocked successfully");
    } catch (err) {
      toast.error(err || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!selectedChat?._id) return;
    if (
      !window.confirm("Clear all messages in this chat? This cannot be undone.")
    )
      return;
    try {
      await dispatch(clearChat(selectedChat._id)).unwrap();
      toast.success("Chat cleared");
    } catch (err) {
      toast.error("Failed to clear chat");
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChat?._id) return;
    if (
      !window.confirm(
        "Delete this chat? All messages and media will be removed for you.",
      )
    )
      return;
    try {
      await dispatch(deleteChat(selectedChat._id)).unwrap();
      toast.success("Chat deleted");
      onClose();
    } catch (err) {
      toast.error("Failed to delete chat");
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--ig-bg)] border-l border-[var(--ig-border)]">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-4 border-b border-[var(--ig-secondary-bg)]">
        <button
          onClick={onClose}
          className="p-2 cursor-pointer hover:bg-[var(--ig-secondary-bg)] rounded-xl text-[var(--ig-text-secondary)] hover:text-[var(--ig-text-primary)] transition-all"
        >
          {window.innerWidth < 768 ? <ArrowLeft size={22} /> : <X size={20} />}
        </button>
        <h2 className="text-sm font-bold text-[var(--ig-text-primary)] uppercase tracking-widest">
          Contact Details
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Profile Card */}
        <div className="p-8 flex flex-col items-center border-b border-[var(--ig-secondary-bg)]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="avatar-ring p-1 mb-6"
          >
            <div
              className={`w-40 h-40 rounded-full overflow-hidden border-4 border-[var(--ig-bg)] shadow-2xl flex items-center justify-center ${user.profilePic ? "" : "bg-[var(--ig-secondary-bg)]"}`}
            >
              {user.profilePic ? (
                <img
                  src={user.profilePic}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-6xl font-black uppercase">
                  {user.name?.charAt(0) || "?"}
                </span>
              )}
            </div>
          </motion.div>
          <h3 className="text-xl font-bold text-[var(--ig-text-primary)] mb-1">
            {user.name}
          </h3>
          <p className="text-sm text-[var(--ig-text-secondary)] font-medium tracking-wide">
            {user.phone}
          </p>
        </div>

        {/* About Info */}
        <div className="p-6 border-b border-[var(--ig-secondary-bg)]">
          <h4 className="text-[10px] font-bold text-[var(--ig-primary)] uppercase tracking-widest mb-3">
            About
          </h4>
          <p className="text-sm text-[var(--ig-text-primary)] leading-relaxed">
            {user.about || "Hey there! I am using PK.Chat"}
          </p>
        </div>

        {/* Action List */}
        <div className="p-2 space-y-1">
          <ActionButton
            icon={MessageSquare}
            label={`Shared Media (${sharedMedia.length})`}
            color="text-blue-500"
            onClick={() => setShowAllMedia(!showAllMedia)}
          />

          {sharedMedia.length > 0 && (
            <div className="px-6 py-2">
              <div className="grid grid-cols-3 gap-2">
                {sharedMedia.slice(0, showAllMedia ? undefined : 6).map((m) => (
                  <div
                    key={m._id}
                    className="aspect-square rounded-lg bg-[var(--ig-secondary-bg)] overflow-hidden border border-[var(--ig-border)] cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(m.url, "_blank")}
                  >
                    {m.type === "image" ? (
                      <img
                        src={m.url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--ig-text-secondary)]">
                        {m.type === "video" ? "🎥" : "📎"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {sharedMedia.length > 6 && (
                <button
                  onClick={() => setShowAllMedia(!showAllMedia)}
                  className="mt-2 cursor-pointer text-[10px] font-bold text-[var(--ig-primary)] uppercase tracking-widest hover:underline"
                >
                  {showAllMedia
                    ? "Show Less"
                    : `View All ${sharedMedia.length}`}
                </button>
              )}
            </div>
          )}
          <ActionButton
            icon={isMuted ? BellOff : Bell}
            label={isMuted ? "Unmute Notifications" : "Mute Notifications"}
            color={isMuted ? "text-[#8696a0]" : "text-orange-500"}
            onClick={handleToggleMute}
          />
          <ActionButton
            icon={Heart}
            label={isFavorite ? "Favorited" : "Add to Favorites"}
            color={
              isFavorite ? "text-pink-500" : "text-[var(--ig-text-secondary)]"
            }
            fill={isFavorite}
            onClick={handleToggleFavorite}
          />
          <ActionButton
            icon={Shield}
            label="Encryption Status"
            color="text-green-500"
            onClick={() =>
              toast.info("Your messages are end-to-end encrypted.", {
                icon: "🔒",
                style: { background: "#111", color: "#fff", fontSize: "12px" },
              })
            }
          />
        </div>

        {/* Groups In Common */}
        {sharedGroups.length > 0 && (
          <div className="p-6 border-t border-[var(--ig-secondary-bg)]">
            <h4 className="text-[10px] font-bold text-[var(--ig-primary)] uppercase tracking-widest mb-4">
              Groups in Common
            </h4>
            <div className="space-y-4">
              {sharedGroups.map((group) => (
                <div
                  key={group._id}
                  className="flex items-center gap-3 p-3 bg-[var(--ig-secondary-bg)] rounded-2xl cursor-pointer border border-[var(--ig-border)] hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden">
                    <img
                      src={group.groupAvatar || "/WhatsApp.jpg"}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--ig-text-primary)] truncate">
                      {group.groupName}
                    </p>
                    <p className="text-xs text-[var(--ig-text-secondary)] truncate">
                      {group.members?.length} Members
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="p-6 space-y-3 mt-4">
          <button
            onClick={handleBlockToggle}
            disabled={loading}
            className={`w-full flex cursor-pointer items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all border ${
              isBlocked
                ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                : "bg-red-50 text-red-500 border-red-100 hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/20"
            }`}
          >
            {isBlocked ? <Shield size={18} /> : <UserMinus size={18} />}
            {isBlocked ? "Unblock User" : "Block User"}
          </button>

          <button
            onClick={handleClearChat}
            className="w-full cursor-pointer flex items-center gap-3 px-4 py-3 rounded-2xl text-[var(--ig-text-secondary)] text-xs font-bold hover:bg-[var(--ig-secondary-bg)] hover:text-red-500 transition-all justify-center"
          >
            <AlertTriangle size={16} /> Clear Chat History
          </button>

          <button
            onClick={handleDeleteChat}
            className="w-full cursor-pointer flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500/60 text-[11px] font-bold hover:text-red-500 transition-all justify-center"
          >
            <Trash2 size={16} /> Delete Chat Permanently
          </button>
        </div>
      </div>
      {/* Block Confirmation Modal */}
      <AnimatePresence>
        {showBlockModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowBlockModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#1a1a1a] rounded-[28px] p-8 text-center border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Block {user.name}?
              </h3>
              <p className="text-sm text-white/50 leading-relaxed mb-8">
                Blocked contacts will no longer be able to call you or send you messages. This contact will not be notified.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmBlock}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-colors cursor-pointer"
                >
                  Block
                </button>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Helper Component ── */
const ActionButton = ({ icon: Icon, label, color, onClick, fill }) => (
  <button
    onClick={onClick}
    className="w-full flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-[var(--ig-secondary-bg)] rounded-2xl transition-all group text-left"
  >
    <div
      className={`p-2 rounded-xl bg-[var(--ig-secondary-bg)] group-hover:scale-110 transition-transform ${color}`}
    >
      <Icon size={18} fill={fill ? "currentColor" : "none"} />
    </div>
    <span className="text-sm font-semibold text-[var(--ig-text-primary)]">
      {label}
    </span>
  </button>
);

export default UserInfoPopup;
