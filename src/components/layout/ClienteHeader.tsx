import { signOut } from "@/actions/auth";
import { LogOut } from "lucide-react";
import type { UserProfile } from "@/types/database.types";

interface Props {
  profile: Pick<UserProfile, "name" | "email">;
}

export default function ClienteHeader({ profile }: Props) {
  return (
    <header className="bg-[#25411e] border-b border-[#1d3317]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#eb6013] flex items-center justify-center">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-white/80 text-sm font-medium">Portal Agência Tucan</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm">{profile.name}</span>
          <form action={signOut}>
            <button type="submit" className="text-white/40 hover:text-white/80 transition-colors">
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
