import { Link } from "@tanstack/react-router";
import { User, LayoutDashboard, LogOut, Heart, Package, Award, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <Link to="/auth">
        <Button variant="ghost" size={compact ? "icon" : "sm"} className={compact ? "" : "gap-1.5"}>
          <User className="h-4 w-4" />
          {!compact && <span>Login</span>}
        </Button>
      </Link>
    );
  }

  const initials =
    (user.user_metadata?.full_name || user.email || "?")
      .split(/\s+/)
      .map((s: string) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 hover:border-primary/50 hover:bg-card transition-all px-1 pr-2 py-1">
          <Avatar className="h-8 w-8 ring-1 ring-primary/30">
            <AvatarImage src={user.user_metadata?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="text-xs font-semibold hidden md:inline max-w-[80px] truncate">
              {(user.user_metadata?.full_name as string) || "Account"}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border">
        <DropdownMenuLabel className="font-display">My account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="cursor-pointer">
            <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/orders" className="cursor-pointer">
            <Package className="h-4 w-4 mr-2" /> My orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/favorites" className="cursor-pointer">
            <Heart className="h-4 w-4 mr-2" /> Favorites
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/addresses" className="cursor-pointer">
            <MapPin className="h-4 w-4 mr-2" /> Addresses
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/rewards" className="cursor-pointer">
            <Award className="h-4 w-4 mr-2" /> Rewards
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
