import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, MapPin, Phone, Eye, Calendar, Award, User } from "lucide-react";
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

  const contactDonorMutation = useMutation({
    mutationFn: async (donorId: string) => {
      const message = `Hello! I found your profile on PulseConnect and I'm looking for ${donor.bloodGroup} blood. Could you please help? Thank you!`;
      const response = await apiRequest('POST', '/api/whatsapp/contact', {
        donorId,
        message,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      window.open(data.whatsappUrl, '_blank');
      setIsContactDialogOpen(false);
      toast({
        title: "WhatsApp Opened",
        description: "You can now chat with the donor directly.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to contact donor",
        variant: "destructive",
      });
    },
  });

  const calculateTimeSinceLastDonation = (lastDonationDate: string | null): string => {
    if (!lastDonationDate) return "No previous donations";
    
    const donationDate = new Date(lastDonationDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - donationDate.getTime());
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    
    if (diffMonths < 1) return "Less than a month ago";
    if (diffMonths === 1) return "1 month ago";
    return `${diffMonths} months ago`;
  };

  const getAvailabilityStatus = () => {
    if (!donor.isAvailable) return { text: "Unavailable", variant: "secondary" as const };
    
    if (!donor.lastDonationDate) return { text: "Available", variant: "default" as const };
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const lastDonation = new Date(donor.lastDonationDate);
    
    if (lastDonation <= sixMonthsAgo) {
      return { text: "Available", variant: "default" as const };
    } else {
      return { text: "Recently Donated", variant: "outline" as const };
    }
  };

  const availabilityStatus = getAvailabilityStatus();

  const handleContactClick = () => {
    setIsContactDialogOpen(true);
  };

  const handleConfirmContact = () => {
    contactDonorMutation.mutate(donor.id);
  };

  return (
    <Card 
      className={`shadow-sm hover:shadow-md transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'border-border'
      }`}
      onClick={onSelect}
      data-testid={`card-donor-${donor.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
              <span className="text-secondary font-bold" data-testid={`text-blood-group-${donor.id}`}>
                {donor.bloodGroup}
              </span>
            </div>
            <div>
              <h5 className="font-medium text-foreground" data-testid={`text-donor-name-${donor.id}`}>
                {donor.fullName}
              </h5>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin size={12} />
                <span data-testid={`text-distance-${donor.id}`}>
                  {distance.toFixed(1)} km away
                </span>
              </div>
            </div>
          </div>
          <Badge variant={availabilityStatus.variant} data-testid={`badge-status-${donor.id}`}>
            {availabilityStatus.text}
          </Badge>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last donation:</span>
            <span className="text-foreground" data-testid={`text-last-donation-${donor.id}`}>
              {calculateTimeSinceLastDonation(donor.lastDonationDate ? donor.lastDonationDate.toString() : null)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Credits earned:</span>
            <span className="text-foreground font-medium" data-testid={`text-credits-${donor.id}`}>
              {donor.credits} credits
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total donations:</span>
            <span className="text-foreground font-medium" data-testid={`text-total-donations-${donor.id}`}>
              {donor.totalDonations}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            size="sm"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              handleContactClick();
            }}
            data-testid={`button-contact-${donor.id}`}
          >
            <Phone size={14} className="mr-1" />
            Contact
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                size="sm"
                variant="outline"
                onClick={(e) => e.stopPropagation()}
                data-testid={`button-view-details-${donor.id}`}
              >
                <Eye size={14} />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Heart className="text-secondary" size={20} />
                  <span>Donor Details</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-secondary font-bold text-xl">{donor.bloodGroup}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{donor.fullName}</h3>
                  <p className="text-sm text-muted-foreground">{donor.age} years old</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <Calendar className="mx-auto mb-1 text-primary" size={16} />
                    <p className="text-xs text-muted-foreground">Last Donation</p>
                    <p className="text-sm font-medium">
                      {calculateTimeSinceLastDonation(donor.lastDonationDate ? donor.lastDonationDate.toString() : null)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <Award className="mx-auto mb-1 text-secondary" size={16} />
                    <p className="text-xs text-muted-foreground">Credits</p>
                    <p className="text-sm font-medium">{donor.credits}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="text-muted-foreground" size={16} />
                    <span className="text-sm">{distance.toFixed(1)} km away from you</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="text-muted-foreground" size={16} />
                    <span className="text-sm">Weight: {donor.weight} kg</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Heart className="text-muted-foreground" size={16} />
                    <span className="text-sm">Total donations: {donor.totalDonations}</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleContactClick}
                  data-testid={`button-contact-from-modal-${donor.id}`}
                >
                  <Phone size={16} className="mr-2" />
                  Contact via WhatsApp
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Contact Confirmation Dialog */}
        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Contact Donor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You're about to contact <strong>{donor.fullName}</strong> via WhatsApp. 
                A pre-written message will be sent to help you get started.
              </p>
              
              <div className="p-3 bg-muted/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Message preview:</p>
                <p className="text-sm italic">
                "Greetings! Your PulseConnect profile indicates you're a {donor.bloodGroup} blood donor. We are currently in need of this blood type. If possible, could you support us? Thank you."
                </p>
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsContactDialogOpen(false)}
                  data-testid={`button-cancel-contact-${donor.id}`}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={handleConfirmContact}
                  disabled={contactDonorMutation.isPending}
                  data-testid={`button-confirm-contact-${donor.id}`}
                >
                  {contactDonorMutation.isPending ? "Opening..." : "Open WhatsApp"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
