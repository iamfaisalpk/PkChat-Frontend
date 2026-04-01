import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Search,
  UserCircle,
  MessageSquarePlus,
  Settings,
  MessageSquare,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GroupCreateModal from "../Components/Models/GroupCreateModal";
import ChatList from "../Components/chat/ChatList";
import { accessChat, fetchChats, getBlockedUsers } from "@/utils/chatThunks";
import { setSelectedChat } from "../store/slices/chatSlice";
import instance from "../Services/axiosInstance";
import { rehydrateAuthFromStorage, fetchMe } from "../store/slices/authSlice";
import socket from "@/utils/socket";
import SEO from "../Components/SEO/SEO";
import SkeletonLoader from "../Components/common/SkeletonLoader";

const igStyles = `
  :root {
    --ig-bg: #000000;
    --ig-panel: #111111;
    --ig-border: rgba(255,255,255,0.08);
    --ig-secondary-bg: #1a1a1a;
    --ig-text-primary: #ffffff;
    --ig-text-secondary: rgba(255,255,255,0.45);
    --ig-primary: #e1306c;
    --ig-primary-hover: #c0255a;
    --ig-gradient: linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
    --ig-search-bg: #1e1e1e;
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .ig-tab-active {
    color: #ffffff !important;
    position: relative;
  }
  .ig-tab-active::after {
    content: '';
    position: absolute;
    bottom: -8px; left: 0; right: 0;
    height: 2px;
    background: var(--ig-gradient);
    border-radius: 2px;
  }

  .ig-avatar-ring {
    background: var(--ig-gradient);
    padding: 2px;
    border-radius: 50%;
  }

  .ig-sidebar-icon {
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    border-radius: 12px;
    transition: background 0.15s;
  }
  .ig-sidebar-icon:hover { background: rgba(255,255,255,0.06); }
  .ig-sidebar-icon .tooltip {
    display: none;
    position: absolute;
    left: calc(100% + 14px);
    background: #1e1e1e;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 5px 10px;
    border-radius: 8px;
    white-space: nowrap;
    border: 1px solid rgba(255,255,255,0.1);
    pointer-events: none;
    z-index: 100;
  }
  .ig-sidebar-icon:hover .tooltip { display: block; }

  .ig-search-input {
    width: 100%;
    height: 38px;
    background: var(--ig-search-bg);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 0 16px 0 38px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    outline: none;
    transition: border 0.2s, background 0.2s;
    font-family: inherit;
  }
  .ig-search-input::placeholder { color: rgba(255,255,255,0.3); }
  .ig-search-input:focus {
    border-color: rgba(193,53,132,0.4);
    background: #222;
  }

  .ig-send-btn {
    background: var(--ig-gradient);
    color: #fff;
    border: none;
    padding: 9px 20px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
    letter-spacing: 0.02em;
  }
  .ig-send-btn:hover { opacity: 0.88; transform: scale(1.02); }
  .ig-send-btn:active { transform: scale(0.97); }
`;

