import { useState, useMemo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Heart,
  MapPin,
  Phone,
  Eye,
  CheckCircle,
  Loader2,
  Share2,
} from "lucide-react";
import type { Donor } from "@shared/schema";

interface DonorCardProps {
  donor: Donor & { distance: number };
  distance: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function DonorCard({ donor, distance, isSelected = false, onSelect }: DonorCardProps) {
  const { toast } = useToast();
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  // NEW STATES FOR SILENT CONTACT MODE
  const [contactMode, setContactMode] = useState<"normal" | "emergency">("normal");
  const [emHospital, setEmHospital] = useState("");
  const [emNote, setEmNote] = useState("");
  const [locationText, setLocationText] = useState("Detecting location...");

  // Fetch location automatically when dialog opens
  useEffect(() => {
    if (isContactDialogOpen) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocationText(`https://maps.google.com/?q=${latitude},${longitude}`);
        },
        () => setLocationText("Location not available")
      );
    }
  }, [isContactDialogOpen]);

  // ---------- Normal Message ----------
  const messagePreview = useMemo(
    () =>
      `Hello! I found your profile on PulseConnect and I'm looking for ${donor.bloodGroup} blood. Could you please help? Thank you!`,
    [donor.bloodGroup]
  );

  // ---------- Emergency Message ----------
  const emergencyMessage = useMemo(() => {
    return `🚨 EMERGENCY BLOOD REQUEST 🚨

Blood Needed: ${donor.bloodGroup}
Patient Condition: ${emNote || "Not specified"}
Hospital: ${emHospital || "Not specified"}
Location: ${locationText}

Please respond urgently if you can help. 🙏`;
  }, [donor.bloodGroup, emHospital, emNote, locationText]);

  // ---------- SHARE MESSAGE ----------
  const shareMessage = useMemo(() => {
    return `Hey, this donor might help your case — check this:\n
Name: ${donor.fullName}
Blood Group: ${donor.bloodGroup}
Distance: ${distance.toFixed(1)} km away
Total Donations: ${donor.totalDonations}

You can contact them on PulseConnect.`;
  }, [donor, distance]);

  const handleShareDonor = () => {
    const encodedMessage = encodeURIComponent(shareMessage);
    const url = `https://wa.me/?text=${encodedMessage}`;

    window.open(url, "_blank");

    toast({
      title: "Shared",
      description: "Donor details shared via WhatsApp.",
    });
  };

  // ---------- Donation Time Helper ----------
  const calculateTimeSinceLastDonation = (date: string | null) => {
    if (!date) return "No previous donations";
    const donationDate = new Date(date);
    const now = new Date();
    const diffMonths = Math.floor((now.getTime() - donationDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (diffMonths < 1) return "Less than a month ago";
    if (diffMonths === 1) return "1 month ago";
    return `${diffMonths} months ago`;
  };

  // ---------- Availability Status ----------
  const availabilityStatus = useMemo(() => {
    if (!donor.isAvailable) return { text: "Unavailable", variant: "destructive" as const };
    if (!donor.lastDonationDate) return { text: "Available", variant: "default" as const };

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const lastDonation = new Date(donor.lastDonationDate);

    return lastDonation <= sixMonthsAgo
      ? { text: "Available", variant: "default" as const }
      : { text: "Recently Donated", variant: "outline" as const };
  }, [donor]);

  const isVerifiedDonor = donor.totalDonations >= 5;

  // ---------- Contact Mutation (Normal + Emergency) ----------
  const contactDonorMutation = useMutation({
    mutationFn: async (donorId: string) => {
      const finalMessage =
        contactMode === "normal" ? messagePreview : emergencyMessage;

      const response = await apiRequest("POST", "/api/whatsapp/contact", {
        donorId,
        message: finalMessage,
      });

      return await response.json();
    },
    onSuccess: (data) => {
      window.open(data.whatsappUrl, "_blank");
      toast({
        title: "WhatsApp Opened",
        description:
          contactMode === "normal"
            ? "Normal message sent."
            : "Emergency message sent.",
      });
      setIsContactDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to contact donor",
        variant: "destructive",
      });
    },
  });

  // ==================================================================
  // ========================== UI START ===============================
  // ==================================================================

  return (
    <Card
      className={`shadow-sm hover:shadow-lg transition-all cursor-pointer rounded-xl ${
        isSelected ? "ring-2 ring-primary border-primary" : "border-border"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">

        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">

            {/* Blood Group */}
            <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center relative">
              <Heart size={20} className="absolute left-1 top-1 text-red-500 animate-bounce-slow" />
              <span className="text-secondary font-bold relative z-10">
                {donor.bloodGroup}
              </span>
            </div>

            <div>
              <h5 className="font-semibold flex items-center gap-1">
                {donor.fullName}
                {isVerifiedDonor && <CheckCircle size={14} className="text-green-600" />}
              </h5>
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin size={12} className="mr-1" />
                {distance.toFixed(1)} km away
              </div>
            </div>
          </div>

          <Badge variant={availabilityStatus.variant}>{availabilityStatus.text}</Badge>
        </div>

        {/* Info */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last donation:</span>
            <span>{calculateTimeSinceLastDonation(donor.lastDonationDate ?? null)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Total donations:</span>
            <span className="font-medium">{donor.totalDonations}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Credits earned:</span>
            <span className="font-medium">{donor.credits}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* CONTACT */}
          <Button
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              setIsContactDialogOpen(true);
            }}
            disabled={contactDonorMutation.isPending}
          >
            {contactDonorMutation.isPending ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <Phone size={14} className="mr-1" />
            )}
            {contactDonorMutation.isPending ? "Opening..." : "Contact"}
          </Button>

          {/* VIEW */}
          <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
            <Eye size={14} />
          </Button>

          {/* SHARE */}
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleShareDonor();
            }}
          >
            <Share2 size={14} />
          </Button>
        </div>

        {/* CONTACT DIALOG WITH SILENT MODE */}
        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Contact Donor</DialogTitle>
            </DialogHeader>

            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button
                variant={contactMode === "normal" ? "default" : "outline"}
                onClick={() => setContactMode("normal")}
              >
                Normal
              </Button>
              <Button
                variant={contactMode === "emergency" ? "destructive" : "outline"}
                onClick={() => setContactMode("emergency")}
              >
                Emergency
              </Button>
            </div>

            {/* NORMAL MODE */}
            {contactMode === "normal" && (
              <div className="p-3 bg-muted/30 rounded-lg mt-2">
                <p className="text-xs text-muted-foreground mb-1">Message preview:</p>
                <p className="text-sm italic">"{messagePreview}"</p>
              </div>
            )}

            {/* EMERGENCY MODE */}
            {contactMode === "emergency" && (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-xs mb-1 text-red-600 font-medium">Emergency Message</p>
                  <p className="text-sm whitespace-pre-wrap italic">{emergencyMessage}</p>
                </div>

                <input
                  className="w-full p-2 border rounded-md"
                  placeholder="Hospital name"
                  value={emHospital}
                  onChange={(e) => setEmHospital(e.target.value)}
                />

                <input
                  className="w-full p-2 border rounded-md"
                  placeholder="Patient condition / urgency"
                  value={emNote}
                  onChange={(e) => setEmNote(e.target.value)}
                />

                <p className="text-xs text-muted-foreground">
                  Location: <span className="text-blue-600 break-all">{locationText}</span>
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsContactDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button
                className="flex-1"
                onClick={() => contactDonorMutation.mutate(donor.id)}
                disabled={contactDonorMutation.isPending}
              >
                {contactDonorMutation.isPending ? (
                  <Loader2 className="mr-2 animate-spin" size={16} />
                ) : (
                  <Phone className="mr-2" size={16} />
                )}
                {contactMode === "normal" ? "Send Message" : "Send Emergency"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
