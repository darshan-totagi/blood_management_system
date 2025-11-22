import {
  users,
  donors,
  bloodRequests,
  donations,
  creditTransactions,
  type User,
  type UpsertUser,
  type Donor,
  type InsertDonor,
  type BloodRequest,
  type InsertBloodRequest,
  type Donation,
  type InsertDonation,
  type CreditTransaction,
  requestResponses,
  type RequestResponse,
  type InsertRequestResponse,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Donor operations
  createDonor(donor: InsertDonor): Promise<Donor>;
  getDonor(id: string): Promise<Donor | undefined>;
  getDonorByUserId(userId: string): Promise<Donor | undefined>;
  updateDonor(id: string, updates: Partial<InsertDonor>): Promise<Donor>;
  findNearbyDonors(latitude: number, longitude: number, radiusKm: number, bloodGroup?: string): Promise<Donor[]>;
  getDonorEligibility(donorId: string): Promise<{ canDonate: boolean; nextEligibleDate?: Date }>;

  // Blood request operations
  createBloodRequest(request: InsertBloodRequest): Promise<BloodRequest>;
  getBloodRequest(id: string): Promise<BloodRequest | undefined>;
  getActiveBloodRequests(): Promise<BloodRequest[]>;
  getUserBloodRequests(userId: string): Promise<BloodRequest[]>;
  updateBloodRequestStatus(id: string, status: "active" | "fulfilled" | "cancelled"): Promise<BloodRequest>;

  // Donation operations
  createDonation(donation: InsertDonation): Promise<Donation>;
  getDonorDonations(donorId: string): Promise<Donation[]>;
  getLastDonation(donorId: string): Promise<Donation | undefined>;

  // Credit operations
  addCredits(donorId: string, amount: number, description: string, relatedDonationId?: string): Promise<void>;
  spendCredits(donorId: string, amount: number, description: string, relatedRequestId?: string): Promise<boolean>;
  getCreditTransactions(donorId: string): Promise<CreditTransaction[]>;

  // Request response operations
  createRequestResponse(response: InsertRequestResponse): Promise<RequestResponse>;
  getResponsesForRequester(userId: string): Promise<RequestResponse[]>;
  getResponsesByRequest(requestId: string): Promise<RequestResponse[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Donor operations
  async createDonor(donor: InsertDonor): Promise<Donor> {
    try {
      console.log("Creating donor with data:", donor);
      const donorData = {
        ...donor,
        latitude: donor.latitude.toString(),
        longitude: donor.longitude.toString(),
        weight: donor.weight.toString(),
      };
      console.log("Transformed donor data:", donorData);
      const [newDonor] = await db.insert(donors).values(donorData).returning();
      console.log("New donor created:", newDonor);
      return newDonor;
    } catch (error) {
      console.error("Database error creating donor:", error);
      throw error;
    }
  }

  async getDonor(id: string): Promise<Donor | undefined> {
    const [donor] = await db.select().from(donors).where(eq(donors.id, id));
    return donor;
  }

  async getDonorByUserId(userId: string): Promise<Donor | undefined> {
    const [donor] = await db.select().from(donors).where(eq(donors.userId, userId));
    return donor;
  }

  async updateDonor(id: string, updates: Partial<InsertDonor>): Promise<Donor> {
    const updateData = {
      ...updates,
      ...(updates.latitude !== undefined && { latitude: updates.latitude.toString() }),
      ...(updates.longitude !== undefined && { longitude: updates.longitude.toString() }),
      ...(updates.weight !== undefined && { weight: updates.weight.toString() }),
      updatedAt: new Date(),
    };
    const [updatedDonor] = await db
      .update(donors)
      .set(updateData)
      .where(eq(donors.id, id))
      .returning();
    return updatedDonor;
  }

  async findNearbyDonors(latitude: number, longitude: number, radiusKm: number, bloodGroup?: string): Promise<Donor[]> {
    // Using Haversine formula to calculate distance
    const query = db
      .select()
      .from(donors)
      .where(
        and(
          eq(donors.isAvailable, true),
          bloodGroup ? eq(donors.bloodGroup, bloodGroup) : undefined,
          sql`(
            6371 * acos(
              cos(radians(${latitude})) 
              * cos(radians(${donors.latitude})) 
              * cos(radians(${donors.longitude}) - radians(${longitude})) 
              + sin(radians(${latitude})) 
              * sin(radians(${donors.latitude}))
            )
          ) <= ${radiusKm}`
        )
      )
      .orderBy(
        sql`(
          6371 * acos(
            cos(radians(${latitude})) 
            * cos(radians(${donors.latitude})) 
            * cos(radians(${donors.longitude}) - radians(${longitude})) 
            + sin(radians(${latitude})) 
            * sin(radians(${donors.latitude}))
          )
        )`
      );

    return await query;
  }

  async getDonorEligibility(donorId: string): Promise<{ canDonate: boolean; nextEligibleDate?: Date }> {
    const lastDonation = await this.getLastDonation(donorId);
    
    if (!lastDonation) {
      return { canDonate: true };
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const canDonate = new Date(lastDonation.donationDate) <= sixMonthsAgo;
    
    if (!canDonate) {
      const nextEligibleDate = new Date(lastDonation.donationDate);
      nextEligibleDate.setMonth(nextEligibleDate.getMonth() + 6);
      return { canDonate: false, nextEligibleDate };
    }

    return { canDonate: true };
  }

  // Blood request operations
  async createBloodRequest(request: InsertBloodRequest): Promise<BloodRequest> {
    const requestData = {
      ...request,
      latitude: request.latitude.toString(),
      longitude: request.longitude.toString(),
    };
    const [newRequest] = await db.insert(bloodRequests).values(requestData).returning();
    return newRequest;
  }

  async getBloodRequest(id: string): Promise<BloodRequest | undefined> {
    const [request] = await db.select().from(bloodRequests).where(eq(bloodRequests.id, id));
    return request;
  }

  async getActiveBloodRequests(): Promise<BloodRequest[]> {
    return await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.status, "active"))
      .orderBy(desc(bloodRequests.createdAt));
  }

  async getUserBloodRequests(userId: string): Promise<BloodRequest[]> {
    return await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.requesterId, userId))
      .orderBy(desc(bloodRequests.createdAt));
  }

  async updateBloodRequestStatus(id: string, status: "active" | "fulfilled" | "cancelled"): Promise<BloodRequest> {
    const [updatedRequest] = await db
      .update(bloodRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(bloodRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Donation operations
  async createDonation(donation: InsertDonation): Promise<Donation> {
    const [newDonation] = await db.insert(donations).values(donation).returning();
    
    // Update donor statistics
    await db
      .update(donors)
      .set({
        totalDonations: sql`${donors.totalDonations} + 1`,
        lastDonationDate: new Date(donation.donationDate),
        credits: sql`${donors.credits} + ${donation.creditsEarned || 5}`,
        updatedAt: new Date(),
      })
      .where(eq(donors.id, donation.donorId));

    // Add credit transaction
    await this.addCredits(
      donation.donorId,
      donation.creditsEarned || 5,
      `Blood donation on ${new Date(donation.donationDate).toLocaleDateString()}`,
      newDonation.id
    );

    return newDonation;
  }

  async verifyDonation(donorId: string, requestId: string, donation: Omit<InsertDonation, "donorId" | "requestId">): Promise<Donation> {
    const [newDonation] = await db
      .insert(donations)
      .values({ ...donation, donorId, requestId })
      .returning();

    await db
      .update(donors)
      .set({
        totalDonations: sql`${donors.totalDonations} + 1`,
        lastDonationDate: new Date(newDonation.donationDate),
        credits: sql`${donors.credits} + ${newDonation.creditsEarned || 5}`,
        updatedAt: new Date(),
      })
      .where(eq(donors.id, donorId));

    await this.addCredits(
      donorId,
      newDonation.creditsEarned || 5,
      `Blood donation on ${new Date(newDonation.donationDate).toLocaleDateString()}`,
      newDonation.id
    );

    await this.updateBloodRequestStatus(requestId, "fulfilled");

    return newDonation;
  }

  async getDonorDonations(donorId: string): Promise<Donation[]> {
    return await db
      .select()
      .from(donations)
      .where(eq(donations.donorId, donorId))
      .orderBy(desc(donations.donationDate));
  }

  async getLastDonation(donorId: string): Promise<Donation | undefined> {
    const [lastDonation] = await db
      .select()
      .from(donations)
      .where(eq(donations.donorId, donorId))
      .orderBy(desc(donations.donationDate))
      .limit(1);
    return lastDonation;
  }

  // Credit operations
  async addCredits(donorId: string, amount: number, description: string, relatedDonationId?: string): Promise<void> {
    await db.insert(creditTransactions).values({
      donorId,
      transactionType: "earned",
      amount,
      description,
      relatedDonationId,
    });
  }

  async spendCredits(donorId: string, amount: number, description: string, relatedRequestId?: string): Promise<boolean> {
    const donor = await this.getDonor(donorId);
    if (!donor || (donor.credits || 0) < amount) {
      return false;
    }

    await db
      .update(donors)
      .set({
        credits: sql`${donors.credits} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(donors.id, donorId));

    await db.insert(creditTransactions).values({
      donorId,
      transactionType: "spent",
      amount,
      description,
      relatedRequestId,
    });

    return true;
  }

  async getCreditTransactions(donorId: string): Promise<CreditTransaction[]> {
    return await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.donorId, donorId))
      .orderBy(desc(creditTransactions.createdAt));
  }

  // NEW: request response operations
  async createRequestResponse(response: InsertRequestResponse): Promise<RequestResponse> {
    const [resp] = await db.insert(requestResponses).values(response).returning();
    return resp;
  }

  async getResponsesForRequester(userId: string): Promise<RequestResponse[]> {
    // Join responses with requests to filter by requesterId
    const rows = await db
      .select()
      .from(requestResponses)
      .innerJoin(bloodRequests, eq(requestResponses.requestId, bloodRequests.id))
      .where(eq(bloodRequests.requesterId, userId))
      .orderBy(desc(requestResponses.createdAt));
    // Map to plain RequestResponse rows
    return rows.map((r: any) => r.request_responses as RequestResponse);
  }

  async getResponsesByRequest(requestId: string): Promise<RequestResponse[]> {
    return await db
      .select()
      .from(requestResponses)
      .where(eq(requestResponses.requestId, requestId))
      .orderBy(desc(requestResponses.createdAt));
  }

  constructor() {
    // Dev safeguard: ensure the request_responses table exists
    this.ensureRequestResponsesTable().catch((err) => {
      console.error("Failed to ensure request_responses table:", err);
    });
  }

  private async ensureRequestResponsesTable() {
    // Ensure pgcrypto for gen_random_uuid()
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    // Create table if missing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS request_responses (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id varchar NOT NULL REFERENCES blood_requests(id),
        donor_id varchar NOT NULL REFERENCES donors(id),
        status varchar NOT NULL,
        created_at timestamp DEFAULT now()
      );
    `);
  }
}

export const storage = new DatabaseStorage();
