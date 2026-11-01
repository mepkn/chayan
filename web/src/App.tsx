import { BrowserRouter, Route, Routes } from "react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Spinner } from "@/components/ui/spinner";
import { ChayanProvider } from "@/lib/store";
import { HomePage } from "@/pages/HomePage";
import { ListPage } from "@/pages/ListPage";
import { SignInPage } from "@/pages/SignInPage";

/** Your lists need a sign-in; a list link (/lists/:slug) is viewable by anyone. */
function Home() {
  return (
    <>
      <AuthLoading>
        <div className="flex-1 grid place-items-center min-h-screen">
          <Spinner className="size-6 text-cyan-400" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignInPage />
      </Unauthenticated>
      <Authenticated>
        <HomePage />
      </Authenticated>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Ambient glow backgrounds */}
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse-slow" />
      <div className="fixed top-1/2 -right-40 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none z-0 animate-pulse-slow" />
      <div className="fixed -bottom-40 left-1/3 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[180px] pointer-events-none z-0" />

      <ChayanProvider>
        <div className="relative z-10 flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lists/:slug" element={<ListPage />} />
            <Route path="*" element={<ListPage />} />
          </Routes>
        </div>
      </ChayanProvider>
    </BrowserRouter>
  );
}
