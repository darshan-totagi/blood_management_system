import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, MapPin, Phone, Eye, Calendar, Award, User, CheckCircle } from "lucide-react";
import { Loader2 } from "lucide-react";
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

  // ---------- Improved Helpers ----------
  const messagePreview = useMemo(
    () =>
      `Hello! I found your profile on PulseConnect and I'm looking for ${donor.bloodGroup} blood. Could you please help? Thank you!`,
    [donor.bloodGroup]
  );

  const calculateTimeSinceLastDonation = (date: string | null) => {
    if (!date) return "No previous donations";

    const donationDate = new Date(date);
    const now = new Date();
    const diffMonths = Math.floor((now.getTime() - donationDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (diffMonths < 1) return "Less than a month ago";
    if (diffMonths === 1) return "1 month ago";
    return `${diffMonths} months ago`;
  };

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

  // ---------- Contact Mutation ----------
  const contactDonorMutation = useMutation({
    mutationFn: async (donorId: string) => {
      const response = await apiRequest("POST", "/api/whatsapp/contact", {
        donorId,
        message: messagePreview,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      window.open(data.whatsappUrl, "_blank");
      toast({ title: "WhatsApp Opened", description: "You can now chat with the donor." });
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
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-600/20">
              <span className="font-bold text-red-600">{donor.bloodGroup}</span>
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

        {/* Actions */}
        <div className="flex gap-2">
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

          <Button
            size="sm"
            variant="outline"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye size={14} />
          </Button>
        </div>

        {/* Contact Dialog */}
        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Contact Donor</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              You're about to contact <strong>{donor.fullName}</strong>.
            </p>

            <div className="p-3 bg-muted/30 rounded-lg mt-2">
              <p className="text-xs text-muted-foreground mb-1">Message preview:</p>
              <p className="text-sm italic">"{messagePreview}"</p>
            </div>

            <div className="flex space-x-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsContactDialogOpen(false)}>
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
                Open WhatsApp
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