const AppMain = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [activeIcon, setActiveIcon] = useState("Chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedChat, chats } = useSelector((state) => state.chat);
  const menuRef = useRef();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [isDarkMode] = useState(true);

  /* ── inject styles once ── */
  useEffect(() => {
    const id = "ig-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = igStyles;
      document.head.appendChild(el);
    }
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await instance.get("/api/users/contacts/list");
        setContacts(res.data.contacts);
      } catch (err) {
        console.error("Error fetching contacts:", err);
      }
    };
    if (user?._id) fetchContacts();
  }, [user]);

  useEffect(() => {
    if (!user || !user._id) return;
    const savedChat = localStorage.getItem("selectedChat");
    if (!savedChat) return;
    try {
      const parsedChat = JSON.parse(savedChat);
      const exists = chats.find((c) => c._id === parsedChat._id);
      if (exists) {
        dispatch(setSelectedChat(parsedChat));
      } else {
        const userId = parsedChat?.members
          ?.filter((m) => m && m._id)
          .find((m) => m._id !== user._id)?._id;
        if (userId) dispatch(accessChat(userId));
      }
    } catch (e) {
      console.error(e);
    }
  }, [dispatch, chats, user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (token) {
      // Optimization: Fetch core data in parallel
      Promise.all([
        dispatch(fetchMe()),
        dispatch(getBlockedUsers()),
        dispatch(fetchChats())
      ]);
    }
  }, [dispatch, token]);

  /* ── WebSocket Global Listeners ── */
  useEffect(() => {
    if (!user?._id || !socket) return;

    socket.emit("setup", user._id);

    const refreshHandler = () => {
      dispatch(fetchChats());
    };

    const blockHandler = () => {
      dispatch(fetchMe());
      dispatch(fetchChats());
    };

    socket.on("chat list updated", refreshHandler);
    socket.on("block status updated", blockHandler);

    return () => {
      socket.off("chat list updated", refreshHandler);
      socket.off("block status updated", blockHandler);
    };
  }, [user?._id, dispatch]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const { data } = await instance.get(`/api/users?search=${searchQuery}`);
        setSearchResults(data);
      } catch (err) {
        console.error("Search error", err);
      }
    };
    const t = setTimeout(fetchUsers, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (location.pathname === "/app" && selectedChat) {
      dispatch(setSelectedChat(null));
    }
  }, [location.pathname, dispatch, selectedChat]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        dispatch(setSelectedChat(null));
        navigate("/app");
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [dispatch, navigate]);

  const handleUserClick = async (selectedUser) => {
    try {
      const action = await dispatch(accessChat(selectedUser._id));
      if (accessChat.fulfilled.match(action)) {
        setSearchQuery("");
        setSearchResults([]);
        navigate("/app");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    { id: "All", label: "All" },
    { id: "Unread", label: "Unread" },
    { id: "Favorites", label: "Favorites" },
    { id: "Groups", label: "Groups" },
  ];

  const sidebarIcons = [
    { icon: MessageSquare, label: "Chats", route: "/app" },
    {
      icon: Settings,
      label: "Settings",
      action: () => navigate("/app/settings"),
    },
  ];

  const isProfilePage = location.pathname === "/app/profile";
  const isSettingsPage = location.pathname === "/app/settings";

  const Avatar = ({ size = 32 }) => {
    const firstLetter = user?.name ? user.name.charAt(0).toUpperCase() : "?";

    return (
      <div
        style={{ width: size, height: size, cursor: "pointer" }}
        className="ig-avatar-ring"
        onClick={() => {
          navigate("/app/profile");
          setActiveIcon("Profile");
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            background: "#1a1a1a",
            border: "2px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {user?.profilePic ? (
            <img
              src={user.profilePic}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                color: "#fff",
                fontSize: size * 0.45,
                fontWeight: 800,
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              }}
            >
              {firstLetter}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--ig-bg)",
        color: "var(--ig-text-primary)",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      <SEO
        title="Messages"
        description="View your chats and messages on PK.Chat. Connect instantly with friends."
      />
      {/* ── LAYOUT ROW ── */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ════════════════════════════════════════
            1. DESKTOP SIDEBAR
        ════════════════════════════════════════ */}
        <div
          style={{
            display: "none",
            width: "72px",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "24px",
            paddingBottom: "24px",
            borderRight: "1px solid var(--ig-border)",
            background: "var(--ig-bg)",
            zIndex: 30,
            gap: "0",
            flexShrink: 0,
          }}
          className="ig-desktop-sidebar"
        >
          {/* Logo */}
          <div
            onClick={() => {
              navigate("/app");
              setActiveIcon("Chats");
            }}
            style={{
              marginBottom: "36px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <img
              src="/WhatsApp.svg.png"
              alt="WhatsApp"
              style={{
                width: "52px",
                height: "52px",
                objectFit: "contain",
                filter: "drop-shadow(0 0 8px rgba(37, 211, 102, 0.3))",
              }}
            />
          </div>

          {/* Nav Icons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              flex: 1,
            }}
          >
            {sidebarIcons.map((item, i) => (
              <div
                key={i}
                className="ig-sidebar-icon"
                onClick={() => {
                  if (item.action) item.action();
                  else if (item.route) navigate(item.route);
                  setActiveIcon(item.label);
                }}
                style={{
                  color:
                    activeIcon === item.label
                      ? "#fff"
                      : "rgba(255,255,255,0.45)",
                }}
              >
                <item.icon
                  size={24}
                  strokeWidth={activeIcon === item.label ? 2.5 : 1.8}
                />
                <span className="tooltip">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Profile at bottom */}
          <Avatar size={34} />
        </div>

        {/* ════════════════════════════════════════
            2. CHAT LIST PANEL
        ════════════════════════════════════════ */}
        {!isProfilePage && !isSettingsPage && (
          <div
            style={{
              display:
                selectedChat || isSettingsPage || isProfilePage
                  ? "none"
                  : "flex",
              flexDirection: "column",
              width: "100%",
              maxWidth: "100%", // Default to 100% for mobile
              borderRight: "1px solid var(--ig-border)",
              background: "var(--ig-bg)",
              zIndex: 20,
              flexShrink: 0,
              flex: 1, // Allow it to fill space on mobile
            }}
            className="ig-chat-list-panel"
          >
            {/* Panel Header */}
            <div style={{ padding: "20px 20px 0 20px", flexShrink: 0 }}>
              {/* Top row: username + new message */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <h1
                  style={{
                    fontSize: "20px",
                    fontWeight: 900,
                    color: "var(--ig-text-primary)",
                    letterSpacing: "-0.5px",
                    margin: 0,
                  }}
                >
                  {user?.name || "PK.Chat"}
                </h1>
                <button
                  onClick={() => setShowGroupModal(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--ig-text-primary)",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "8px",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <MessageSquarePlus size={24} />
                </button>
              </div>

              {/* Search */}
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(255,255,255,0.3)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ig-search-input"
                />
              </div>

              {/* Search results dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      position: "absolute",
                      top: "auto",
                      left: "16px",
                      right: "16px",
                      background: "#1a1a1a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "16px",
                      overflow: "hidden",
                      zIndex: 50,
                      boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                    }}
                  >
                    {searchResults.map((u) => (
                      <div
                        key={u._id}
                        onClick={() => handleUserClick(u)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px 16px",
                          cursor: "pointer",
                          transition: "background 0.15s",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(255,255,255,0.05)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background: "#2a2a2a",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          {u.profilePic ? (
                            <img
                              src={u.profilePic}
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
                                background: "rgba(255,255,255,0.05)",
                              }}
                            >
                              <span
                                style={{
                                  color: "#fff",
                                  fontSize: "16px",
                                  fontWeight: 800,
                                }}
                              >
                                {u.name?.charAt(0) || "?"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "14px",
                              fontWeight: 700,
                              color: "#fff",
                            }}
                          >
                            {u.name}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "rgba(255,255,255,0.4)",
                            }}
                          >
                            {u.phone}
                          </p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  overflowX: "auto",
                  paddingBottom: "12px",
                }}
                className="no-scrollbar"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={activeTab === tab.id ? "ig-tab-active" : ""}
                    style={{
                      background: "none",
                      border: "none",
                      color:
                        activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.4)",
                      fontSize: "14px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      padding: "0 0 8px 0",
                      position: "relative",
                      transition: "color 0.15s",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat List */}
            <div
              style={{ flex: 1, overflowY: "auto", padding: "0 8px 80px 8px" }}
              className="no-scrollbar"
            >
              <ChatList activeTab={activeTab} contacts={contacts} />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            3. MAIN CHAT / CONTENT AREA
        ════════════════════════════════════════ */}
        <div
          style={{
            flex: 1,
            display:
              !selectedChat &&
              !isProfilePage &&
              !isSettingsPage &&
              !location.pathname.includes("/app/chats/")
                ? "none"
                : "flex",
            flexDirection: "column",
            background: "var(--ig-bg)",
            overflow: "hidden",
            position: "relative",
            minHeight: 0,
          }}
          className="ig-main-area"
        >
          <AnimatePresence mode="wait">
            {location.pathname !== "/app" ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ height: "100%", width: "100%" }}
              >
                <React.Suspense fallback={<SkeletonLoader />}>
                  <Outlet />
                </React.Suspense>
              </motion.div>
            ) : (
              <div
                style={{
                  height: "100%",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "32px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "88px",
                    height: "88px",
                    background: "var(--ig-gradient)",
                    borderRadius: "50%",
                    padding: "2px",
                    marginBottom: "24px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "var(--ig-bg)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MessageSquare size={38} color="#fff" strokeWidth={1.5} />
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
                    maxWidth: "260px",
                    lineHeight: 1.6,
                    marginBottom: "24px",
                  }}
                >
                  Send private photos and messages to a friend or group.
                </p>
                <button
                  className="ig-send-btn"
                  onClick={() => setShowGroupModal(true)}
                >
                  Send Message
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      {!selectedChat && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "10px 24px 16px",
            borderTop: "1px solid var(--ig-border)",
            background: "var(--ig-bg)",
            flexShrink: 0,
            zIndex: 100,
          }}
          className="ig-mobile-nav"
        >
          {sidebarIcons.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                if (item.action) item.action();
                else if (item.route) navigate(item.route);
                setActiveIcon(item.label);
              }}
              style={{
                background: "none",
                border: "none",
                color:
                  activeIcon === item.label ? "#fff" : "rgba(255,255,255,0.4)",
                cursor: "pointer",
                padding: "8px",
                transition: "color 0.15s",
              }}
            >
              <item.icon
                size={26}
                strokeWidth={activeIcon === item.label ? 2.5 : 1.8}
              />
            </button>
          ))}
          <div style={{ padding: "4px" }}>
            <Avatar size={30} />
          </div>
        </div>
      )}

      {/* ── Responsive CSS ── */}
      <style>{`
        @media (min-width: 768px) {
          .ig-desktop-sidebar { display: flex !important; }
          .ig-mobile-nav { display: none !important; }
          .ig-chat-list-panel {
            display: flex !important;
            width: 380px !important;
            max-width: 380px !important;
            flex: none !important;
          }
          .ig-main-area { display: flex !important; }
        }
        @media (max-width: 767px) {
          .ig-desktop-sidebar { display: none !important; }
          .ig-chat-list-panel { max-width: 100% !important; }
        }
      `}</style>

      {showGroupModal && (
        <GroupCreateModal
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={() => dispatch(fetchChats())}
        />
      )}
    </div>
  );
};

export default AppMain;
