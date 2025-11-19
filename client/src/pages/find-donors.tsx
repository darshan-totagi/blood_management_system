/*  -------------------------------------------
 *  FIND DONORS — Enhanced Version
 *  ------------------------------------------- 
*/

import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";

import Header from "@/components/header";
import DonorCard from "@/components/donor-card";
import InteractiveMap from "@/components/map";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  MapPin,
  Search,
  Users,
  ArrowLeft,
} from "lucide-react";

import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

import type { Donor } from "@shared/schema";


// ---------------- Schema ----------------
const searchFormSchema = z.object({
  bloodGroup: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1),
  radius: z.number().min(1).max(50).default(5),
});

type SearchFormData = z.infer<typeof searchFormSchema>;


// ---------------- Component ----------------
export default function FindDonors() {
  const { toast } = useToast();

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

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

  // ---------------- Get Donors ----------------
  const { data: donors = [], isLoading } = useQuery<Donor[]>({
    queryKey: ["search-donors", searchParams],
    queryFn: async () => {
      if (!searchParams) return [];

      const params = new URLSearchParams({
        latitude: searchParams.latitude.toString(),
        longitude: searchParams.longitude.toString(),
        radius: searchParams.radius.toString(),
        bloodGroup: searchParams.bloodGroup,
      });

      const res = await fetch(`/api/donors/search?${params}`);
      if (!res.ok) throw new Error("Failed to fetch donors");
      return res.json();
    },
    enabled: !!searchParams,
  });

  // -------------- Auto-Scroll to List --------------
  useEffect(() => {
    if (selectedDonor && listRef.current) {
      listRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedDonor]);

  // ---------------- Distance Helper ----------------
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // ---------------- Add Distance ----------------
  const donorsWithDistance = useMemo(
    () =>
      donors.map((d) => ({
        ...d,
        distance: searchParams
          ? calculateDistance(
              searchParams.latitude,
              searchParams.longitude,
              +d.latitude,
              +d.longitude
            )
          : 0,
      })),
    [donors, searchParams]
  );

  // ---------------- Auto Location ----------------
  const getCurrentLocation = () => {
    setIsGettingLocation(true);

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
      (pos) => {
        const { latitude, longitude } = pos.coords;

        form.setValue("latitude", latitude);
        form.setValue("longitude", longitude);

        fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        )
          .then((res) => res.json())
          .then((data) => {
            form.setValue(
              "address",
              data.locality
                ? `${data.locality}, ${data.principalSubdivision}, ${data.countryName}`
                : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            );
          })
          .finally(() => {
            setIsGettingLocation(false);
            toast({ title: "Location updated" });
          });
      },
      () => {
        setIsGettingLocation(false);
        toast({
          title: "Failed",
          description: "Could not get location",
          variant: "destructive",
        });
      }
    );
  };

  // ---------------- Submit ----------------
  const onSubmit = (data: SearchFormData) => {
    setSearchParams(data);
    toast({
      title: "Searching donors...",
      description: `${data.bloodGroup} within ${data.radius} km`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page Title */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Link>
          </Button>

          <h1 className="text-3xl font-bold">Find Blood Donors</h1>
        </div>
      </div>

      {/* Search Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search size={20} className="text-primary" />
              Search for Donors
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid md:grid-cols-4 gap-4"
              >
                {/* Blood group */}
                <FormField
                  control={form.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Group</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
                            (bg) => (
                              <SelectItem key={bg} value={bg}>
                                {bg}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Location</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input {...field} placeholder="City / Area" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={getCurrentLocation}
                          disabled={isGettingLocation}
                        >
                          {isGettingLocation ? (
                            <div className="animate-spin border-2 border-primary border-l-transparent h-4 w-4 rounded-full" />
                          ) : (
                            <MapPin size={16} />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Radius */}
                <FormField
                  control={form.control}
                  name="radius"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Radius</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(+v)}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[5, 10, 15, 25, 50].map((r) => (
                            <SelectItem key={r} value={r.toString()}>
                              {r} km
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {searchParams && (
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8 px-4 sm:px-6 lg:px-8 pb-12">

          {/* Map */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle>Nearby Donors</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[500px]">
                <InteractiveMap
                  center={[searchParams.latitude, searchParams.longitude]}
                  donors={donorsWithDistance}
                  onDonorSelect={setSelectedDonor}
                  selectedDonor={selectedDonor}
                />
              </div>
            </CardContent>
          </Card>

          {/* Donor List */}
          <div ref={listRef}>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Users size={20} className="text-secondary" />
              Donors Found ({donorsWithDistance.length})
            </h3>

            {isLoading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin h-12 w-12 border-2 border-primary border-l-transparent rounded-full"></div>
              </div>
            ) : donorsWithDistance.length > 0 ? (
              <div className="space-y-4">
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
                  <Users className="mx-auto text-muted-foreground mb-3" size={48} />
                  <h3 className="text-xl font-semibold mb-2">No Donors Found</h3>
                  <p className="text-muted-foreground">
                    No {searchParams.bloodGroup} donors were found near you.
                    Try increasing your search radius.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Initial State */}
      {!searchParams && (
        <Card className="max-w-3xl mx-auto mt-12 shadow-md">
          <CardContent className="p-12 text-center">
            <Search size={64} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-2xl font-bold mb-2">Find Blood Donors Near You</h3>
            <p className="text-muted-foreground mb-4">
              Enter your details above to discover available donors in your area.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
