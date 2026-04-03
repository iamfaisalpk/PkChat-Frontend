import React, { useState, useEffect } from "react";
import { X, Search, Users, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { fetchChats } from "@/utils/chatThunks";
import instance from "@/assets/Services/axiosInstance";

const InviteModal = ({
  chatId,
  inviteToken,
  onClose,
  groupMembers = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await instance.get(`/api/users/search?search=${searchQuery}`);
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Search failed:", err);
      }
    };

    const timer = setTimeout(fetchUsers, searchQuery ? 400 : 0);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUserSelect = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleAddUsers = async () => {
    setLoading(true);
    try {
      // Add all selected users to the group
      for (const userId of selectedUsers) {
        await instance.put("/api/chat/group-add", { chatId, userId });
      }
      toast.success("Users added successfully!");
      dispatch(fetchChats());
      onClose();
    } catch (err) {
      toast.error("Failed to add some users");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/preview/${inviteToken}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-[#1a1a1a] text-white p-7 rounded-[32px] w-full max-w-md shadow-2xl border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold">Add Members</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Select users to join group</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full cursor-pointer transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-500" />
          </div>
          <input
            autoFocus
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white/5 text-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00a884]/30 border border-white/5 transition-all"
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto mb-6 custom-scrollbar pr-1">
          {results.length > 0 ? (
            results.map((user) => {
              const inGroup = groupMembers.some(m => m?._id === user._id);
              const selected = selectedUsers.includes(user._id);

              return (
                <div
                  key={user._id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl mb-2 transition-all ${
                    inGroup ? "opacity-30 grayscale" : "hover:bg-white/5 cursor-pointer"
                  }`}
                  onClick={() => !inGroup && handleUserSelect(user._id)}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.profilePic || "/WhatsApp.jpg"} 
                      className="w-11 h-11 rounded-2xl object-cover border border-white/10" 
                      alt="" 
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{user.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{user.phone}</p>
                    </div>
                  </div>
                  {!inGroup && (
                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                      selected 
                        ? "bg-[#00a884] border-[#00a884] scale-110 shadow-[0_0_15px_rgba(0,168,132,0.3)]" 
                        : "border-white/10"
                    }`}>
                      {selected && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 opacity-30">
              <Users size={48} className="mx-auto mb-3" />
              <p className="text-[10px] uppercase tracking-[0.2em] font-black">Find someone to add</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={handleCopyLink} 
            className="text-[11px] font-black text-[#00a884] hover:text-[#00c99e] transition-colors uppercase tracking-widest text-center"
          >
            Copy Invite Link
          </button>
          <button
            onClick={handleAddUsers}
            disabled={selectedUsers.length === 0 || loading}
            className="w-full py-4 bg-[#00a884] hover:bg-[#00c99e] text-white rounded-2xl font-black text-sm uppercase tracking-[0.1em] transition-all disabled:opacity-20 disabled:grayscale shadow-lg shadow-[#00a884]/10"
          >
            {loading ? "Adding..." : `Add ${selectedUsers.length} Selected Members`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
