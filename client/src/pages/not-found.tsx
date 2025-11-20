import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border border-gray-200">
          <CardContent className="pt-6 pb-8">
            
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <h1 className="text-3xl font-semibold text-gray-900">
                Page Not Found
              </h1>
            </div>

            <p className="text-sm text-gray-600">
              The page you're looking for doesn’t exist or may have been moved.
            </p>

            <div className="mt-6 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
              • Did you forget to add the route in your router?<br />
              • Check if the file is placed inside the correct directory.<br />
              • Verify the URL spelling.
            </div>

            <div className="mt-6 flex gap-3">
              <Link href="/">
                <Button className="w-full">Go Home</Button>
              </Link>

              <Link href="/contact">
                <Button variant="outline" className="w-full">
                  Report Issue
                </Button>
              </Link>
            </div>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
