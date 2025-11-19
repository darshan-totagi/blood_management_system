import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Search, MapPin, MessageCircle, Shield, Award } from "lucide-react";
import Header from "@/components/header";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 to-secondary/5 py-16" data-testid="section-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Save Lives, Connect Hearts</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join the largest blood donation network. Connect donors with those in need, earn credits for donations, and make a difference in your community.
            </p>
          </div>
          
          {/* Registration Options */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Blood Donor Registration */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="text-secondary" size={32} />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-2">Blood Donor</h3>
                  <p className="text-muted-foreground">Register as a donor, help save lives, and earn credits for future needs</p>
                </div>
                <Button 
                  asChild
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  data-testid="button-register-donor"
                >
                  <a href="/api/login">Register as Donor</a>
                </Button>
              </CardContent>
            </Card>
            
            {/* Blood Finder Registration */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-accent" size={32} />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-2">Blood Finder</h3>
                  <p className="text-muted-foreground">Find donors in your area quickly and connect directly via WhatsApp</p>
                </div>
                <Button 
                  asChild
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  data-testid="button-find-donors"
                >
                  <a href="/api/login">Find Blood Donors</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Credits System Display */}
      <section className="bg-muted/20 py-16" data-testid="section-credits">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Credit System</h2>
            <p className="text-xl text-muted-foreground">Earn credits for every donation and use them when you need blood</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center shadow-sm">
              <CardContent className="p-6">
                <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="text-secondary" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Earn Credits</h3>
                <p className="text-muted-foreground">Get 5 credits for each successful blood donation</p>
              </CardContent>
            </Card>
            
            <Card className="text-center shadow-sm">
              <CardContent className="p-6">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-primary" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Use Credits</h3>
                <p className="text-muted-foreground">Redeem credits for free blood when you need it most</p>
              </CardContent>
            </Card>
            
            <Card className="text-center shadow-sm">
              <CardContent className="p-6">
                <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-accent" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">6-Month Rule</h3>
                <p className="text-muted-foreground">Credits are valid and donations tracked for safe intervals</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-background py-16" data-testid="section-features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Why Choose PulseConnect?</h2>
            <p className="text-xl text-muted-foreground">Advanced features to make blood donation efficient and rewarding</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-primary" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Location-Based</h3>
              <p className="text-muted-foreground">Find donors within 5km radius using GPS technology</p>
            </div>
            
            <div className="text-center">
              <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="text-secondary" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Direct Contact</h3>
              <p className="text-muted-foreground">Connect instantly via WhatsApp for quick communication</p>
            </div>
            
            <div className="text-center">
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-accent" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Safe Tracking</h3>
              <p className="text-muted-foreground">Monitor donation intervals for health and safety</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-purple-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Reward System</h3>
              <p className="text-muted-foreground">Earn and redeem credits for helping others</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="blood-drop w-10 h-10 rounded-full flex items-center justify-center">
                  <Heart className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">PulseConnect</h1>
                  <p className="text-xs text-muted-foreground">Blood Bank Network</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Connecting blood donors with those in need, making blood donation more accessible and rewarding for everyone.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-primary">About Us</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">How It Works</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Safety Guidelines</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Emergency</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-accent">Blood Banks</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-accent">Hospitals</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-accent">24/7 Helpline</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-accent">Contact Emergency Services</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 mt-8 text-center">
            <p className="text-muted-foreground">
              &copy; 2024 PulseConnect. All rights reserved. Saving lives, one connection at a time.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 