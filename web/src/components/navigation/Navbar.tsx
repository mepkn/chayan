import React from "react";
import { Link, useNavigate } from "react-router";
import { Authenticated } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Dice5, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function SignOutButton() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="text-slate-400 hover:text-white"
          />
        }
      >
        <LogOut />
      </TooltipTrigger>
      <TooltipContent>Sign out</TooltipContent>
    </Tooltip>
  );
}

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/10 bg-[#06070B]/80 backdrop-blur-xl">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center">
        {/* Centered Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)] group-hover:shadow-[0_0_25px_rgba(0,240,255,0.7)] transition-all duration-300">
            <Dice5 className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 group-hover:to-cyan-300">
            CHAYAN
          </span>
        </Link>
        <Authenticated>
          <div className="absolute right-4 sm:right-6 lg:right-8">
            <SignOutButton />
          </div>
        </Authenticated>
      </div>
    </header>
  );
};
