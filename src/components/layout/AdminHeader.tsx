import { signOut } from "@/actions/auth";
import { LogOut } from "lucide-react";
import type { UserProfile } from "@/types/database.types";

interface Props {
  profile: Pick<UserProfile, "name" | "email" | "role">;
}

export default function AdminHeader({ profile }: Props) {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-[#1f1f1f]">{profile.name}</p>
          <p className="text-xs text-[#666666] capitalize">{profile.role}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
