import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Heart, Bell, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="blood-drop w-10 h-10 rounded-full flex items-center justify-center">
                <Heart className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">PulseConnect</h1>
                <p className="text-xs text-muted-foreground">Blood Bank Network</p>
              </div>
            </div>
          </Link>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <nav className="hidden md:flex items-center space-x-6">
                  <Link href="/" data-testid="link-dashboard">
                    <Button
                      variant={location === "/" ? "default" : "ghost"}
                      size="sm"
                    >
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/find-donors" data-testid="link-find-donors">
                    <Button
                      variant={location === "/find-donors" ? "default" : "ghost"}
                      size="sm"
                    >
                      Find Donors
                    </Button>
                  </Link>
                  <Link href="/register-donor" data-testid="link-register-donor">
                    <Button
                      variant={location === "/register-donor" ? "secondary" : "ghost"}
                      size="sm"
                    >
                      Become a Donor
                    </Button>
                  </Link>
                </nav>

                <Button variant="ghost" size="sm" data-testid="button-notifications">
                  <Bell size={18} />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-user-menu">
                      <User size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
              </>
            ) : (
              <Button asChild data-testid="button-signin">
                <a href="/api/login">Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 