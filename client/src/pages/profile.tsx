import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Heart, User, Calendar, Award, MapPin, Phone, Edit, Save, X } from "lucide-react";
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

  // Populate form when donor data is loaded
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
    }
  }, [donor, form]);

  const updateDonorMutation = useMutation({
    mutationFn: async (data: UpdateDonorData) => {
      const response = await apiRequest('PUT', '/api/donors/me', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/donors/me"] });
      setIsEditing(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
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
        
        // Reverse geocoding to get address
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`)
          .then(response => response.json())
          .then(data => {
            if (data.locality && data.principalSubdivision) {
              form.setValue("address", `${data.locality}, ${data.principalSubdivision}, ${data.countryName}`);
            }
          })
          .catch(() => {
            form.setValue("address", `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
          })
          .finally(() => setIsGettingLocation(false));

        toast({
          title: "Success",
          description: "Location updated successfully",
        });
      },
      (error) => {
        toast({
          title: "Error",
          description: "Failed to get your location. Please enter manually.",
          variant: "destructive",
        });
        setIsGettingLocation(false);
      }
    );
  };

  const onSubmit = (data: UpdateDonorData) => {
    updateDonorMutation.mutate(data);
  };

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

  if (!donor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-xl font-semibold mb-2">No Donor Profile Found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't registered as a donor yet. Create your donor profile to start saving lives.
              </p>
              <Button asChild variant="secondary" data-testid="button-register-donor">
                <Link href="/register-donor">Register as Donor</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-profile">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your donor information and view activity</p>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <Button 
                onClick={() => setIsEditing(true)} 
                variant="outline"
                data-testid="button-edit-profile"
              >
                <Edit size={16} className="mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  onClick={cancelEdit} 
                  variant="outline"
                  data-testid="button-cancel-edit"
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={updateDonorMutation.isPending}
                  data-testid="button-save-profile"
                >
                  <Save size={16} className="mr-2" />
                  {updateDonorMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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

          <TabsContent value="profile">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Profile Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="text-secondary" size={20} />
                    <span>Donor Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-secondary font-bold text-xl" data-testid="text-blood-group-display">
                          {donor.bloodGroup}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground" data-testid="text-donor-name">
                        {donor.fullName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{donor.age} years old</p>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Donations:</span>
                        <span className="font-semibold" data-testid="text-total-donations-summary">
                          {donor.totalDonations}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credits Available:</span>
                        <span className="font-semibold text-primary" data-testid="text-credits-summary">
                          {donor.credits}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge 
                          variant={donor.isAvailable ? "default" : "secondary"}
                          data-testid="badge-availability-status"
                        >
                          {donor.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Details */}
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
                            <FormField
                              control={form.control}
                              name="fullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Full Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid="input-edit-full-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="age"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Age</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      data-testid="input-edit-age"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="bloodGroup"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Blood Group</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-edit-blood-group">
                                        <SelectValue />
                                      </SelectTrigger>
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
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="weight"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Weight (kg)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                      data-testid="input-edit-weight"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="whatsappNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>WhatsApp Number</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-edit-whatsapp" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address</FormLabel>
                                <div className="flex space-x-2">
                                  <FormControl>
                                    <Input {...field} className="flex-1" data-testid="input-edit-address" />
                                  </FormControl>
                                  <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={getCurrentLocation}
                                    disabled={isGettingLocation}
                                    data-testid="button-update-location"
                                  >
                                    {isGettingLocation ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                    ) : (
                                      <MapPin size={16} />
                                    )}
                                  </Button>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
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
                          <div className="flex items-center space-x-2">
                            <p className="font-medium" data-testid="text-display-whatsapp">{donor.whatsappNumber}</p>
                            <a 
                              href={`https://wa.me/${donor.whatsappNumber}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-secondary hover:text-secondary/80"
                              data-testid="link-whatsapp-self"
                            >
                              <Phone size={16} />
                            </a>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                          <p className="font-medium" data-testid="text-display-address">{donor.address}</p>
                        </div>

                        {donor.lastDonationDate && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Last Donation</Label>
                            <p className="font-medium" data-testid="text-display-last-donation">
                              {new Date(donor.lastDonationDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="donations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="text-secondary" size={20} />
                  <span>Donation History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {donationsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : donations.length > 0 ? (
                  <div className="space-y-4" data-testid="donations-list">
                    {donations.map((donation) => (
                      <div key={donation.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="bg-secondary/10 p-2 rounded-full">
                            <Heart className="text-secondary" size={16} />
                          </div>
                          <div>
                            <p className="font-medium">Blood Donation</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(donation.donationDate).toLocaleDateString()}
                            </p>
                            {donation.hospitalName && (
                              <p className="text-sm text-muted-foreground">{donation.hospitalName}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">+{donation.creditsEarned} credits</Badge>
                          <p className="text-sm text-muted-foreground mt-1">{donation.unitsGiven} unit(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Heart className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <h3 className="text-lg font-semibold mb-2">No Donations Yet</h3>
                    <p className="text-muted-foreground" data-testid="text-no-donations-profile">
                      You haven't made any donations yet. Start saving lives today!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="text-primary" size={20} />
                  <span>Credit Transactions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Available Credits</h3>
                      <p className="text-sm text-muted-foreground">Use credits for free blood requests</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary" data-testid="text-available-credits">
                        {donor.credits}
                      </p>
                      <p className="text-sm text-muted-foreground">credits</p>
                    </div>
                  </div>
                </div>

                {transactionsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : creditTransactions.length > 0 ? (
                  <div className="space-y-4" data-testid="credit-transactions-list">
                    {creditTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${
                            transaction.transactionType === 'earned' 
                              ? 'bg-secondary/10' 
                              : 'bg-accent/10'
                          }`}>
                            {transaction.transactionType === 'earned' ? (
                              <Award className="text-secondary" size={16} />
                            ) : (
                              <Heart className="text-accent" size={16} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'Unknown date'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            transaction.transactionType === 'earned' 
                              ? 'text-secondary' 
                              : 'text-accent'
                          }`}>
                            {transaction.transactionType === 'earned' ? '+' : '-'}{transaction.amount}
                          </p>
                          <p className="text-sm text-muted-foreground">credits</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Award className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                    <p className="text-muted-foreground" data-testid="text-no-transactions">
                      Start donating blood to earn your first credits!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="eligibility">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="text-accent" size={20} />
                  <span>Donation Eligibility</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eligibilityLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : eligibility ? (
                  <div className="space-y-6">
                    <div className="text-center p-6 border rounded-lg">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        eligibility.canDonate 
                          ? 'bg-secondary/10' 
                          : 'bg-accent/10'
                      }`}>
                        {eligibility.canDonate ? (
                          <Heart className="text-secondary" size={32} />
                        ) : (
                          <Calendar className="text-accent" size={32} />
                        )}
                      </div>
                      <h3 className="text-xl font-semibold mb-2">
                        {eligibility.canDonate ? "Eligible to Donate" : "Not Eligible Yet"}
                      </h3>
                      <p className="text-muted-foreground">
                        {eligibility.canDonate 
                          ? "You can donate blood now. Thank you for your willingness to help!"
                          : eligibility.nextEligibleDate 
                            ? `You can donate again after ${new Date(eligibility.nextEligibleDate).toLocaleDateString()}`
                            : "Please wait before your next donation."
                        }
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">Safety Guidelines</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Wait 6 months between donations</li>
                            <li>• Maintain healthy weight (≥50kg)</li>
                            <li>• Be in good health</li>
                            <li>• Age between 18-65 years</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">Before Donating</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Eat a healthy meal</li>
                            <li>• Stay well hydrated</li>
                            <li>• Get adequate sleep</li>
                            <li>• Avoid alcohol 24hrs prior</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {donor.lastDonationDate && (
                      <div className="p-4 bg-muted/20 rounded-lg">
                        <h4 className="font-semibold mb-2">Last Donation</h4>
                        <p className="text-sm text-muted-foreground">
                          You last donated on {new Date(donor.lastDonationDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Calendar className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <h3 className="text-lg font-semibold mb-2">Unable to Check Eligibility</h3>
                    <p className="text-muted-foreground">
                      Please try again later or contact support.
                    </p>
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