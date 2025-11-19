import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Heart, Bell, User, LogOut, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-md bg-opacity-80"
      data-testid="header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* LOGO */}
          <Link href="/" data-testid="link-home">
            <div className="flex items-center space-x-3 cursor-pointer group">
              <div className="blood-drop w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110">
                <Heart className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition">
                  PulseConnect
                </h1>
                <p className="text-xs text-muted-foreground">Blood Bank Network</p>
              </div>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/" data-testid="link-dashboard">
                <div className="relative">
                  <Button
                    variant={location === "/" ? "default" : "ghost"}
                    size="sm"
                  >
                    Dashboard
                  </Button>
                  {location === "/" && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary rounded-full animate-pulse"></span>
                  )}
                </div>
              </Link>

              <Link href="/find-donors" data-testid="link-find-donors">
                <div className="relative">
                  <Button
                    variant={location === "/find-donors" ? "default" : "ghost"}
                    size="sm"
                  >
                    Find Donors
                  </Button>
                  {location === "/find-donors" && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary rounded-full animate-pulse"></span>
                  )}
                </div>
              </Link>

              <Link href="/register-donor" data-testid="link-register-donor">
                <div className="relative">
                  <Button
                    variant={location === "/register-donor" ? "secondary" : "ghost"}
                    size="sm"
                  >
                    Become a Donor
                  </Button>
                  {location === "/register-donor" && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary rounded-full animate-pulse"></span>
                  )}
                </div>
              </Link>
            </nav>
          )}

          {/* ACTIONS */}
          <div className="flex items-center space-x-3">

            {/* NOTIFICATION BADGE */}
            {isAuthenticated && (
              <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  2
                </span>
              </Button>
            )}

            {/* USER MENU OR SIGN IN */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:ring-2 hover:ring-primary transition cursor-pointer"
                    data-testid="button-user-menu"
                  >
                    <User size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" data-testid="link-profile">
                      <User size={16} className="mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="/api/logout" data-testid="link-logout">
                      <LogOut size={16} className="mr-2" />
                      Logout
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild data-testid="button-signin">
                <a href="/api/login">Sign In</a>
              </Button>
            )}

            {/* MOBILE MENU BUTTON */}
            {isAuthenticated && (
              <button
                className="md:hidden ml-2"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <Menu size={22} />
              </button>
            )}
          </div>
        </div>

        {/* MOBILE MENU DROPDOWN */}
        {mobileOpen && (
          <div className="md:hidden bg-card border-t border-border p-4 space-y-3 animate-in slide-in-from-top">
            <Link href="/">
              <Button
                variant={location === "/" ? "default" : "ghost"}
                className="w-full justify-start"
              >
                Dashboard
              </Button>
            </Link>

            <Link href="/find-donors">
              <Button
                variant={location === "/find-donors" ? "default" : "ghost"}
                className="w-full justify-start"
              >
                Find Donors
              </Button>
            </Link>

            <Link href="/register-donor">
              <Button
                variant={location === "/register-donor" ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                Become a Donor
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
