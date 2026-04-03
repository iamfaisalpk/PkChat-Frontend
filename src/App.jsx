import React, { useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import ProtectedRoute from "./assets/Components/ProtectedRoute";
const WhatsAppAuth = React.lazy(() => import("./assets/Components/WhatsAppAuth/WhatsAppAuth"));
const AppMain = React.lazy(() => import("./assets/Pages/AppMain"));
const ProfileSetup = React.lazy(() => import("./assets/Pages/ProfileSetup"));
const UserProfile = React.lazy(() => import("./assets/Pages/UserProfile"));
const Settings = React.lazy(() => import("./assets/Pages/Settings"));
const GroupInvitePreview = React.lazy(
  () => import("./assets/Pages/GroupInvitePreview"),
);
const ChatBox = React.lazy(() => import("./assets/Components/ChatBox/ChatBox"));

import useAuthManager from "./hooks/useAuthManager";
import socket, { connectSocket } from "@/utils/socket";
import {
  messageReceived,
  updateUserStatus,
  messageDeleted,
} from "./assets/store/slices/chatSlice";
import { fetchChats, getBlockedUsers } from "@/utils/chatThunks";
import { Toaster } from "react-hot-toast";
const ErrorPage = React.lazy(() => import("./assets/Pages/ErrorPage"));
import SkeletonLoader from "./assets/Components/common/SkeletonLoader";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth" replace />,
    errorElement: <ErrorPage />,
  },
  { path: "/auth", element: <WhatsAppAuth /> },
  { path: "/setup-profile", element: <ProfileSetup /> },
  { path: "preview/:inviteToken", element: <GroupInvitePreview /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/app",
        element: <AppMain />,
        children: [
          { path: "chats/:chatId", element: <ChatBox /> },
          { path: "profile", element: <UserProfile /> },
          { path: "settings", element: <Settings /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/auth" replace /> },
]);

const App = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      connectSocket(token);

      const handleConnect = () => {
        // console.log(" Socket connected:", socket.id);
      };
      const handleDisconnect = () => {
        console.log("Socket disconnected");
      };
      const handleMessageReceived = (newMessage) => {
        const currentUserId = JSON.parse(localStorage.getItem("user"))?._id;
        dispatch(
          messageReceived({
            ...newMessage,
            currentUserId,
          }),
        );
      };
      const handleConversationUpdated = ({
        conversationId,
        lastMessage,
        updatedAt,
      }) => {
        const currentUserId = JSON.parse(localStorage.getItem("user"))?._id;
        dispatch(
          messageReceived({
            conversationId,
            chatId: conversationId,
            _id: lastMessage?._id,
            text: lastMessage?.text,
            sender: lastMessage?.sender ? { _id: lastMessage.sender } : null,
            timestamp: lastMessage?.timestamp || updatedAt,
            currentUserId,
          }),
        );
      };
      const handleChatListUpdated = () => dispatch(fetchChats());
      const handleBlockStatusUpdated = () => dispatch(getBlockedUsers());
      const handleGroupDescriptionUpdated = () => dispatch(fetchChats());
      const handleUserStatus = (data) => dispatch(updateUserStatus(data));
      const handleGlobalMessageDeleted = (data) =>
        dispatch(messageDeleted(data));

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("message received", handleMessageReceived);
      socket.on("conversation-updated", handleConversationUpdated);
      socket.on("chat list updated", handleChatListUpdated);
      socket.on("block status updated", handleBlockStatusUpdated);
      socket.on("group description updated", handleGroupDescriptionUpdated);
      socket.on("user-status", handleUserStatus);
      socket.on("message-deleted", handleGlobalMessageDeleted);

      return () => {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("message received", handleMessageReceived);
        socket.off("conversation-updated", handleConversationUpdated);
        socket.off("chat list updated", handleChatListUpdated);
        socket.off("block status updated", handleBlockStatusUpdated);
        socket.off("group description updated", handleGroupDescriptionUpdated);
        socket.off("user-status", handleUserStatus);
        socket.off("message-deleted", handleGlobalMessageDeleted);
      };
    }
  }, [token, dispatch]);

  useAuthManager();

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <React.Suspense fallback={<SkeletonLoader />}>
        <RouterProvider router={router} />
      </React.Suspense>
    </>
  );
};

export default App;
