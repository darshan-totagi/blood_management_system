import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background to-muted/50 px-4">
      <Card className="w-full max-w-md shadow-xl border-border/40">
        <CardContent className="py-10 px-6 text-center">

          {/* Animated Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center animate-pulse">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-extrabold text-foreground mb-2">
            404 – Page Not Found
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn’t exist or wasn’t added to the router.
          </p>

          {/* Button */}
          <Button
            asChild
            size="lg"
            className="w-full flex items-center justify-center gap-2"
          >
            <Link href="/">
              <ArrowLeft size={18} />
              Go Back Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
