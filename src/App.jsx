import { lazy, Suspense, useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router";
import { Toaster } from "react-hot-toast";
import { LazyMotion } from "motion/react";
import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore";
import { useCircleStore } from "./store/useCircleStore";
import { usePresenceStore } from "./store/usePresenceStore";
import { connectSocket, disconnectSocket } from "./lib/socket";
import { safeNext, takePendingInvite } from "./lib/invite";
import PageLoader from "./components/PageLoader";
import AppShell from "./pages/AppShell";
import HomeWelcome from "./pages/HomeWelcome";
import ConversationPage from "./pages/ConversationPage";

// The board and chats load first; everything else when it's opened.
const AuthPage = lazy(() => import("./pages/AuthPage"));
const InvitePage = lazy(() => import("./pages/InvitePage"));
const AddFriendsPage = lazy(() => import("./pages/AddFriendsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CirclePage = lazy(() => import("./pages/CirclePage"));
const CreateCirclePage = lazy(() => import("./pages/CreateCirclePage"));
const loadMotionFeatures = () => import("./lib/motion-features").then((mod) => mod.default);

// Signed out on an app page: go to sign-in and come back afterwards.
function RequireSignIn() {
  const location = useLocation();
  return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
}

// Just signed in: accept an invite opened earlier, otherwise go where the visitor was heading.
function AfterSignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const acceptInvite = useChatStore((s) => s.acceptInvite);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const code = takePendingInvite();
    if (!code) return navigate(safeNext(params.get("next")), { replace: true });
    acceptInvite(code).then((friend) => navigate(friend ? `/c/${friend.username}` : "/", { replace: true }));
  }, [acceptInvite, navigate, params]);

  return <PageLoader />;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const userId = useAuthStore((s) => s.authUser?._id);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // The live connection and the board belong to the signed-in person.
  useEffect(() => {
    if (!userId) return;
    connectSocket();
    useChatStore.getState().loadFriends();
    useCircleStore.getState().loadCircles();
    return () => {
      disconnectSocket();
      useChatStore.getState().reset();
      useCircleStore.getState().reset();
      usePresenceStore.getState().reset();
    };
  }, [userId]);

  if (isCheckingAuth) return <PageLoader />;

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={userId ? <AfterSignIn /> : <AuthPage mode="login" />} />
          <Route path="/signup" element={userId ? <AfterSignIn /> : <AuthPage mode="signup" />} />
          <Route path="/i/:code" element={<InvitePage />} />
          <Route element={userId ? <AppShell /> : <RequireSignIn />}>
            <Route index element={<HomeWelcome />} />
            <Route path="c/:username" element={<ConversationPage />} />
            <Route path="add" element={<AddFriendsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="g/:id" element={<CirclePage />} />
            <Route path="circles/new" element={<CreateCirclePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster
        position="top-center"
        gutter={8}
        toastOptions={{
          duration: 3500,
          style: {
            background: "#26272B",
            color: "#F1EDE4",
            border: "1px solid #33343A",
            borderRadius: "10px",
            fontSize: "14px",
            padding: "10px 14px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          },
          success: { iconTheme: { primary: "#3DD68C", secondary: "#111214" } },
          error: { iconTheme: { primary: "#FF5A3C", secondary: "#111214" } },
        }}
      />
    </LazyMotion>
  );
}
