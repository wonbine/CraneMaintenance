import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const cranes = pgTable("cranes", {
  id: serial("id").primaryKey(),
  craneId: text("crane_id").notNull().unique(),
  craneName: text("crane_name"), // CraneName from CraneList sheet
  plantSection: text("plant_section"), // Plant/Section from CraneList sheet
  status: text("status").notNull(), // 'operating', 'maintenance', 'urgent'
  location: text("location").notNull(),
  model: text("model").notNull(),
  grade: text("grade"), // Grade field
  driveType: text("drive_type"), // DriveType field
  unmannedOperation: text("unmanned_operation"), // UnmannedOperation field
  installationDate: text("installation_date"), // InstallationDate from CraneList
  inspectionReferenceDate: text("inspection_reference_date"), // InspectionReferenceDate from CraneList
  inspectionCycle: integer("inspection_cycle"), // InspectionCycle from CraneList (days)
  leadTime: integer("lead_time"), // LeadTime from CraneList (days)
  lastMaintenanceDate: text("last_maintenance_date"),
  nextMaintenanceDate: text("next_maintenance_date"),
  isUrgent: boolean("is_urgent").default(false),
});

export const failureRecords = pgTable("failure_records", {
  id: serial("id").primaryKey(),
  craneId: text("crane_id").notNull(),
  date: text("date").notNull(),
  failureType: text("failure_type").notNull(), // 'hydraulic', 'electrical', 'mechanical', 'structural'
  description: text("description").notNull(),
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  downtime: integer("downtime"), // in hours
  cause: text("cause"),
  reportedBy: text("reported_by"),
  data: numeric("data"), // failure interval in days
  worktime: numeric("worktime"), // work time in hours
  byDevice: text("by_device"), // device/equipment type causing the failure
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
  relatedFailureId: integer("related_failure_id"), // reference to failure record if applicable
  workOrder: text("work_order"),
  taskName: text("task_name"),
  actualStartDateTime: text("actual_start_date_time"),
  actualEndDateTime: text("actual_end_date_time"),
  totalWorkers: integer("total_workers"),
  totalWorkTime: numeric("total_work_time"),
  areaName: text("area_name"),
  equipmentName: text("equipment_name"),
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

export const insertFailureRecordSchema = createInsertSchema(failureRecords).omit({
  id: true,
});

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({
  id: true,
}).extend({
  workOrder: z.string().optional(),
  taskName: z.string().optional(),
  actualStartDateTime: z.string().optional(),
  actualEndDateTime: z.string().optional(),
  totalWorkers: z.number().optional(),
  totalWorkTime: z.number().optional(),
  areaName: z.string().optional(),
  equipmentName: z.string().optional(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
});

export type Crane = typeof cranes.$inferSelect;
export type InsertCrane = z.infer<typeof insertCraneSchema>;
export type FailureRecord = typeof failureRecords.$inferSelect;
export type InsertFailureRecord = z.infer<typeof insertFailureRecordSchema>;
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
