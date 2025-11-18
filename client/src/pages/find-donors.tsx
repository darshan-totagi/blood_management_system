import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import DonorCard from "@/components/donor-card";
import InteractiveMap from "@/components/map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Search, ArrowLeft, Users } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";
import type { Donor } from "@shared/schema";

const searchFormSchema = z.object({
  bloodGroup: z.string().min(1, "Blood group is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1, "Location is required"),
  radius: z.number().min(1).max(50).default(5),
});

type SearchFormData = z.infer<typeof searchFormSchema>;

export default function FindDonors() {
  const { toast } = useToast();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);

  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      bloodGroup: "",
      latitude: 0,
      longitude: 0,
      address: "",
      radius: 5,
    },
  });

  const { data: donors = [], isLoading: donorsLoading, refetch } = useQuery<Donor[]>({
    queryKey: ["/api/donors/search", searchParams],
    queryFn: async () => {
      if (!searchParams) return [];
      
      const params = new URLSearchParams({
        latitude: searchParams.latitude.toString(),
        longitude: searchParams.longitude.toString(),
        radius: searchParams.radius.toString(),
        bloodGroup: searchParams.bloodGroup,
      });

      const response = await fetch(`/api/donors/search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search donors');
      }
      return response.json();
    },
    enabled: !!searchParams,
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
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        form.setValue("latitude", lat);
        form.setValue("longitude", lon);
        try {
          const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`);
          if (r.ok) {
            const g = await r.json();
            const addr = g.results?.[0]?.formatted_address;
            form.setValue("address", addr || `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
          } else {
            form.setValue("address", `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
          }
        } catch {
          form.setValue("address", `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        } finally {
          setIsGettingLocation(false);
        }
        toast({ title: "Success", description: "Location retrieved successfully" });
      },
      (error) => {
        const code = error && typeof error.code === "number" ? error.code : 0;
        const msg = code === 1
          ? "Location permission denied"
          : code === 2
          ? "Position unavailable"
          : code === 3
          ? "Location request timed out"
          : "Failed to get your location. Please enter manually.";
        toast({ title: "Error", description: msg, variant: "destructive" });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const onSubmit = (data: SearchFormData) => {
    setSearchParams(data);
    toast({
      title: "Searching",
      description: `Looking for ${data.bloodGroup} donors within ${data.radius}km...`,
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const donorsWithDistance = donors.map(donor => ({
    ...donor,
    distance: searchParams ? calculateDistance(
      searchParams.latitude,
      searchParams.longitude,
      parseFloat(donor.latitude),
      parseFloat(donor.longitude)
    ) : 0
  }));

  return (
    <div className="min-h-screen bg-background" data-testid="page-find-donors">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button asChild variant="ghost" data-testid="button-back">
              <Link href="/">
                <ArrowLeft size={16} className="mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Find Blood Donors</h1>
        </div>
        
        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="text-accent" size={20} />
              <span>Search for Donors</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Group Needed</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-blood-group-search">
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
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Location</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input 
                            placeholder="Current location" 
                            {...field} 
                            className="flex-1"
                            data-testid="input-search-location"
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={getCurrentLocation}
                          disabled={isGettingLocation}
                          data-testid="button-get-search-location"
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
                
                <FormField
                  control={form.control}
                  name="radius"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search Radius</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-radius">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5">5 km</SelectItem>
                          <SelectItem value="10">10 km</SelectItem>
                          <SelectItem value="15">15 km</SelectItem>
                          <SelectItem value="25">25 km</SelectItem>
                          <SelectItem value="50">50 km</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-end">
                  <Button 
                    type="submit" 
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={donorsLoading}
                    data-testid="button-search-donors"
                  >
                    {donorsLoading ? "Searching..." : "Search Donors"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Results */}
        {searchParams && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Map Container */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Donors Near You</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div style={{ height: "500px" }}>
                    <InteractiveMap 
                      center={[searchParams.latitude, searchParams.longitude]}
                      donors={donorsWithDistance}
                      onDonorSelect={setSelectedDonor}
                      selectedDonor={selectedDonor}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Donor List */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="text-secondary" size={20} />
                <h4 className="font-semibold text-foreground">
                  Available Donors ({donorsWithDistance.length} found)
                </h4>
              </div>
              
              {donorsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
                </div>
              ) : donorsWithDistance.length > 0 ? (
                <div className="space-y-4" data-testid="donor-list">
                  {donorsWithDistance.map((donor) => (
                    <DonorCard 
                      key={donor.id} 
                      donor={donor} 
                      distance={donor.distance}
                      isSelected={selectedDonor?.id === donor.id}
                      onSelect={() => setSelectedDonor(donor)}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <h3 className="text-lg font-semibold mb-2">No Donors Found</h3>
                    <p className="text-muted-foreground" data-testid="text-no-donors">
                      No {searchParams.bloodGroup} donors found within {searchParams.radius}km of your location.
                      Try expanding your search radius or checking a different blood group.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
        
        {/* Initial State */}
        {!searchParams && (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="mx-auto mb-4 text-muted-foreground" size={64} />
              <h3 className="text-2xl font-semibold mb-4">Find Blood Donors Near You</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Enter your location and blood group requirements above to find available donors in your area. 
                Our system will show you donors within your specified radius who match your criteria.
              </p>
              <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="text-primary" size={16} />
                  <span>Location-based search</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="text-secondary" size={16} />
                  <span>Real-time availability</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="text-accent" size={16} />
                  <span>Instant WhatsApp contact</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
