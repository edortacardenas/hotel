"use client";

import { Button } from "@/components/ui/button";
import { TypographyMuted } from "@/components/ui/typography";
import { toast } from "sonner"
import { authClient} from "@/lib/auth-client";
import { RiGithubFill } from "@remixicon/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function GithubButton() {
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);

  return (
    <div className="w-full space-y-3 mt-3">
      <TypographyMuted className="text-center">or</TypographyMuted>
      <Button
        disabled={isGitHubLoading}
        className="bg-primary after:flex-1 text-primary-foreground shadow-xs  w-full hover:bg-primary/90"
        onClick={async () => {
            
            await authClient.signIn.social({
              provider: "github",
              callbackURL: "/",
            },{

              onRequest: ()=> {
                setIsGitHubLoading(true);
              },

              onError() {
                toast("Error!");
                setIsGitHubLoading(false);
              },
            });
              
      }}
      >
        <span className="pointer-events-none me-2 flex-1">
          {!isGitHubLoading ? (
            <RiGithubFill className="opacity-60" size={16} aria-hidden="true" />
          ) : (
            <Loader2 className="animate-spin" />
          )}
        </span>
        Login with GitHub
      </Button>
    </div>
  );
}
