import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Shield,
} from "lucide-react";

import { motion } from "framer-motion";
import type { Donor, Donation } from "@shared/schema";

/* -------------------------------------------------------------------------- */
/*                                 ANIMATIONS                                 */
/* -------------------------------------------------------------------------- */

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const subtleFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  // Show message if not authenticated (no auto-login)
  // Redirect on logout
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Redirecting you to login…",
        variant: "destructive",
      });
      setTimeout(() => (window.location.href = "/api/login"), 800);
    }
  }, [isAuthenticated, isLoading, toast]);

  /* -------------------------------------------------------------------------- */
  /*                                   QUERIES                                  */
  /* -------------------------------------------------------------------------- */

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
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40 flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              <Heart className="h-6 w-6 text-primary absolute inset-0 m-auto" />
            </div>
            <p className="text-primary text-lg font-semibold tracking-wide">
              Preparing your dashboard…
            </p>
            <p className="text-xs text-muted-foreground">
              Fetching your donor profile and activity
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                               MAIN DASHBOARD                               */
  /* -------------------------------------------------------------------------- */

  // NEW: Fetch active requests (for donors to respond)
  const { data: activeRequests = [] } = useQuery<BloodRequest[]>({
    queryKey: ["/api/blood-requests"],
    retry: false,
    enabled: !!donor,
  });

  // NEW: Donor respond mutation
  const respondMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "accepted" | "rejected" }) => {
      const r = await fetch(`/api/blood-requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Failed to submit response");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Response submitted", description: "Thanks for your decision." });
      queryClient.invalidateQueries({ queryKey: ["/api/blood-requests"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Failed to respond", variant: "destructive" });
    },
  });

  // NEW: Poll for responses to my requests and toast when new
  const { data: myResponses = [] } = useQuery<RequestResponse[]>({
    queryKey: ["/api/blood-requests/responses/me"],
    refetchInterval: 5000,
    retry: false,
  });

  useEffect(() => {
    // Simple in-memory dedup across reloads; could persist if needed
    const seenKey = "__seen_response_ids__";
    const seen = new Set<string>(JSON.parse(sessionStorage.getItem(seenKey) || "[]"));
    myResponses.forEach((resp) => {
      if (!seen.has(resp.id)) {
        toast({
          title: `Donor ${resp.status === "accepted" ? "accepted" : "rejected"}`,
          description: resp.status === "accepted"
            ? "A donor accepted your blood request."
            : "A donor declined your blood request.",
        });
        seen.add(resp.id);
      }
    });
    sessionStorage.setItem(seenKey, JSON.stringify([...seen]));
  }, [myResponses, toast]);

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
    <div
      className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40"
      data-testid="page-home"
    >
      {/* Soft background accent blur */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60">
        <div className="absolute -top-24 -right-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <Header />

      <motion.main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10"
        initial="hidden"
        animate="visible"
        variants={subtleFade}
      >
        {/* Resume Donor Registration Banner */}
        {!donor && (
          <motion.div
            variants={fadeInUp}
            className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 text-primary px-5 py-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm backdrop-blur-md"
          >
            <div className="space-y-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> Complete Your Donor Profile
              </h3>
              <p className="text-sm text-primary/70">
                Unlock credits, boost your visibility, and help your local community.
              </p>
            </div>

            <Button asChild variant="secondary" className="font-semibold px-5">
              <Link href="/register-donor">Resume</Link>
            </Button>
          </motion.div>
        )}

        {/* Welcome Section */}
        <motion.section
          className="flex flex-col gap-2"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] flex items-center gap-2">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            {greeting}, {donor?.name ?? "donor"}
          </p>

          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary via-secondary to-primary/80 text-transparent bg-clip-text tracking-tight">
            Welcome to PulseConnect
          </h1>

          <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
            Track your donations, manage your credits, and see the impact you&apos;re
            making in your community.
          </p>
        </motion.section>

        {/* Quick Actions */}
        <motion.section
          className="grid md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {[
            {
              title: "Become a Donor",
              desc: "Register now and be the reason someone gets a second chance.",
              icon: <Heart className="text-secondary" size={24} />,
              link: "/register-donor",
              variant: "secondary",
              iconColor: "bg-secondary/15",
              chip: "Start giving",
            },
            {
              title: "Find Donors",
              desc: "Search verified donors nearby whenever there is an emergency.",
              icon: <Search className="text-accent" size={24} />,
              link: "/find-donors",
              variant: "outline",
              iconColor: "bg-accent/10",
              chip: "Emergency ready",
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              variants={fadeInUp}
              className="group"
            >
              <Card className="relative overflow-hidden border border-border/60 bg-card/80 backdrop-blur-md transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl">
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-primary/5 via-transparent to-secondary/10 transition-opacity" />
                <CardContent className="relative p-6 flex items-center gap-4">
                  <div
                    className={`${item.iconColor} p-3 rounded-2xl inline-flex items-center justify-center`}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {item.chip}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-snug">
                      {item.desc}
                    </p>
                  </div>

                  <Button
                    asChild
                    variant={item.variant as any}
                    className="whitespace-nowrap"
                  >
                    <Link href={item.link}>
                      {item.title === "Find Donors" ? "Search" : "Register"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.section>

        {/* Donor Profile / Empty State */}
        {donor ? (
          <motion.section
            className="grid lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Donor Info */}
            <motion.div variants={fadeInUp}>
              <Card className="hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <Heart className="text-secondary" size={20} />
                      <span>Donor Profile</span>
                    </span>
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Verified
                      </span>
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Blood Group</span>
                    <Badge variant="secondary" className="font-semibold">
                      {donor.bloodGroup}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Donations</span>
                    <span className="font-semibold">{donor.totalDonations}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Credits</span>
                    <span className="font-semibold text-primary">
                      {donor.credits}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant={eligibility?.canDonate ? "default" : "destructive"}
                      className="font-medium"
                    >
                      {eligibilityLoading
                        ? "Checking..."
                        : eligibility?.canDonate
                        ? "Eligible to donate"
                        : "Not eligible yet"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={fadeInUp}>
              <Card className="hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="text-primary" size={20} /> Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {donationsLoading ? (
                    <p className="text-muted-foreground">Loading your activity…</p>
                  ) : donations.length ? (
                    <div className="space-y-3">
                      {donations.slice(0, 3).map((d) => (
                        <div
                          key={d.id}
                          className="flex justify-between items-center rounded-xl border border-border/60 px-3 py-2.5 bg-background/60"
                        >
                          <div>
                            <p className="font-medium text-sm">Blood Donation</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(d.donationDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs font-semibold">
                            +{d.creditsEarned} credits
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No donations recorded yet. Your first donation could save a life.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Community Impact */}
            <motion.div variants={fadeInUp}>
              <Card className="hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="text-accent" size={20} /> Community Impact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center text-sm">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Lives touched
                    </p>
                    <p className="text-3xl font-bold">
                      {donor.totalDonations || 0}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Every donation counts towards someone&apos;s story.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Credits earned
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {donor.credits || 0}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Use credits for blood requests when you or your family need help.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.section>
        ) : (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <Card className="p-10 text-center hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md">
              <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Heart size={32} className="text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Become a PulseConnect Donor</h3>
              <p className="text-muted-foreground mb-5 max-w-md mx-auto text-sm">
                Create your donor profile, start donating, and earn credits you can use
                for future blood requests for yourself or your loved ones.
              </p>
              <Button asChild variant="secondary" className="px-6">
                <Link href="/register-donor">
                  <Plus className="h-4 w-4 mr-2" />
                  Complete registration
                </Link>
              </Button>
            </Card>
          </motion.section>
        )}

        {/* Tips & Credit Info */}
        <motion.section
          className="grid md:grid-cols-2 gap-6"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <Card className="hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  Donation Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Eat a healthy, balanced meal before donating.</p>
                <p>• Stay hydrated before and after your donation.</p>
                <p>• Get a good night&apos;s rest the day before.</p>
                <p>• Avoid alcohol 24 hours prior to donating.</p>
                <p>• Carry a valid ID and prefer iron-rich foods regularly.</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4 text-secondary" />
                  Credit System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Award className="text-secondary" size={16} />
                  <span>Earn 5 credits for each successful donation.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="text-accent" size={16} />
                  <span>Redeem credits towards verified blood requests.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="text-primary" size={16} />
                  <span>We recommend waiting at least 6 months between donations.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="text-primary" size={16} />
                  <span>PulseConnect follows a safe, verified donation cycle.</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.section>
      </motion.main>
    </div>
  );
}
