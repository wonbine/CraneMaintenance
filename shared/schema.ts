import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const cranes = pgTable("cranes", {
  id: serial("id").primaryKey(),
  craneId: text("crane_id").notNull().unique(),
  status: text("status").notNull(), // 'operating', 'maintenance', 'urgent'
  location: text("location").notNull(),
  model: text("model").notNull(),
  lastMaintenanceDate: text("last_maintenance_date"),
  nextMaintenanceDate: text("next_maintenance_date"),
  isUrgent: boolean("is_urgent").default(false),
});

export const maintenanceRecords = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  craneId: text("crane_id").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull(), // 'routine', 'emergency', 'preventive', 'repair', 'inspection'
  technician: text("technician").notNull(),
  status: text("status").notNull(), // 'completed', 'in_progress', 'scheduled'
  notes: text("notes"),
  duration: integer("duration"), // in hours
  cost: integer("cost"), // in cents
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  craneId: text("crane_id").notNull(),
  type: text("type").notNull(), // 'overdue', 'due_soon', 'high_frequency'
  message: text("message").notNull(),
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  isActive: boolean("is_active").default(true),
  createdAt: text("created_at").notNull(),
});

export const insertCraneSchema = createInsertSchema(cranes).omit({
  id: true,
});

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({
  id: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
});

export type Crane = typeof cranes.$inferSelect;
export type InsertCrane = z.infer<typeof insertCraneSchema>;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

// Dashboard summary types
export type DashboardSummary = {
  totalCranes: number;
  operatingCranes: number;
  maintenanceCranes: number;
  urgentCranes: number;
};

export type MaintenanceStats = {
  type: string;
  count: number;
};

export type MonthlyTrend = {
  month: string;
  count: number;
};
