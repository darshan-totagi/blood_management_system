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
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Heart, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { insertDonorSchema } from "@shared/schema";
import { z } from "zod";
import type { Donor } from "@shared/schema";

const donorFormSchema = insertDonorSchema.omit({
  id: true,
  credits: true,
  totalDonations: true,
  createdAt: true,
  updatedAt: true,
  userId: true, // Omit userId as it will be added from the session
}).extend({
  lastDonationDate: z.date().optional().nullable(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  })
});

type DonorFormData = z.infer<typeof donorFormSchema>;

export default function DonorRegistration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth(); // Add user here
  const queryClient = useQueryClient();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Show message if not authenticated (no auto-login)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please sign in to continue.",
        variant: "destructive",
      });
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Check if user is already a donor
  const { data: existingDonor, isLoading: donorLoading } = useQuery<Donor>({
    queryKey: ["/api/donors/me"],
    retry: false,
  });

  const form = useForm<DonorFormData>({
    resolver: zodResolver(donorFormSchema),
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
      termsAccepted: false,
    },
  });

  const createDonorMutation = useMutation({
    mutationFn: async (data: Omit<DonorFormData, 'termsAccepted'>) => {
      console.log("Submitting form data:", data);
      try {
        const response = await apiRequest('POST', '/api/donors', data);
        console.log("API response:", response);
        return await response.json();
      } catch (error) {
        console.error("API request error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your donor profile has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/donors/me"] });
      setLocation("/");
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please sign in to continue.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create donor profile",
        variant: "destructive",
      });
    },
  });

  const getCurrentLocation = async () => {
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

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        form.setValue("latitude", lat);
        form.setValue("longitude", lon);
        
        try {
          let address: string | null = null;
          if (apiKey) {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}&language=en`);
            if (response.ok) {
              const data = await response.json();
              address = data.results?.[0]?.formatted_address || null;
            }
          }
          if (!address) {
            const osm = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&namedetails=1&accept-language=en`);
            if (osm.ok) {
              const j = await osm.json();
              const a = j.address || {};
              address = (j.namedetails && j.namedetails['name:en']) || j.display_name || [a.road, a.neighbourhood, a.city || a.town || a.village, a.state, a.country].filter(Boolean).join(', ') || null;
            }
          }
          form.setValue("address", address || `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        } catch {
          form.setValue("address", `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        } finally {
          setIsGettingLocation(false);
        }

        toast({
          title: "Success",
          description: "Location retrieved successfully",
        });
      },
      (error) => {
        toast({
          title: "Error",
          description: "Failed to get your location. Please enter manually.",
          variant: "destructive",
        });
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const onSubmit = (data: DonorFormData) => {
    console.log("Form submitted with data:", data);
    // Add form validation check
    const formState = form.getValues();
    console.log("Form state:", formState);
    console.log("Form errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    
    try {
      const { termsAccepted, ...donorData } = data;
      
      // Create a proper Date object from the string date
      const processedData = {
        ...donorData,
        // Force the date to be a proper Date object, not a string
        lastDonationDate: donorData.lastDonationDate ? new Date(donorData.lastDonationDate) : null,
        userId: user?.id || 'local-dev-user' // Use the authenticated user ID or fallback to dev user
      };
      
      console.log("Donor data being sent to API:", processedData);
      
      // Create a new object with the date properly formatted for the API
      const apiData = {
        ...processedData,
        // Ensure lastDonationDate is sent as a Date object, not serialized to string
        lastDonationDate: processedData.lastDonationDate
      };
      
      createDonorMutation.mutate(apiData);
    } catch (error) {
      console.error("Error in form submission:", error);
      toast({
        title: "Form Submission Error",
        description: "There was an error submitting the form. Please try again.",
        variant: "destructive",
      });
    }
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

  // If user is already a donor, redirect to profile
  if (existingDonor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="mx-auto mb-4 text-secondary" size={48} />
              <h3 className="text-xl font-semibold mb-2">You're Already Registered!</h3>
              <p className="text-muted-foreground mb-4">
                You already have a donor profile. You can view and update it in your profile page.
              </p>
              <div className="space-x-4">
                <Button asChild variant="secondary" data-testid="button-view-profile">
                  <Link href="/profile">View Profile</Link>
                </Button>
                <Button asChild variant="outline" data-testid="button-go-home">
                  <Link href="/">Go to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-donor-registration">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button asChild variant="ghost" data-testid="button-back">
            <Link href="/">
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="text-secondary" size={24} />
              <span>Donor Registration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} data-testid="input-full-name" />
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
                            placeholder="25" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-age"
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
                            <SelectTrigger data-testid="select-blood-group">
                              <SelectValue placeholder="Select Blood Group" />
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
                            placeholder="70" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-weight"
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
                        <Input placeholder="+1 234 567 8900" {...field} data-testid="input-whatsapp" />
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
                      <FormLabel>Current Location</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input 
                            placeholder="Enter your address" 
                            {...field} 
                            className="flex-1"
                            data-testid="input-address"
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={getCurrentLocation}
                          disabled={isGettingLocation}
                          data-testid="button-get-location"
                        >
                          {isGettingLocation ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          ) : (
                            <MapPin size={16} />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        We'll use your location to match you with nearby blood requests
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastDonationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Donation Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          data-testid="input-last-donation-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="termsAccepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-terms"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm">
                          I agree to the terms and conditions and confirm that I am medically eligible to donate blood
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  disabled={createDonorMutation.isPending}
                  data-testid="button-submit"
                  onClick={() => {
                    console.log("Submit button clicked");
                    console.log("Form state:", form.getValues());
                    console.log("Form is valid:", form.formState.isValid);
                    if (!form.formState.isValid) {
                      console.log("Form validation errors:", form.formState.errors);
                    }
                  }}
                >
                  {createDonorMutation.isPending ? "Creating Profile..." : "Complete Registration"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
  // Add this right before the return statement in the component
  console.log("Form state:", {
    isValid: form.formState.isValid,
    errors: form.formState.errors,
    isDirty: form.formState.isDirty,
    isSubmitting: form.formState.isSubmitting,
    isSubmitted: form.formState.isSubmitted,
  });
}
