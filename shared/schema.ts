import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  integer,
  boolean,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blood donors table
export const donors = pgTable("donors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fullName: varchar("full_name").notNull(),
  age: integer("age").notNull(),
  bloodGroup: varchar("blood_group", { length: 3 }).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  whatsappNumber: varchar("whatsapp_number").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  address: text("address").notNull(),
  lastDonationDate: timestamp("last_donation_date"),
  isAvailable: boolean("is_available").default(true),
  credits: integer("credits").default(0),
  totalDonations: integer("total_donations").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blood requests table
export const bloodRequests = pgTable("blood_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  bloodGroup: varchar("blood_group", { length: 3 }).notNull(),
  urgency: varchar("urgency", { enum: ["low", "medium", "high", "critical"] }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  address: text("address").notNull(),
  contactNumber: varchar("contact_number").notNull(),
  hospitalName: varchar("hospital_name"),
  notes: text("notes"),
  status: varchar("status", { enum: ["active", "fulfilled", "cancelled"] }).default("active"),
  radiusKm: integer("radius_km").default(5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Donations tracking table
export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donorId: varchar("donor_id").notNull().references(() => donors.id),
  requestId: varchar("request_id").references(() => bloodRequests.id),
  donationDate: timestamp("donation_date").notNull(),
  bloodGroup: varchar("blood_group", { length: 3 }).notNull(),
  unitsGiven: integer("units_given").default(1),
  creditsEarned: integer("credits_earned").default(5),
  hospitalName: varchar("hospital_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Credit transactions table
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donorId: varchar("donor_id").notNull().references(() => donors.id),
  transactionType: varchar("transaction_type", { enum: ["earned", "spent"] }).notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  relatedDonationId: varchar("related_donation_id").references(() => donations.id),
  relatedRequestId: varchar("related_request_id").references(() => bloodRequests.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  donor: one(donors, {
    fields: [users.id],
    references: [donors.userId],
  }),
  bloodRequests: many(bloodRequests),
}));

export const donorsRelations = relations(donors, ({ one, many }) => ({
  user: one(users, {
    fields: [donors.userId],
    references: [users.id],
  }),
  donations: many(donations),
  creditTransactions: many(creditTransactions),
}));

export const bloodRequestsRelations = relations(bloodRequests, ({ one, many }) => ({
  requester: one(users, {
    fields: [bloodRequests.requesterId],
    references: [users.id],
  }),
  donations: many(donations),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  donor: one(donors, {
    fields: [donations.donorId],
    references: [donors.id],
  }),
  request: one(bloodRequests, {
    fields: [donations.requestId],
    references: [bloodRequests.id],
  }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  donor: one(donors, {
    fields: [creditTransactions.donorId],
    references: [donors.id],
  }),
  donation: one(donations, {
    fields: [creditTransactions.relatedDonationId],
    references: [donations.id],
  }),
  request: one(bloodRequests, {
    fields: [creditTransactions.relatedRequestId],
    references: [bloodRequests.id],
  }),
}));

// Insert schemas - with proper type coercion for decimal fields
export const insertDonorSchema = createInsertSchema(donors).omit({
  id: true,
  credits: true,
  totalDonations: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  weight: z.coerce.number().min(30).max(200),
  lastDonationDate: z.coerce.date().nullable().optional(),
});

export const insertBloodRequestSchema = createInsertSchema(bloodRequests).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
}).extend({
  donationDate: z.coerce.date(),
});

// NEW: Request responses table
export const requestResponses = pgTable("request_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => bloodRequests.id),
  donorId: varchar("donor_id").notNull().references(() => donors.id),
  status: varchar("status", { enum: ["accepted", "rejected"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schema for responses
export const insertRequestResponseSchema = createInsertSchema(requestResponses).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Donor = typeof donors.$inferSelect;
export type InsertDonor = z.infer<typeof insertDonorSchema>;
export type BloodRequest = typeof bloodRequests.$inferSelect;
export type InsertBloodRequest = z.infer<typeof insertBloodRequestSchema>;
export type Donation = typeof donations.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type RequestResponse = typeof requestResponses.$inferSelect;
export type InsertRequestResponse = z.infer<typeof insertRequestResponseSchema>;
