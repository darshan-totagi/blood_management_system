import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Heart, Bell, User, LogOut, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavLink = ({ href, label }) => (
    <Link href={href}>
      <Button
        variant={location === href ? "default" : "ghost"}
        size="sm"
        className="transition-all hover:scale-105"
      >
        {label}
      </Button>
    </Link>
  );

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="blood-drop w-10 h-10 rounded-full flex items-center justify-center">
                <Heart className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold">PulseConnect</h1>
                <p className="text-xs text-muted-foreground -mt-1">
                  Blood Bank Network
                </p>
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <nav className="flex items-center space-x-6">
                  <NavLink href="/" label="Dashboard" />
                  <NavLink href="/find-donors" label="Find Donors" />
                  <NavLink
                    href="/register-donor"
                    label="Become a Donor"
                  />
                </nav>

                <Button variant="ghost" size="sm">
                  <Bell size={18} />
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user?.picture} />
                        <AvatarFallback>
                          <User size={16} />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User size={16} className="mr-2" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/api/logout">
                        <LogOut size={16} className="mr-2" /> Logout
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild>
                <a href="/api/login">Sign In</a>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <div className="md:hidden flex flex-col space-y-3 pb-4 animate-in fade-in slide-in-from-top-2">
            {isAuthenticated ? (
              <>
                <NavLink href="/" label="Dashboard" />
                <NavLink href="/find-donors" label="Find Donors" />
                <NavLink href="/register-donor" label="Become a Donor" />

                <Button variant="ghost" size="sm" className="w-fit">
                  <Bell size={18} /> Notifications
                </Button>

                <Link href="/profile">
                  <Button variant="outline" size="sm" className="w-full">
                    <User size={16} className="mr-2" /> Profile
                  </Button>
                </Link>
                <a href="/api/logout">
                  <Button variant="destructive" size="sm" className="w-full">
                    <LogOut size={16} className="mr-2" /> Logout
                  </Button>
                </a>
              </>
            ) : (
              <Button asChild className="w-full">
                <a href="/api/login">Sign In</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
