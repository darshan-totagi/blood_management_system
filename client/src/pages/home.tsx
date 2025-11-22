import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Heart,
  Users,
  Calendar,
  Award,
  Plus,
  Search,
  Sparkles,
  Shield
} from "lucide-react";

import { motion } from "framer-motion";
import type { Donor, Donation } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Show message if not authenticated (no auto-login)
  // Redirect on logout
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please sign in to continue.",
        variant: "destructive",
      });
      return;
        description: "You are logged out. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => (window.location.href = "/api/login"), 800);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: donor, isLoading: donorLoading } = useQuery<Donor>({
    queryKey: ["/api/donors/me"],
    retry: false,
  });

  const { data: donations = [], isLoading: donationsLoading } = useQuery<Donation[]>({
    queryKey: ["/api/donations/me"],
    retry: false,
    enabled: !!donor,
  });

  const { data: eligibility, isLoading: eligibilityLoading } = useQuery({
    queryKey: ["/api/donors/eligibility"],
    retry: false,
    enabled: !!donor,
  });

  /* -------------------------------------------------------------------------- */
  /*                               LOADING SCREEN                               */
  /* -------------------------------------------------------------------------- */

  if (isLoading || donorLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex items-center justify-center flex-1">
          <div className="animate-pulse text-primary text-3xl font-semibold">
            Loading…
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                               MAIN DASHBOARD                               */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-background" data-testid="page-home">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Resume Donor Registration */}
        {!donor && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 text-primary px-5 py-4 rounded-xl flex items-center justify-between shadow-sm backdrop-blur-sm"
          >
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> Complete Your Donor Profile
              </h3>
              <p className="text-sm text-primary/70">
                Unlock credits, increase visibility & help your community.
              </p>
            </div>

            <Button asChild variant="secondary" className="font-semibold">
              <Link href="/register-donor">Resume</Link>
            </Button>
          </motion.div>
        )}

        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-1"
        >
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
            Welcome to PulseConnect
          </h1>
          <p className="text-muted-foreground text-lg">
            Your dashboard for donations & community impact.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="grid md:grid-cols-2 gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.12 } },
          }}
        >
          {[
            {
              title: "Become a Donor",
              desc: "Register to help save lives",
              icon: <Heart className="text-secondary" size={24} />,
              link: "/register-donor",
              variant: "secondary",
              iconColor: "bg-secondary/10",
            },
            {
              title: "Find Donors",
              desc: "Search for blood donors nearby",
              icon: <Search className="text-accent" size={24} />,
              link: "/find-donors",
              variant: "outline",
              iconColor: "bg-accent/10",
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Card className="hover:shadow-lg transition">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`${item.iconColor} p-3 rounded-full`}>{item.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>

                  <Button asChild variant={item.variant as any}>
                    <Link href={item.link}>{item.title === "Find Donors" ? "Search" : "Register"}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Donor Profile Section */}
        {donor ? (
          <motion.div
            className="grid lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Donor Info */}
            <Card className="hover:shadow-md transition rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="text-secondary" size={20} /> Donor Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blood Group:</span>
                  <Badge variant="secondary">{donor.bloodGroup}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Donations:</span>
                  <span className="font-semibold">{donor.totalDonations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credits:</span>
                  <span className="font-semibold text-primary">{donor.credits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={eligibility?.canDonate ? "default" : "destructive"}>
                    {eligibilityLoading
                      ? "Checking..."
                      : eligibility?.canDonate
                      ? "Eligible"
                      : "Not Eligible"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="hover:shadow-md transition rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="text-primary" size={20} /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {donationsLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : donations.length ? (
                  <div className="space-y-4">
                    {donations.slice(0, 3).map((d) => (
                      <div key={d.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Blood Donation</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(d.donationDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">+{d.creditsEarned} credits</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No donations yet</p>
                )}
              </CardContent>
            </Card>

            {/* Community Impact */}
            <Card className="hover:shadow-md transition rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="text-accent" size={20} /> Community Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-center">
                <div>
                  <p className="text-3xl font-bold">{donor.totalDonations}</p>
                  <p className="text-muted-foreground text-sm">Lives Impacted</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">{donor.credits}</p>
                  <p className="text-muted-foreground text-sm">Credits Earned</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card className="p-10 text-center hover:shadow-md transition rounded-xl">
            <Heart size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Complete Your Donor Profile</h3>
            <p className="text-muted-foreground mb-4">
              Register as a donor to start saving lives and earning credits
            </p>
            <Button asChild variant="secondary">
              <Link href="/register-donor">complete registration</Link>
            </Button>
          </Card>
        )}

        {/* Tips & Credit Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition rounded-xl">
            <CardHeader>
              <CardTitle>Donation Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Eat a healthy meal before donating</p>
              <p>• Stay hydrated before and after donation</p>
              <p>• Rest the night before</p>
              <p>• Avoid alcohol 24 hours before</p>
              <p>• Bring a valid ID & eat iron-rich foods</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition rounded-xl">
            <CardHeader>
              <CardTitle>Credit System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Award className="text-secondary" size={16} /> Earn 5 credits per donation
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Heart className="text-accent" size={16} /> Redeem credits for blood requests
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="text-primary" size={16} /> Donate every 6 months
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="text-primary" size={16} /> Verified safe donation cycle
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
