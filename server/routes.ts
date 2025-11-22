import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Import from localAuth instead of replitAuth
import { setupAuth, isAuthenticated } from "./localAuth";
import { insertDonorSchema, insertBloodRequestSchema, insertDonationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Donor routes
  app.post('/api/donors', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Received donor registration request:", req.body);
      const userId = req.user.claims.sub;
      console.log("User ID:", userId);
      
      try {
        // Pre-process the request body to handle the date properly
        const processedBody = { ...req.body };
        
        // Convert lastDonationDate string to Date object if it exists
        if (processedBody.lastDonationDate) {
          try {
            processedBody.lastDonationDate = new Date(processedBody.lastDonationDate);
          } catch (e) {
            console.error("Error converting date:", e);
            processedBody.lastDonationDate = null;
          }
        }
        
        const donorData = insertDonorSchema.parse({ ...processedBody, userId });
        console.log("Validated donor data:", donorData);
        
        // Check if user is already a donor
        const existingDonor = await storage.getDonorByUserId(userId);
        if (existingDonor) {
          console.log("User is already a donor:", existingDonor);
          return res.status(400).json({ message: "User is already registered as a donor" });
        }

        const donor = await storage.createDonor(donorData);
        console.log("Donor created successfully:", donor);
        res.json(donor);
      } catch (validationError) {
        console.error("Validation error:", validationError);
        return res.status(400).json({ message: "Invalid donor data", error: validationError });
      }
    } catch (error) {
      console.error("Error creating donor:", error);
      res.status(500).json({ message: "Failed to create donor profile" });
    }
  });

  app.get('/api/donors/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donor = await storage.getDonorByUserId(userId);
      res.json(donor);
    } catch (error) {
      console.error("Error fetching donor:", error);
      res.status(500).json({ message: "Failed to fetch donor profile" });
    }
  });

  app.put('/api/donors/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donor = await storage.getDonorByUserId(userId);
      if (!donor) {
        return res.status(404).json({ message: "Donor profile not found" });
      }

      const updates = insertDonorSchema.partial().parse(req.body);
      const updatedDonor = await storage.updateDonor(donor.id, updates);
      res.json(updatedDonor);
    } catch (error) {
      console.error("Error updating donor:", error);
      res.status(400).json({ message: "Failed to update donor profile" });
    }
  });

  app.get('/api/donors/eligibility', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donor = await storage.getDonorByUserId(userId);
      if (!donor) {
        return res.status(404).json({ message: "Donor profile not found" });
      }

      const eligibility = await storage.getDonorEligibility(donor.id);
      res.json(eligibility);
    } catch (error) {
      console.error("Error checking eligibility:", error);
      res.status(500).json({ message: "Failed to check donation eligibility" });
    }
  });

  app.get('/api/donors/search', async (req, res) => {
    try {
      const { latitude, longitude, radius = 5, bloodGroup } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const donors = await storage.findNearbyDonors(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        parseInt(radius as string),
        bloodGroup as string | undefined
      );

      res.json(donors);
    } catch (error) {
      console.error("Error searching donors:", error);
      res.status(500).json({ message: "Failed to search for donors" });
    }
  });

  // Blood request routes
  app.post('/api/blood-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestData = insertBloodRequestSchema.parse({ ...req.body, requesterId: userId });
      
      const bloodRequest = await storage.createBloodRequest(requestData);
      res.json(bloodRequest);
    } catch (error) {
      console.error("Error creating blood request:", error);
      res.status(400).json({ message: "Failed to create blood request" });
    }
  });

  app.get('/api/blood-requests', async (req, res) => {
    try {
      const requests = await storage.getActiveBloodRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching blood requests:", error);
      res.status(500).json({ message: "Failed to fetch blood requests" });
    }
  });

  app.get('/api/blood-requests/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await storage.getUserBloodRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching user blood requests:", error);
      res.status(500).json({ message: "Failed to fetch your blood requests" });
    }
  });

  // NEW: Donor responds to a request (accept/reject)
  app.post('/api/blood-requests/:id/respond', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: "accepted" | "rejected" };
      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const request = await storage.getBloodRequest(id);
      if (!request || request.status !== "active") {
        return res.status(404).json({ message: "Active blood request not found" });
      }

      // Ensure caller is a donor
      const donor = await storage.getDonorByUserId(req.user.claims.sub);
      if (!donor) {
        return res.status(403).json({ message: "Only donors can respond to requests" });
      }

      const resp = await storage.createRequestResponse({
        requestId: id,
        donorId: donor.id,
        status,
      });
      res.json(resp);
    } catch (error) {
      console.error("Error responding to blood request:", error);
      res.status(500).json({ message: "Failed to respond to blood request" });
    }
  });

  // NEW: Requester can see responses to their requests (for notifications)
  app.get('/api/blood-requests/responses/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const responses = await storage.getResponsesForRequester(userId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });
  app.put('/api/blood-requests/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!["active", "fulfilled", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const request = await storage.getBloodRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Blood request not found" });
      }

      // Check if user owns the request
      if (request.requesterId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized to update this request" });
      }

      const updatedRequest = await storage.updateBloodRequestStatus(id, status);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating blood request status:", error);
      res.status(500).json({ message: "Failed to update blood request status" });
    }
  });

  // Donation routes
  app.post('/api/donations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donor = await storage.getDonorByUserId(userId);
      if (!donor) {
        return res.status(404).json({ message: "Donor profile not found" });
      }

      // Check eligibility
      const eligibility = await storage.getDonorEligibility(donor.id);
      if (!eligibility.canDonate) {
        return res.status(400).json({ 
          message: "Not eligible to donate yet",
          nextEligibleDate: eligibility.nextEligibleDate
        });
      }

      const donationData = insertDonationSchema.parse({ ...req.body, donorId: donor.id });
      const donation = await storage.createDonation(donationData);
      res.json(donation);
    } catch (error) {
      console.error("Error recording donation:", error);
      res.status(400).json({ message: "Failed to record donation" });
    }
  });

  app.get('/api/donations/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donor = await storage.getDonorByUserId(userId);
      if (!donor) {
        return res.status(404).json({ message: "Donor profile not found" });
      }

      const donations = await storage.getDonorDonations(donor.id);
      res.json(donations);
    } catch (error) {
      console.error("Error fetching donations:", error);
      res.status(500).json({ message: "Failed to fetch donation history" });
    }
  });

  // Credit routes
  app.get('/api/credits/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donor = await storage.getDonorByUserId(userId);
      if (!donor) {
        return res.status(404).json({ message: "Donor profile not found" });
      }

      const transactions = await storage.getCreditTransactions(donor.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
      res.status(500).json({ message: "Failed to fetch credit transactions" });
    }
  });

  app.post('/api/credits/spend', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, description, requestId } = req.body;
      
      const donor = await storage.getDonorByUserId(userId);
      if (!donor) {
        return res.status(404).json({ message: "Donor profile not found" });
      }

      const success = await storage.spendCredits(donor.id, amount, description, requestId);
      if (!success) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      res.json({ message: "Credits spent successfully" });
    } catch (error) {
      console.error("Error spending credits:", error);
      res.status(500).json({ message: "Failed to spend credits" });
    }
  });

  // WhatsApp integration route
  app.post('/api/whatsapp/contact', isAuthenticated, async (req: any, res) => {
    try {
      const { donorId, message } = req.body;
      const donor = await storage.getDonor(donorId);
      
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }

      // Generate WhatsApp URL (sanitize number to digits-only E.164)
      const sanitized = donor.whatsappNumber.replace(/[^\d]/g, "");
      const whatsappUrl = `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
      res.json({ whatsappUrl });
    } catch (error) {
      console.error("Error generating WhatsApp contact:", error);
      res.status(500).json({ message: "Failed to generate WhatsApp contact" });
    }
  });

  app.post('/api/requests/:id/verify', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user.claims.sub;
      const request = await storage.getBloodRequest(requestId);
      if (!request || request.requesterId !== userId) {
        return res.status(403).json({ message: "Not allowed to verify this request" });
      }

      const donorId = req.body.donorId as string;
      const donor = await storage.getDonor(donorId);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }

      const donation = await storage.verifyDonation(donor.id, requestId, {
        donationDate: req.body.donationDate ? new Date(req.body.donationDate) : new Date(),
        bloodGroup: req.body.bloodGroup || donor.bloodGroup,
        unitsGiven: req.body.unitsGiven || 1,
        creditsEarned: req.body.creditsEarned || 5,
        hospitalName: req.body.hospitalName,
        notes: req.body.notes,
      });

      res.json(donation);
    } catch (error) {
      console.error("Error verifying donation:", error);
      res.status(400).json({ message: "Failed to verify donation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
