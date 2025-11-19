import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Heart, Search, MapPin, MessageCircle, 
  Shield, Award, ArrowRight 
} from "lucide-react";
import Header from "@/components/header";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* =============================== */}
      {/* HERO SECTION */}
      {/* =============================== */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground mb-4 animate-fade-up">
            Save Lives. Inspire Hope.
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-up delay-100">
            Join India’s fastest-growing blood donation network.  
            Connect with donors instantly — powered by live location, smart matches,  
            and real-time WhatsApp communication.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-up delay-200">
            <Button asChild size="lg" className="px-10 py-6 text-lg shadow-lg">
              <a href="/api/login">Register as Donor</a>
            </Button>

            <Button 
              asChild 
              variant="secondary" 
              size="lg" 
              className="px-10 py-6 text-lg shadow-md hover:shadow-lg"
            >
              <a href="/api/login">
                Find Donors
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* =============================== */}
      {/* REGISTRATION OPTIONS */}
      {/* =============================== */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-10">
          
          {/* Donor Card */}
          <Card className="shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
            <CardContent className="p-8 text-center">
              <div className="bg-secondary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                <Heart className="text-secondary" size={40} />
              </div>
              <h3 className="text-2xl font-bold mb-2">Blood Donor</h3>
              <p className="text-muted-foreground mb-6">
                Join our donor community and earn credits with every donation.
              </p>

              <Button 
                asChild 
                className="w-full py-6 text-lg bg-secondary hover:bg-secondary/80"
              >
                <a href="/api/login">Register Now</a>
              </Button>
            </CardContent>
          </Card>

          {/* Finder Card */}
          <Card className="shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
            <CardContent className="p-8 text-center">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                <Search className="text-primary" size={40} />
              </div>
              <h3 className="text-2xl font-bold mb-2">Blood Finder</h3>
              <p className="text-muted-foreground mb-6">
                Locate donors instantly based on your location and blood group.
              </p>

              <Button 
                asChild 
                className="w-full py-6 text-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <a href="/api/login">Find Donors</a>
              </Button>
            </CardContent>
          </Card>

        </div>
      </section>

      {/* =============================== */}
      {/* CREDITS SECTION */}
      {/* =============================== */}
      <section className="bg-muted/20 py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Credit System</h2>
          <p className="text-lg text-muted-foreground mb-12">
            Earn credits with each donation and redeem when you need blood.
          </p>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Credit Items */}
            {[
              {
                title: "Earn Credits",
                desc: "Receive 5 credits for every donation",
                icon: <Heart className="text-secondary" size={38} />,
                bg: "bg-secondary/10",
              },
              {
                title: "Redeem Benefits",
                desc: "Use credits for free blood in emergencies",
                icon: <Award className="text-primary" size={38} />,
                bg: "bg-primary/10",
              },
              {
                title: "Safe Intervals",
                desc: "System enforces a safe 6-month donation cycle",
                icon: <Shield className="text-accent" size={38} />,
                bg: "bg-accent/10",
              },
            ].map((item, i) => (
              <Card 
                key={i} 
                className="shadow-sm hover:shadow-xl transition-all text-center"
              >
                <CardContent className="p-6">
                  <div className={`${item.bg} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4`}>
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* =============================== */}
      {/* FEATURES SECTION */}
      {/* =============================== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Why PulseConnect?</h2>
          <p className="text-lg text-muted-foreground mb-12">
            Built with life-saving features & cutting-edge technology.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
            {[
              {
                icon: <MapPin size={36} className="text-primary" />,
                title: "Location-Based Search",
                desc: "Find donors using GPS within a 5–50 km radius.",
              },
              {
                icon: <MessageCircle size={36} className="text-secondary" />,
                title: "Instant WhatsApp Contact",
                desc: "Reach donors with one tap through WhatsApp.",
              },
              {
                icon: <Shield size={36} className="text-accent" />,
                title: "Safe Donation Tracking",
                desc: "Fully automated donation & interval tracking.",
              },
              {
                icon: <Award size={36} className="text-purple-600" />,
                title: "Reward Program",
                desc: "Earn credits & build your donor streak.",
              },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================== */}
      {/* FOOTER */}
      {/* =============================== */}
      <footer className="bg-card border-t border-border py-12 mt-16">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          
          {/* Branding */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="blood-drop w-10 h-10 rounded-full flex items-center justify-center">
                <Heart className="text-white" size={20} />
              </div>
              <h3 className="text-xl font-bold">PulseConnect</h3>
            </div>
            <p className="text-muted-foreground">
              Empowering communities through quick, reliable blood connections.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary">About Us</a></li>
              <li><a href="#" className="hover:text-primary">Safety Guidelines</a></li>
              <li><a href="#" className="hover:text-primary">Support</a></li>
            </ul>
          </div>

          {/* Emergency */}
          <div>
            <h4 className="font-semibold mb-4">Emergency</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-accent">Blood Banks</a></li>
              <li><a href="#" className="hover:text-accent">Hospitals</a></li>
              <li><a href="#" className="hover:text-accent">24/7 Helpline</a></li>
            </ul>
          </div>

        </div>

        <div className="text-center text-muted-foreground mt-10 border-t border-border pt-6">
          © 2024 PulseConnect — Save Lives, Inspire Hope.
        </div>
      </footer>
    </div>
  );
}
