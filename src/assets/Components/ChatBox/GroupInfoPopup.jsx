import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import {
  X,
  MessageSquare,
  Star,
  Bell,
  BellOff,
  Shield,
  Lock,
  Trash2,
  Search,
  Crown,
  Phone,
  Video,
  Edit3,
  Camera,
  Users,
  Settings,
  LogOut,
  Share2,
  Check,
  Heart,
  AlertTriangle,
  ChevronDown,
  Info,
  ArrowLeft,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../../Services/axiosInstance";
import { toast } from "react-hot-toast";
import {
  fetchChats,
  toggleMuteChat,
  deleteChat,
  clearChat,
  toggleFavorite,
} from "@/utils/chatThunks";
import InviteModal from "../../Pages/InviteModal";
import socket from "@/utils/socket";

// Constants
const MEMBER_DISPLAY_LIMIT = 5;
const DESCRIPTION_MAX_LENGTH = 512;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SEARCH_DEBOUNCE_DELAY = 500;

// ... (previous hooks and components remain same)

const GroupAvatar = memo(
  ({ chat, isGroupAdmin, onAvatarUpload, isLoading }) => (
    <div className="relative mb-4">
      <img
        src={chat.groupAvatar || "/WhatsApp.jpg"}
        alt={chat.groupName}
        className="w-32 h-32 rounded-full object-cover border-2 border-[#2a3942]"
        loading="lazy"
      />
      {isGroupAdmin && (
        <>
          <input
            type="file"
            accept="image/*"
            id="group-avatar-upload"
            style={{ display: "none" }}
            onChange={onAvatarUpload}
            disabled={isLoading}
          />
          <button
            className="absolute bottom-2 right-2 bg-[#00a884] rounded-full p-2 cursor-pointer hover:bg-[#00967a] disabled:opacity-50"
            onClick={() =>
              document.getElementById("group-avatar-upload").click()
            }
            disabled={isLoading}
            type="button"
          >
            <Camera size={16} className="text-white" />
          </button>
        </>
      )}
    </div>
  ),
);

const GroupInfoPopup = ({ chat, onClose, onUpdate }) => {
  const { user: currentUser } = useSelector((s) => s.auth);
  const { selectedChat } = useSelector((s) => s.chat);
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [sharedMedia, setSharedMedia] = useState([]);
  const [showAllMedia, setShowAllMedia] = useState(false);

  useEffect(() => {
    const fetchSharedMedia = async () => {
      try {
        if (!chat?._id) return;
        const res = await axios.get(`/api/messages/shared-media/${chat._id}`);
        setSharedMedia(res.data.media || []);
      } catch (err) {
        console.error("Error fetching shared media:", err);
      }
    };
    fetchSharedMedia();
  }, [chat?._id]);

  const isGroupAdmin = chat?.groupAdmin?._id === currentUser?._id;
  const isMuted = chat?.muted;
  const isFavorite = chat?.isFavorite;

  const handleLeaveGroup = async () => {
    if (!window.confirm("Leave this group?")) return;
    setIsLoading(true);
    try {
      await axios.put("/api/chat/group-leave", { chatId: chat._id });
      dispatch(fetchChats());
      onClose();
      toast.success("Left group");
    } catch (err) {
      toast.error("Failed to leave group");
    } finally {
      setIsLoading(false);
    }
  };

  const [userToKick, setUserToKick] = useState(null);

  const handleRemoveMember = async (memberId) => {
    const member = chat.members.find(m => m?._id === memberId);
    if (memberId === chat.groupAdmin?._id) return toast.error("Admin cannot be removed");
    setUserToKick(member);
  };

  const confirmKick = async () => {
    if (!userToKick) return;
    setIsLoading(true);
    try {
      await axios.put("/api/chat/group-remove", { chatId: chat._id, userId: userToKick._id });
      dispatch(fetchChats());
      toast.success(`${userToKick.name} removed`);
      setUserToKick(null);
    } catch (err) {
      toast.error("Failed to remove member");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDescription = async () => {
    const newDesc = prompt("Edit Group Description:", chat.groupDescription);
    if (newDesc === null || newDesc === chat.groupDescription) return;
    setIsLoading(true);
    try {
      await axios.put(`/api/chat/update-description/${chat._id}`, { description: newDesc });
      dispatch(fetchChats());
      toast.success("Description updated");
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMute = async () => {
    try {
      await dispatch(toggleMuteChat(chat._id)).unwrap();
      toast.success(isMuted ? "Notifications unmuted" : "Notifications muted");
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await dispatch(toggleFavorite(chat._id)).unwrap();
      toast.success(
        isFavorite ? "Removed from favorites" : "Group added to favorites",
      );
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleClearChat = async () => {
    if (
      !window.confirm(
        "Clear all messages in this group? This cannot be undone.",
      )
    )
      return;
    try {
      await dispatch(clearChat(chat._id)).unwrap();
      toast.success("Group chat cleared");
    } catch (err) {
      toast.error("Failed to clear chat");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("groupAvatar", file);

    setIsLoading(true);
    const loadingToast = toast.loading("Updating group icon...");

    try {
      const res = await axios.put(`/api/chat/group-avatar/${chat._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      dispatch(fetchChats());
      if (onUpdate) onUpdate(res.data);
      toast.success("Group icon updated", { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update icon", { id: loadingToast });
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  const handleDeleteGroupForever = async () => {
    if (
      !window.confirm(
        "DELETE GROUP FOREVER? This will remove the group for everyone. Are you sure?",
      )
    )
      return;
    setIsLoading(true);
    try {
      await dispatch(deleteChat(chat._id)).unwrap();
      toast.success("Group deleted forever");
      onClose();
    } catch (err) {
      toast.error("Failed to delete group");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareLink = () => {
    if (chat.inviteToken) {
      const link = `${window.location.origin}/preview/${chat.inviteToken}`;
      navigator.clipboard.writeText(link);
      toast.success("Link copied! Share it with others to join.");
    } else {
      toast.error("Invite token not found");
    }
  };

  if (!chat) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--ig-bg)] border-l border-[var(--ig-border)]">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-4 border-b border-[var(--ig-secondary-bg)]">
        <button
          onClick={onClose}
          className="p-2 hover:bg-[var(--ig-secondary-bg)] cursor-pointer rounded-xl text-[var(--ig-text-secondary)] hover:text-[var(--ig-text-primary)] transition-all"
        >
          {window.innerWidth < 768 ? <ArrowLeft size={22} /> : <X size={20} />}
        </button>
        <h2 className="text-sm font-bold text-[var(--ig-text-primary)] uppercase tracking-widest">
          Group Info
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Profile Card */}
        <div className="p-8 flex flex-col items-center border-b border-[var(--ig-secondary-bg)]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="avatar-ring p-1 mb-6 relative group"
          >
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-[var(--ig-bg)] shadow-2xl relative">
              <img
                src={chat.groupAvatar || "/WhatsApp.jpg"}
                alt=""
                className="w-full h-full object-cover"
              />
              {isGroupAdmin && (
                <div 
                  className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => document.getElementById("update-avatar-input").click()}
                >
                  <Camera size={24} className="text-white mb-1" />
                  <span className="text-white text-xs font-semibold">CHANGE</span>
                </div>
              )}
            </div>
            {isGroupAdmin && (
              <input
                type="file"
                id="update-avatar-input"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={isLoading}
              />
            )}
          </motion.div>
          <h3 className="text-xl font-bold text-[var(--ig-text-primary)] mb-1">
            {chat.groupName}
          </h3>
          <p className="text-sm text-[var(--ig-text-secondary)] font-medium tracking-wide">
            {chat.members?.length || 0} Members
          </p>
        </div>

        {/* Action List */}
        <div className="p-2 space-y-1">
          <ActionButton
            icon={Search}
            label="Search Messages"
            color="text-blue-400"
            onClick={() => toast.success("Use the search bar in header")}
          />
          <ActionButton
            icon={isMuted ? BellOff : Bell}
            label={isMuted ? "Unmute Notifications" : "Mute Notifications"}
            color={isMuted ? "text-[#8696a0]" : "text-orange-400"}
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
            icon={Share2}
            label="Share Group Link"
            color="text-emerald-400"
            onClick={handleShareLink}
          />
          <ActionButton
            icon={Shield}
            label="Encryption Status"
            color="text-emerald-500"
            onClick={() =>
              toast.info("Your group messages are end-to-end encrypted.", {
                icon: "🔒",
                style: { background: "#111", color: "#fff" },
              })
            }
          />
          <ActionButton
            icon={Edit3}
            label={`Shared Media (${sharedMedia.length})`}
            color="text-blue-400"
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
                  className="mt-2 text-[10px] font-bold text-[var(--ig-primary)] uppercase tracking-widest hover:underline"
                >
                  {showAllMedia
                    ? "Show Less"
                    : `View All ${sharedMedia.length}`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Description Section */}
        <div className="p-6 border-y border-[var(--ig-secondary-bg)] bg-[var(--ig-secondary-bg)]/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-bold text-[var(--ig-primary)] uppercase tracking-widest">
              Description
            </h4>
            {isGroupAdmin && (
              <Edit3
                size={14}
                onClick={handleUpdateDescription}
                className="text-[var(--ig-text-secondary)] cursor-pointer hover:text-[var(--ig-text-primary)]"
              />
            )}
          </div>
          <p className="text-sm text-[var(--ig-text-primary)] leading-relaxed">
            {chat.groupDescription ||
              "Official group for project discussions and updates."}
          </p>
        </div>

        {/* Members List */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] font-bold text-[var(--ig-primary)] uppercase tracking-widest">
              Members • {chat.members?.length}
            </h4>
            {isGroupAdmin && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-1.5 rounded-lg bg-[var(--ig-primary)]/10 text-[var(--ig-primary)] hover:bg-[var(--ig-primary)]/20 transition-all"
              >
                <Users size={16} />
              </button>
            )}
          </div>
          <div className="space-y-4">
            {chat.members?.map((member) => (
              <div
                key={member?._id}
                className="flex items-center gap-3 group px-2 py-1 hover:bg-[var(--ig-secondary-bg)] rounded-xl transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--ig-border)]">
                  <img
                    src={member?.profilePic || "/default-avatar.png"}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[var(--ig-text-primary)] truncate">
                      {member?._id === currentUser?._id ? "You" : member?.name}
                    </p>
                    {member?._id === chat.groupAdmin?._id && (
                      <span className="text-[9px] font-bold text-[var(--ig-primary)] uppercase bg-[var(--ig-primary)]/10 px-1.5 py-0.5 rounded-md">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--ig-text-secondary)] truncate">
                    {member?.about || "I am using PK.Chat"}
                  </p>
                </div>
                {isGroupAdmin && member?._id !== currentUser?._id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMember(member._id);
                    }}
                    className="p-1 px-2 text-[10px] font-bold text-red-500 hover:bg-red-500/10 rounded-md transition-all uppercase"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-6 space-y-3 mt-6 border-t border-[var(--ig-secondary-bg)]">
          <button
            onClick={handleLeaveGroup}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 text-red-500 text-sm font-bold hover:bg-red-100 transition-all border border-red-100 disabled:opacity-50 dark:bg-red-500/10 dark:border-red-500/20"
          >
            <LogOut size={18} /> Exit Group
          </button>

          <button
            onClick={handleClearChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[var(--ig-text-secondary)] text-xs font-bold hover:bg-[var(--ig-secondary-bg)] hover:text-red-500 transition-all justify-center"
          >
            <AlertTriangle size={16} /> Clear Group History
          </button>

          {isGroupAdmin && (
            <button
              onClick={handleDeleteGroupForever}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500/60 text-[11px] font-bold hover:text-red-500 transition-all justify-center"
            >
              <Trash2 size={16} /> Delete Group Forever
            </button>
          )}
        </div>
      </div>

      {showInviteModal && (
        <InviteModal
          chatId={chat._id}
          inviteToken={chat.inviteToken}
          groupMembers={chat.members}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Kick Member Confirmation Modal */}
      <AnimatePresence>
        {userToKick && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setUserToKick(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#1a1a1a] rounded-[32px] p-8 text-center border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Users size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Remove {userToKick.name}?
              </h3>
              <p className="text-sm text-white/50 leading-relaxed mb-8">
                Are you sure you want to remove this member from the group? They can be added back later by an admin.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmKick}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-colors cursor-pointer"
                >
                  Remove Member
                </button>
                <button
                  onClick={() => setUserToKick(null)}
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
    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[var(--ig-secondary-bg)] rounded-2xl transition-all group text-left"
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

export default GroupInfoPopup;
