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
import { Heart, Users, Calendar, Award, Plus, Search } from "lucide-react";
import type { Donor, Donation, CreditTransaction } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
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

  const { data: eligibility, isLoading: eligibilityLoading } = useQuery<{
    canDonate: boolean;
    nextEligibleDate?: string;
  }>({
    queryKey: ["/api/donors/eligibility"],
    retry: false,
    enabled: !!donor,
  });

  if (isLoading || donorLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-home">
      <Header />
      
      {/* Resume Donor Registration Banner */}
{!donor && (
  <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-xl flex items-center justify-between mt-6 backdrop-blur-sm shadow-sm">
    <div>
      <h3 className="font-semibold text-lg flex items-center gap-2">
        🩸 Complete Your Donor Profile
      </h3>
      <p className="text-sm text-primary/80 -mt-1">
        Unlock credits, increase visibility & help save lives.
      </p>
    </div>

    <Button asChild variant="secondary" className="font-semibold">
      <Link href="/register-donor">Resume</Link>
    </Button>
  </div>
)}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to PulseConnect</h1>
          <p className="text-muted-foreground">Your dashboard for blood donation and community connections</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="bg-secondary/10 p-3 rounded-full">
                  <Heart className="text-secondary" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Become a Donor</h3>
                  <p className="text-sm text-muted-foreground">Register to help save lives</p>
                </div>
                <Button asChild variant="secondary" data-testid="button-register-donor">
                  <Link href="/register-donor">
                    <Plus size={16} className="mr-2" />
                    Register
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="bg-accent/10 p-3 rounded-full">
                  <Search className="text-accent" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Find Donors</h3>
                  <p className="text-sm text-muted-foreground">Search for blood donors nearby</p>
                </div>
                <Button asChild variant="outline" data-testid="button-find-donors">
                  <Link href="/find-donors">
                    <Search size={16} className="mr-2" />
                    Search
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donor Profile Section */}
        {donor ? (
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Donor Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="text-secondary" size={20} />
                  <span>Donor Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blood Group:</span>
                    <Badge variant="secondary" data-testid="text-blood-group">{donor.bloodGroup}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Donations:</span>
                    <span className="font-semibold" data-testid="text-total-donations">{donor.totalDonations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credits:</span>
                    <span className="font-semibold text-primary" data-testid="text-credits">{donor.credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={eligibility?.canDonate ? "default" : "destructive"}>
                      {eligibilityLoading ? "Checking..." : eligibility?.canDonate ? "Eligible" : "Not Eligible"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="text-primary" size={20} />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {donationsLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : donations.length > 0 ? (
                  <div className="space-y-3">
                    {donations.slice(0, 3).map((donation) => (
                      <div key={donation.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Blood Donation</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(donation.donationDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">+{donation.creditsEarned} credits</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground" data-testid="text-no-donations">No donations yet</p>
                )}
              </CardContent>
            </Card>

            {/* Community Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="text-accent" size={20} />
                  <span>Community Impact</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{donor.totalDonations}</p>
                    <p className="text-sm text-muted-foreground">Lives Potentially Saved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{donor.credits}</p>
                    <p className="text-sm text-muted-foreground">Credits Earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* No Donor Profile */
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <Heart className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-xl font-semibold mb-2">Complete Your Donor Profile</h3>
              <p className="text-muted-foreground mb-4">
                Register as a donor to start saving lives and earning credits
              </p>
              <Button asChild variant="secondary" data-testid="button-complete-registration">
                <Link href="/register-donor">Complete Registration</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tips and Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Donation Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Eat a healthy meal before donating</li>
                <li>• Stay hydrated before and after donation</li>
                <li>• Get plenty of rest the night before</li>
                <li>• Avoid alcohol 24 hours before donation</li>
                <li>• Bring a valid ID and eat iron-rich foods</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credit System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Award className="text-secondary" size={16} />
                  <span className="text-sm">Earn 5 credits per donation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="text-accent" size={16} />
                  <span className="text-sm">Use credits for free blood requests</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="text-primary" size={16} />
                  <span className="text-sm">Donate every 6 months for safety</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
