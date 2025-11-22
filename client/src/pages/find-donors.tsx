import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import DonorCard from "@/components/donor-card";
import InteractiveMap from "@/components/map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  const queryClient = useQueryClient();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [liveWatchId, setLiveWatchId] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const verifyForm = useForm<{ requestId: string; donationDate: string; unitsGiven: number; hospitalName?: string; notes?: string }>({
    defaultValues: { requestId: "", donationDate: new Date().toISOString().slice(0,10), unitsGiven: 1, hospitalName: "", notes: "" },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (vals: { bloodGroup: string; urgency: "low" | "medium" | "high" | "critical"; address: string; contactNumber: string; hospitalName?: string; notes?: string; radius: number }) => {
      if (!searchParams) throw new Error("Search to set location first");
      const response = await fetch(`/api/blood-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloodGroup: vals.bloodGroup,
          urgency: vals.urgency,
          latitude: searchParams.latitude,
          longitude: searchParams.longitude,
          address: vals.address,
          contactNumber: vals.contactNumber.replace(/[^\d]/g, ""),
          hospitalName: vals.hospitalName,
          notes: vals.notes,
          radiusKm: vals.radius,
        }),
      });
      if (!response.ok) throw new Error("Failed to create request");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Request created", description: "You can now verify donations against it." });
      queryClient.invalidateQueries({ queryKey: ["/api/blood-requests/me"] });
      setIsCreateOpen(false);
      setIsVerifyOpen(true);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Request creation failed", variant: "destructive" }),
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createForm = useForm<{ bloodGroup: string; urgency: "low" | "medium" | "high" | "critical"; address: string; contactNumber: string; hospitalName?: string; notes?: string; radius: number }>({
    defaultValues: { bloodGroup: "", urgency: "high", address: "", contactNumber: "", hospitalName: "", notes: "", radius: 5 },
  });

  useEffect(() => {
    if (searchParams) {
      createForm.reset({
        bloodGroup: searchParams.bloodGroup,
        address: searchParams.address,
        contactNumber: "",
        hospitalName: "",
        notes: "",
        radius: searchParams.radius,
      });
    }
  }, [searchParams]);

  const { data: myRequests = [] } = useQuery<{ id: string; bloodGroup: string; hospitalName?: string; status: string }[]>({
    queryKey: ["/api/blood-requests/me"],
    retry: false,
  });

  const verifyMutation = useMutation({
    mutationFn: async (vals: { requestId: string; donationDate: string; unitsGiven: number; hospitalName?: string; notes?: string }) => {
      if (!selectedDonor) throw new Error("Select a donor to verify");
      const response = await fetch(`/api/requests/${vals.requestId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorId: selectedDonor.id,
          donationDate: vals.donationDate,
          unitsGiven: vals.unitsGiven,
          hospitalName: vals.hospitalName,
          notes: vals.notes,
          bloodGroup: selectedDonor.bloodGroup,
        }),
      });
      if (!response.ok) throw new Error("Failed to verify donation");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Verified", description: "Donation verified. Thank you!" });
      setIsVerifyOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Verification failed", variant: "destructive" }),
  });
  useEffect(() => {
    return () => {
      if (liveWatchId !== null) navigator.geolocation.clearWatch(liveWatchId);
    };
  }, [liveWatchId]);

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
      }
    );
  };

  const toggleLiveLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation not supported", variant: "destructive" });
      return;
    }
    if (liveWatchId !== null) {
      navigator.geolocation.clearWatch(liveWatchId);
      setLiveWatchId(null);
      setIsLive(false);
      return;
    }
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        form.setValue("latitude", lat);
        form.setValue("longitude", lon);
        try {
          let addr: string | null = null;
          if (apiKey) {
            const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}&language=en`);
            if (r.ok) {
              const g = await r.json();
              addr = g.results?.[0]?.formatted_address || null;
            }
          }
          if (!addr) {
            const osm = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&namedetails=1&accept-language=en`);
            if (osm.ok) {
              const j = await osm.json();
              const a = j.address || {};
              addr = (j.namedetails && j.namedetails['name:en']) || j.display_name || [a.road, a.neighbourhood, a.city || a.town || a.village, a.state, a.country].filter(Boolean).join(', ') || null;
            }
          }
          form.setValue("address", addr || `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        } catch {}
        setSearchParams(form.getValues());
      },
      () => {
        toast({ title: "Error", description: "Failed to get live location", variant: "destructive" });
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    setLiveWatchId(id);
    setIsLive(true);
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
                        <Button
                          type="button"
                          variant={isLive ? "default" : "outline"}
                          onClick={toggleLiveLocation}
                          data-testid="button-live-location"
                        >
                          {isLive ? "Live" : "Go Live"}
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="text-secondary" size={20} />
                  <h4 className="font-semibold text-foreground">
                    Available Donors ({donorsWithDistance.length} found)
                  </h4>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!selectedDonor) {
                        toast({ title: "Select a donor", description: "Pick a donor from the list to verify.", variant: "destructive" });
                        return;
                      }
                      const hasActive = myRequests.some(r => r.status === "active");
                      if (!hasActive) {
                        toast({ title: "No active requests", description: "Create an active blood request first.", variant: "destructive" });
                        return;
                      }
                      setIsVerifyOpen(true);
                    }}
                  >
                    Verify Donation
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>Create Request</Button>
                </div>
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
        <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Verify Donation</DialogTitle>
            </DialogHeader>
            <Form {...verifyForm}>
              <form className="space-y-4" onSubmit={verifyForm.handleSubmit((vals) => verifyMutation.mutate(vals))}>
                <FormField control={verifyForm.control} name="requestId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Your Request</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a request" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {myRequests.filter(r => r.status === "active").map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.bloodGroup} • {r.hospitalName || "Unknown hospital"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={verifyForm.control} name="donationDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donation Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={verifyForm.control} name="unitsGiven" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Units Given</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={verifyForm.control} name="hospitalName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hospital Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={verifyForm.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsVerifyOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={verifyMutation.isPending}>{verifyMutation.isPending ? "Verifying..." : "Verify"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Blood Request</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form className="space-y-4" onSubmit={createForm.handleSubmit((vals) => createRequestMutation.mutate(vals))}>
                <FormField control={createForm.control} name="bloodGroup" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Group</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="urgency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select urgency" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['low','medium','high','critical'].map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="contactNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="hospitalName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hospital Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="radius" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Radius (km)</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createRequestMutation.isPending}>{createRequestMutation.isPending ? "Creating..." : "Create"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 
