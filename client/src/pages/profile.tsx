import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  User,
  Calendar,
  Award,
  MapPin,
  Phone,
  Edit,
  Save,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { insertDonorSchema } from "@shared/schema";
import { z } from "zod";
import type { Donor, Donation, CreditTransaction } from "@shared/schema";

const updateDonorSchema = insertDonorSchema.partial().omit({ userId: true });
type UpdateDonorData = z.infer<typeof updateDonorSchema>;

export default function Profile() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [animatedCredits, setAnimatedCredits] = useState<number | null>(null);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 600);
    }
  }, [isAuthenticated, isLoading, toast]);

  // ----------- Queries -----------
  const { data: donor, isLoading: donorLoading } = useQuery<Donor>({
    queryKey: ["/api/donors/me"],
    retry: false,
  });

  const { data: donations = [], isLoading: donationsLoading } = useQuery<Donation[]>({
    queryKey: ["/api/donations/me"],
    retry: false,
    enabled: !!donor,
  });

  const { data: creditTransactions = [], isLoading: transactionsLoading } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/credits/transactions"],
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

  // ----------- Form -----------
  const form = useForm<UpdateDonorData>({
    resolver: zodResolver(updateDonorSchema),
    defaultValues: {
      fullName: "",
      age: 18,
      bloodGroup: "",
      weight: 50,
      whatsappNumber: "",
      latitude: 0,
      longitude: 0,
      address: "",
      lastDonationDate: undefined,
    },
  });

  // populate form when donor loads
  useEffect(() => {
    if (donor) {
      form.reset({
        fullName: donor.fullName,
        age: donor.age,
        bloodGroup: donor.bloodGroup,
        weight: parseFloat(donor.weight),
        whatsappNumber: donor.whatsappNumber,
        latitude: parseFloat(donor.latitude),
        longitude: parseFloat(donor.longitude),
        address: donor.address,
        lastDonationDate: donor.lastDonationDate ? new Date(donor.lastDonationDate) : undefined,
      });

      // animate credits
      setAnimatedCredits(0);
      const target = donor.credits ?? 0;
      let start = 0;
      const dur = 700;
      const step = Math.max(1, Math.round(target / (dur / 16)));
      const id = setInterval(() => {
        start += step;
        if (start >= target) {
          start = target;
          clearInterval(id);
        }
        setAnimatedCredits(start);
      }, 16);

      return () => clearInterval(id);
    }
  }, [donor]);

  // ----------- Mutation -----------
  const updateDonorMutation = useMutation({
    mutationFn: async (data: UpdateDonorData) => {
      const response = await apiRequest("PUT", "/api/donors/me", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your profile has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/donors/me"] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please login again.",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 600);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // ----------- Location helper -----------
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation not supported",
        variant: "destructive",
      });
      setIsGettingLocation(false);
      return;
    }

    try {
      if ("permissions" in navigator) {
        const p = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        if (p.state === "denied") {
          toast({
            title: "Error",
            description: "Location permission is blocked. Enable it in browser settings.",
            variant: "destructive",
          });
          setIsGettingLocation(false);
          return;
        }
      }
    } catch {}

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("latitude", position.coords.latitude);
        form.setValue("longitude", position.coords.longitude);

        fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
        )
          .then((r) => r.json())
          .then((data) => {
            if (data.locality && data.principalSubdivision) {
              form.setValue("address", `${data.locality}, ${data.principalSubdivision}, ${data.countryName}`);
            } else {
              form.setValue("address", `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
            }
          })
          .catch(() => {
            form.setValue("address", `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
          })
          .finally(() => setIsGettingLocation(false));

        toast({ title: "Location updated" });
      },
      (err) => {
        setIsGettingLocation(false);
        toast({
          title: "Error",
          description: "Failed to get location. Enter manually.",
          variant: "destructive",
        });
      }
    );
  };

  const onSubmit = (data: UpdateDonorData) => updateDonorMutation.mutate(data);

  const cancelEdit = () => {
    if (donor) {
      form.reset({
        fullName: donor.fullName,
        age: donor.age,
        bloodGroup: donor.bloodGroup,
        weight: parseFloat(donor.weight),
        whatsappNumber: donor.whatsappNumber,
        latitude: parseFloat(donor.latitude),
        longitude: parseFloat(donor.longitude),
        address: donor.address,
        lastDonationDate: donor.lastDonationDate ? new Date(donor.lastDonationDate) : undefined,
      });
    }
    setIsEditing(false);
  };

  // ----------- UI helpers -----------
  const profileCompletion = (() => {
    if (!donor) return 0;
    const fields = [
      donor.fullName,
      donor.age,
      donor.bloodGroup,
      donor.weight,
      donor.whatsappNumber,
      donor.address,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const monthsSinceLastDonation = (() => {
    if (!donor?.lastDonationDate) return null;
    const last = new Date(donor.lastDonationDate);
    const now = new Date();
    const months = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return months;
  })();

  const achievementBadge = (() => {
    const total = donor?.totalDonations ?? 0;
    if (total >= 10) return { label: "Gold Donor", color: "bg-yellow-400 text-black" };
    if (total >= 5) return { label: "Silver Donor", color: "bg-slate-200 text-black" };
    if (total >= 1) return { label: "Bronze Donor", color: "bg-orange-200 text-black" };
    return null;
  })();

  // Loading states
  if (isLoading || donorLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-primary" />
        </div>
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center">
              <Heart className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-xl font-semibold mb-2">No Donor Profile Found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't registered as a donor yet. Create your donor profile to start saving lives.
              </p>
              <Button asChild variant="secondary">
                <Link href="/register-donor">Register as Donor</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ----------- Render -----------
  return (
    <div className="min-h-screen bg-background" data-testid="page-profile">
      <Header />

      {/* Banner */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-50 to-secondary-50 rounded-xl mt-6 p-6 shadow-sm overflow-hidden relative">
          <div className="absolute right-6 top-6 text-muted-foreground select-none">Profile</div>
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-28 h-28 rounded-full border-4 border-secondary/30 flex items-center justify-center text-3xl font-extrabold bg-secondary/10 shadow-md">
              {donor.bloodGroup}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{donor.fullName}</h2>
              <p className="text-sm text-muted-foreground">{donor.age} years • {donor.weight} kg</p>

              <div className="flex items-center gap-3 mt-3">
                {/* Availability badge (pulse when available) */}
                <Badge className={donor.isAvailable ? "animate-pulse bg-green-600 text-white" : ""} data-testid="badge-availability-status">
                  {donor.isAvailable ? "Available" : "Unavailable"}
                </Badge>

                {/* Achievement */}
                {achievementBadge && (
                  <div className={`px-2 py-1 rounded-md text-xs font-semibold ${achievementBadge.color}`}>
                    {achievementBadge.label}
                  </div>
                )}

                {/* Profile completion */}
                <div className="ml-2 text-sm text-muted-foreground">
                  Profile {profileCompletion}% complete
                </div>
              </div>

              {/* Completion bar */}
              <div className="mt-3 max-w-sm">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-secondary transition-all duration-700"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Credits */}
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Credits</div>
              <div className="text-3xl font-bold text-primary" data-testid="text-available-credits">
                {animatedCredits !== null ? animatedCredits : donor.credits}
              </div>
              <div className="text-xs text-muted-foreground mt-1">available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Edit toolbar (floating) */}
        {isEditing && (
          <div className="fixed right-6 bottom-6 z-50 flex items-center gap-3 bg-card border border-border rounded-full p-3 shadow-lg">
            <Button variant="outline" onClick={cancelEdit} data-testid="button-cancel-edit">
              <X size={16} className="mr-2" />
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={updateDonorMutation.isPending} data-testid="button-save-profile">
              <Save size={16} className="mr-2" />
              {updateDonorMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User size={16} className="mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="donations" data-testid="tab-donations">
              <Heart size={16} className="mr-2" />
              Donations
            </TabsTrigger>
            <TabsTrigger value="credits" data-testid="tab-credits">
              <Award size={16} className="mr-2" />
              Credits
            </TabsTrigger>
            <TabsTrigger value="eligibility" data-testid="tab-eligibility">
              <Calendar size={16} className="mr-2" />
              Eligibility
            </TabsTrigger>
          </TabsList>

          {/* PROFILE */}
          <TabsContent value="profile">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Summary card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="text-secondary" size={18} />
                    Donor Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="bg-secondary/10 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 text-xl font-bold">
                      {donor.bloodGroup}
                    </div>
                    <h3 className="font-semibold text-foreground" data-testid="text-donor-name">{donor.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{donor.age} years</p>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Donations</span>
                      <span className="font-semibold" data-testid="text-total-donations-summary">{donor.totalDonations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Credits</span>
                      <span className="font-semibold text-primary" data-testid="text-credits-summary">{donor.credits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={donor.isAvailable ? "default" : "secondary"}>{donor.isAvailable ? "Available" : "Unavailable"}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Details / Edit */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Form {...form}>
                        <form className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl><Input {...field} data-testid="input-edit-full-name" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="age" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Age</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value || "0"))} data-testid="input-edit-age" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="bloodGroup" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Blood Group</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-blood-group"><SelectValue /></SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="A+">A+</SelectItem>
                                    <SelectItem value="A-">A-</SelectItem>
                                    <SelectItem value="B+">B+</SelectItem>
                                    <SelectItem value="B-">B-</SelectItem>
                                    <SelectItem value="AB+">AB+</SelectItem>
                                    <SelectItem value="AB-">AB-</SelectItem>
                                    <SelectItem value="O+">O+</SelectItem>
                                    <SelectItem value="O-">O-</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="weight" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Weight (kg)</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value || "0"))} data-testid="input-edit-weight" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>

                          <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp Number</FormLabel>
                              <FormControl><Input {...field} data-testid="input-edit-whatsapp" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <div className="flex gap-2">
                                <FormControl><Input {...field} className="flex-1" data-testid="input-edit-address" /></FormControl>
                                <Button type="button" variant="outline" onClick={getCurrentLocation} disabled={isGettingLocation} data-testid="button-update-location">
                                  {isGettingLocation ? <div className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full" /> : <MapPin size={16} />}
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </form>
                      </Form>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                            <p className="font-medium" data-testid="text-display-full-name">{donor.fullName}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Age</Label>
                            <p className="font-medium" data-testid="text-display-age">{donor.age} years</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Blood Group</Label>
                            <p className="font-medium" data-testid="text-display-blood-group">{donor.bloodGroup}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Weight</Label>
                            <p className="font-medium" data-testid="text-display-weight">{donor.weight} kg</p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">WhatsApp Number</Label>
                          <div className="flex items-center gap-3">
                            <p className="font-medium" data-testid="text-display-whatsapp">{donor.whatsappNumber}</p>
                            <a href={`https://wa.me/${donor.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="text-secondary" data-testid="link-whatsapp-self">
                              <Phone size={16} />
                            </a>
                            {donor.whatsappNumber && <Badge className="ml-2">Verified</Badge>}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                          <p className="font-medium" data-testid="text-display-address">{donor.address}</p>
                        </div>

                        {donor.lastDonationDate && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Last Donation</Label>
                            <p className="font-medium" data-testid="text-display-last-donation">{new Date(donor.lastDonationDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* DONATIONS */}
          <TabsContent value="donations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="text-secondary" size={18} />
                  Donation History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {donationsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" />
                  </div>
                ) : donations.length > 0 ? (
                  <div className="relative border-l-2 border-muted/30 pl-6 space-y-8" data-testid="donations-list">
                    {donations.map((d) => (
                      <div key={d.id} className="relative">
                        <div className="absolute -left-[10px] top-1 w-4 h-4 rounded-full bg-secondary border-2 border-background" />
                        <p className="font-semibold">{new Date(d.donationDate).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground">{d.hospitalName ?? "Unknown Hospital"}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">{d.unitsGiven} unit(s)</div>
                          <Badge variant="outline">+{d.creditsEarned} credits</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Heart className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <h3 className="text-lg font-semibold">No Donations Yet</h3>
                    <p className="text-muted-foreground" data-testid="text-no-donations-profile">You haven't donated yet. Donate to earn credits and help others.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CREDITS */}
          <TabsContent value="credits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="text-primary" size={18} />
                  Credit Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Available Credits</h3>
                      <p className="text-sm text-muted-foreground">Use these credits when you need blood</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary" data-testid="text-available-credits">{donor.credits}</div>
                      <div className="text-sm text-muted-foreground">credits</div>
                    </div>
                  </div>
                </div>

                {transactionsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" />
                  </div>
                ) : creditTransactions.length > 0 ? (
                  <div className="space-y-4" data-testid="credit-transactions-list">
                    {creditTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${t.transactionType === "earned" ? "bg-secondary/10" : "bg-accent/10"}`}>
                            <Award className={t.transactionType === "earned" ? "text-secondary" : "text-accent"} size={16} />
                          </div>
                          <div>
                            <p className="font-medium">{t.description}</p>
                            <p className="text-sm text-muted-foreground">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Unknown"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${t.transactionType === "earned" ? "text-secondary" : "text-accent"}`}>
                            {t.transactionType === "earned" ? "+" : "-"}{t.amount}
                          </p>
                          <p className="text-sm text-muted-foreground">credits</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Award className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
                    <p className="text-muted-foreground" data-testid="text-no-transactions">Your credits will appear here after donations or redemptions.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ELIGIBILITY */}
          <TabsContent value="eligibility">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="text-accent" size={18} />
                  Donation Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eligibilityLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" />
                  </div>
                ) : eligibility ? (
                  <div className="space-y-6">
                    <div className="text-center p-6 border rounded-lg">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${eligibility.canDonate ? "bg-secondary/10" : "bg-accent/10"}`}>
                        {eligibility.canDonate ? <Heart className="text-secondary" size={28} /> : <Calendar className="text-accent" size={28} />}
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{eligibility.canDonate ? "Eligible to Donate" : "Not Eligible Yet"}</h3>
                      <p className="text-muted-foreground">{eligibility.canDonate ? "You can donate now — thank you!" : (eligibility.nextEligibleDate ? `Next eligible on ${new Date(eligibility.nextEligibleDate).toLocaleDateString()}` : "Please wait before your next donation.")}</p>
                    </div>

                    {/* progress towards next donation */}
                    <div>
                      <p className="font-semibold mb-2">Time since last donation</p>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-3 bg-secondary transition-all"
                          style={{
                            width: monthsSinceLastDonation === null ? "0%" : `${Math.min(100, (monthsSinceLastDonation / 6) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{monthsSinceLastDonation === null ? "No previous donation recorded" : `${monthsSinceLastDonation} month(s) since last donation`}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">Safety Guidelines</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Wait 6 months between donations</li>
                            <li>• Maintain healthy weight (≥50kg)</li>
                            <li>• Be in good health</li>
                            <li>• Age between 18–65 years</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">Before Donating</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Eat a nutritious meal</li>
                            <li>• Stay hydrated</li>
                            <li>• Get adequate rest</li>
                            <li>• Avoid alcohol 24 hours prior</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {donor.lastDonationDate && (
                      <div className="p-4 bg-muted/20 rounded-lg">
                        <h4 className="font-semibold mb-2">Last Donation</h4>
                        <p className="text-sm text-muted-foreground">You last donated on {new Date(donor.lastDonationDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Calendar className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <h3 className="text-lg font-semibold mb-2">Unable to Check Eligibility</h3>
                    <p className="text-muted-foreground">Please try again later or contact support.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
