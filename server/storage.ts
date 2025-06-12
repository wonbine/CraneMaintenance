import { 
  cranes, 
  failureRecords,
  maintenanceRecords, 
  alerts,
  type Crane, 
  type InsertCrane,
  type FailureRecord,
  type InsertFailureRecord,
  type MaintenanceRecord,
  type InsertMaintenanceRecord,
  type Alert,
  type InsertAlert,
  type DashboardSummary,
  type MaintenanceStats,
  type MonthlyTrend
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Crane operations
  getCranes(): Promise<Crane[]>;
  getCrane(id: number): Promise<Crane | undefined>;
  getCraneByCraneId(craneId: string): Promise<Crane | undefined>;
  createCrane(crane: InsertCrane): Promise<Crane>;
  updateCrane(id: number, crane: Partial<InsertCrane>): Promise<Crane | undefined>;
  
  // Failure record operations
  getFailureRecords(): Promise<FailureRecord[]>;
  getFailureRecord(id: number): Promise<FailureRecord | undefined>;
  getFailureRecordsByCraneId(craneId: string): Promise<FailureRecord[]>;
  createFailureRecord(record: InsertFailureRecord): Promise<FailureRecord>;
  
  // Maintenance record operations
  getMaintenanceRecords(): Promise<MaintenanceRecord[]>;
  getMaintenanceRecord(id: number): Promise<MaintenanceRecord | undefined>;
  getMaintenanceRecordsByCraneId(craneId: string): Promise<MaintenanceRecord[]>;
  createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord>;
  
  // Alert operations
  getAlerts(): Promise<Alert[]>;
  getActiveAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  deactivateAlert(id: number): Promise<void>;
  
  // Dashboard analytics
  getDashboardSummary(): Promise<DashboardSummary>;
  getMaintenanceStats(): Promise<MaintenanceStats[]>;
  getFailureStats(): Promise<MaintenanceStats[]>;
  getMonthlyTrends(): Promise<MonthlyTrend[]>;
  
  // Factory and crane filters
  getUniqueFactories(): Promise<string[]>;
  getUniqueCraneNames(): Promise<string[]>;
  getCranesByFactoryAndName(factory?: string, craneName?: string): Promise<Crane[]>;
  
  // Google Sheets sync
  syncDataFromSheets(cranesData: any[], failureData: any[], maintenanceData: any[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private cranes: Map<number, Crane>;
  private failureRecords: Map<number, FailureRecord>;
  private maintenanceRecords: Map<number, MaintenanceRecord>;
  private alerts: Map<number, Alert>;
  private currentCraneId: number;
  private currentFailureId: number;
  private currentMaintenanceId: number;
  private currentAlertId: number;

  constructor() {
    this.cranes = new Map();
    this.failureRecords = new Map();
    this.maintenanceRecords = new Map();
    this.alerts = new Map();
    this.currentCraneId = 1;
    this.currentFailureId = 1;
    this.currentMaintenanceId = 1;
    this.currentAlertId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Sample crane data
    const sampleCranes = [
      {
        craneId: "CR-001",
        status: "operating",
        location: "Warehouse A",
        model: "Liebherr LTM 1030",
        lastMaintenanceDate: "2024-05-15",
        nextMaintenanceDate: "2024-06-15",
        isUrgent: false
      },
      {
        craneId: "CR-002", 
        status: "maintenance",
        location: "Dock B",
        model: "Manitowoc 18000",
        lastMaintenanceDate: "2024-05-20",
        nextMaintenanceDate: "2024-06-10",
        isUrgent: false
      },
      {
        craneId: "CR-003",
        status: "operating", 
        location: "Yard C",
        model: "Terex RT780",
        lastMaintenanceDate: "2024-05-10",
        nextMaintenanceDate: "2024-06-05",
        isUrgent: true
      },
      {
        craneId: "CR-004",
        status: "urgent",
        location: "Storage D", 
        model: "Liebherr LTM 1055",
        lastMaintenanceDate: "2024-04-30",
        nextMaintenanceDate: "2024-05-30",
        isUrgent: true
      },
      {
        craneId: "CR-005",
        status: "operating",
        location: "Port E",
        model: "Grove GMK4100L", 
        lastMaintenanceDate: "2024-05-18",
        nextMaintenanceDate: "2024-06-18",
        isUrgent: false
      }
    ];

    // Sample failure records
    const sampleFailureRecords = [
      {
        craneId: "CR-002",
        date: "2024-05-19",
        failureType: "hydraulic",
        description: "Hydraulic pump failure causing loss of lifting capacity",
        severity: "high",
        downtime: 24,
        cause: "Seal wear and contamination",
        reportedBy: "Operations Team"
      },
      {
        craneId: "CR-004",
        date: "2024-04-29",
        failureType: "electrical",
        description: "Main control circuit breaker tripped repeatedly",
        severity: "critical",
        downtime: 48,
        cause: "Overload due to worn motor bearings",
        reportedBy: "Site Supervisor"
      },
      {
        craneId: "CR-003",
        date: "2024-04-24",
        failureType: "mechanical",
        description: "Wire rope showing signs of wear and fraying",
        severity: "medium",
        downtime: 12,
        cause: "Normal wear exceeding replacement interval",
        reportedBy: "Safety Inspector"
      }
    ];

    // Sample maintenance records
    const sampleMaintenanceRecords = [
      {
        craneId: "CR-001",
        date: "2024-05-15",
        type: "routine",
        technician: "John Smith",
        status: "completed",
        notes: "Regular inspection and lubrication",
        duration: 4,
        cost: 25000
      },
      {
        craneId: "CR-002",
        date: "2024-05-20", 
        type: "repair",
        technician: "Mike Johnson",
        status: "in_progress",
        notes: "Hydraulic system repair",
        duration: 8,
        cost: 75000
      },
      {
        craneId: "CR-003",
        date: "2024-05-10",
        type: "preventive",
        technician: "Sarah Wilson",
        status: "completed", 
        notes: "Brake system check",
        duration: 2,
        cost: 15000
      },
      {
        craneId: "CR-004",
        date: "2024-04-30",
        type: "emergency",
        technician: "Tom Brown", 
        status: "completed",
        notes: "Emergency cable replacement",
        duration: 12,
        cost: 120000
      },
      {
        craneId: "CR-005",
        date: "2024-05-18",
        type: "inspection",
        technician: "Lisa Davis",
        status: "completed",
        notes: "Safety inspection",
        duration: 3,
        cost: 18000
      },
      {
        craneId: "CR-001",
        date: "2024-04-15",
        type: "routine", 
        technician: "John Smith",
        status: "completed",
        notes: "Monthly maintenance check",
        duration: 3,
        cost: 20000
      },
      {
        craneId: "CR-003",
        date: "2024-04-25",
        type: "repair",
        technician: "Mike Johnson",
        status: "completed",
        notes: "Wire rope replacement",
        duration: 6,
        cost: 45000
      }
    ];

    // Create cranes
    for (const crane of sampleCranes) {
      await this.createCrane(crane);
    }

    // Create failure records
    for (const record of sampleFailureRecords) {
      await this.createFailureRecord(record);
    }

    // Create maintenance records
    for (const record of sampleMaintenanceRecords) {
      await this.createMaintenanceRecord(record);
    }

    // Generate alerts
    await this.generateAlerts();
  }

  async getCranes(): Promise<Crane[]> {
    return Array.from(this.cranes.values());
  }

  async getCrane(id: number): Promise<Crane | undefined> {
    return this.cranes.get(id);
  }

  async getCraneByCraneId(craneId: string): Promise<Crane | undefined> {
    return Array.from(this.cranes.values()).find(crane => crane.craneId === craneId);
  }

  async createCrane(insertCrane: InsertCrane): Promise<Crane> {
    const id = this.currentCraneId++;
    const crane: Crane = { 
      id,
      craneId: insertCrane.craneId,
      craneName: insertCrane.craneName || null,
      plantSection: insertCrane.plantSection || null,
      status: insertCrane.status,
      location: insertCrane.location,
      model: insertCrane.model,
      grade: insertCrane.grade || null,
      driveType: insertCrane.driveType || null,
      unmannedOperation: insertCrane.unmannedOperation || null,
      lastMaintenanceDate: insertCrane.lastMaintenanceDate || null,
      nextMaintenanceDate: insertCrane.nextMaintenanceDate || null,
      isUrgent: insertCrane.isUrgent || false
    };
    this.cranes.set(id, crane);
    return crane;
  }

  async updateCrane(id: number, updates: Partial<InsertCrane>): Promise<Crane | undefined> {
    const existing = this.cranes.get(id);
    if (!existing) return undefined;
    
    const updated: Crane = { ...existing, ...updates };
    this.cranes.set(id, updated);
    return updated;
  }

  async getFailureRecords(): Promise<FailureRecord[]> {
    return Array.from(this.failureRecords.values());
  }

  async getFailureRecord(id: number): Promise<FailureRecord | undefined> {
    return this.failureRecords.get(id);
  }

  async getFailureRecordsByCraneId(craneId: string): Promise<FailureRecord[]> {
    return Array.from(this.failureRecords.values())
      .filter(record => record.craneId === craneId);
  }

  async createFailureRecord(insertRecord: InsertFailureRecord): Promise<FailureRecord> {
    const id = this.currentFailureId++;
    const record: FailureRecord = { 
      ...insertRecord, 
      id,
      downtime: insertRecord.downtime || null,
      cause: insertRecord.cause || null,
      reportedBy: insertRecord.reportedBy || null
    };
    this.failureRecords.set(id, record);
    return record;
  }

  async getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    return Array.from(this.maintenanceRecords.values());
  }

  async getMaintenanceRecord(id: number): Promise<MaintenanceRecord | undefined> {
    return this.maintenanceRecords.get(id);
  }

  async getMaintenanceRecordsByCraneId(craneId: string): Promise<MaintenanceRecord[]> {
    return Array.from(this.maintenanceRecords.values())
      .filter(record => record.craneId === craneId);
  }

  async createMaintenanceRecord(insertRecord: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const id = this.currentMaintenanceId++;
    const record: MaintenanceRecord = { 
      ...insertRecord, 
      id,
      notes: insertRecord.notes || null,
      duration: insertRecord.duration || null,
      cost: insertRecord.cost || null,
      relatedFailureId: insertRecord.relatedFailureId || null
    };
    this.maintenanceRecords.set(id, record);
    return record;
  }

  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.isActive);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.currentAlertId++;
    const alert: Alert = { 
      ...insertAlert, 
      id,
      isActive: insertAlert.isActive !== undefined ? insertAlert.isActive : true
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async deactivateAlert(id: number): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) {
      this.alerts.set(id, { ...alert, isActive: false });
    }
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const allCranes = Array.from(this.cranes.values());
    
    return {
      totalCranes: allCranes.length,
      operatingCranes: allCranes.filter(c => c.status === 'operating').length,
      maintenanceCranes: allCranes.filter(c => c.status === 'maintenance').length,
      urgentCranes: allCranes.filter(c => c.status === 'urgent' || c.isUrgent).length,
    };
  }

  async getMaintenanceStats(): Promise<MaintenanceStats[]> {
    const records = Array.from(this.maintenanceRecords.values());
    const stats = new Map<string, number>();
    
    records.forEach(record => {
      const count = stats.get(record.type) || 0;
      stats.set(record.type, count + 1);
    });
    
    return Array.from(stats.entries()).map(([type, count]) => ({ type, count }));
  }

  async getFailureStats(): Promise<MaintenanceStats[]> {
    const records = Array.from(this.failureRecords.values());
    const stats = new Map<string, number>();
    
    records.forEach(record => {
      const count = stats.get(record.failureType) || 0;
      stats.set(record.failureType, count + 1);
    });
    
    return Array.from(stats.entries()).map(([type, count]) => ({ type, count }));
  }

  async getMonthlyTrends(): Promise<MonthlyTrend[]> {
    const records = Array.from(this.maintenanceRecords.values());
    const trends = new Map<string, number>();
    
    records.forEach(record => {
      const date = new Date(record.date);
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      const count = trends.get(monthKey) || 0;
      trends.set(monthKey, count + 1);
    });
    
    return Array.from(trends.entries()).map(([month, count]) => ({ month, count }));
  }

  async getUniqueFactories(): Promise<string[]> {
    const factories = new Set<string>();
    Array.from(this.cranes.values()).forEach(crane => {
      if (crane.plantSection) {
        factories.add(crane.plantSection);
      }
    });
    return Array.from(factories).sort();
  }

  async getUniqueCraneNames(): Promise<string[]> {
    const craneNames = new Set<string>();
    Array.from(this.cranes.values()).forEach(crane => {
      if (crane.craneName) {
        craneNames.add(crane.craneName);
      }
    });
    return Array.from(craneNames).sort();
  }

  async getCranesByFactoryAndName(factory?: string, craneName?: string): Promise<Crane[]> {
    let cranes = Array.from(this.cranes.values());
    
    if (factory) {
      cranes = cranes.filter(crane => crane.plantSection === factory);
    }
    
    if (craneName) {
      cranes = cranes.filter(crane => crane.craneName === craneName);
    }
    
    return cranes;
  }

  async syncDataFromSheets(cranesData: any[], failureData: any[], maintenanceData: any[]): Promise<void> {
    // Clear existing data
    this.cranes.clear();
    this.failureRecords.clear();
    this.maintenanceRecords.clear();
    this.alerts.clear();
    
    // Reset counters
    this.currentCraneId = 1;
    this.currentFailureId = 1;
    this.currentMaintenanceId = 1;
    this.currentAlertId = 1;
    
    // Process cranes data
    for (const data of cranesData) {
      if (data.crane_id) {
        await this.createCrane({
          craneId: data.crane_id,
          craneName: data.crane_name || data.CraneName || null,
          plantSection: data.plant_section || data['Plant/Section'] || null,
          status: data.status || 'operating',
          location: data.location || '',
          model: data.model || '',
          lastMaintenanceDate: data.last_maintenance_date || null,
          nextMaintenanceDate: data.next_maintenance_date || null,
          isUrgent: data.is_urgent === 'true' || data.is_urgent === true,
        });
      }
    }
    
    // Process failure records
    for (const data of failureData) {
      if (data.crane_id && data.date) {
        await this.createFailureRecord({
          craneId: data.crane_id,
          date: data.date,
          failureType: data.failure_type || 'mechanical',
          description: data.description || '',
          severity: data.severity || 'medium',
          downtime: data.downtime ? parseInt(data.downtime) : null,
          cause: data.cause || null,
          reportedBy: data.reported_by || null,
        });
      }
    }
    
    // Process maintenance records
    for (const data of maintenanceData) {
      if (data.crane_id && data.date) {
        await this.createMaintenanceRecord({
          craneId: data.crane_id,
          date: data.date,
          type: data.type || 'routine',
          technician: data.technician || '',
          status: data.status || 'completed',
          notes: data.notes || null,
          duration: data.duration ? parseInt(data.duration) : null,
          cost: data.cost ? parseInt(data.cost) : null,
          relatedFailureId: data.related_failure_id ? parseInt(data.related_failure_id) : null,
        });
      }
    }
    
    // Generate alerts based on data
    await this.generateAlerts();
  }
  
  private async generateAlerts(): Promise<void> {
    const cranes = Array.from(this.cranes.values());
    const now = new Date();
    
    for (const crane of cranes) {
      // Check for overdue maintenance
      if (crane.nextMaintenanceDate) {
        const nextDate = new Date(crane.nextMaintenanceDate);
        if (nextDate < now) {
          const daysPastDue = Math.floor((now.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
          await this.createAlert({
            craneId: crane.craneId,
            type: 'overdue',
            message: `Crane ${crane.craneId} is ${daysPastDue} days overdue for maintenance`,
            severity: daysPastDue > 7 ? 'critical' : 'high',
            isActive: true,
            createdAt: now.toISOString(),
          });
        } else {
          // Check for maintenance due soon
          const daysUntilDue = Math.floor((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 3) {
            await this.createAlert({
              craneId: crane.craneId,
              type: 'due_soon',
              message: `Crane ${crane.craneId} has maintenance due in ${daysUntilDue} days`,
              severity: 'medium',
              isActive: true,
              createdAt: now.toISOString(),
            });
          }
        }
      }
      
      // Check for high maintenance frequency
      const recentRecords = Array.from(this.maintenanceRecords.values())
        .filter(record => record.craneId === crane.craneId)
        .filter(record => {
          const recordDate = new Date(record.date);
          const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          return recordDate >= thirtyDaysAgo;
        });
        
      if (recentRecords.length >= 4) {
        await this.createAlert({
          craneId: crane.craneId,
          type: 'high_frequency',
          message: `Crane ${crane.craneId} has required maintenance ${recentRecords.length} times this month`,
          severity: 'medium',
          isActive: true,
          createdAt: now.toISOString(),
        });
      }
    }
  }
}

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  async getCranes(): Promise<Crane[]> {
    return await db.select().from(cranes);
  }

  async getCrane(id: number): Promise<Crane | undefined> {
    const [crane] = await db.select().from(cranes).where(eq(cranes.id, id));
    return crane || undefined;
  }

  async getCraneByCraneId(craneId: string): Promise<Crane | undefined> {
    const [crane] = await db.select().from(cranes).where(eq(cranes.craneId, craneId));
    return crane || undefined;
  }

  async createCrane(insertCrane: InsertCrane): Promise<Crane> {
    const [crane] = await db
      .insert(cranes)
      .values(insertCrane)
      .returning();
    return crane;
  }

  async updateCrane(id: number, updates: Partial<InsertCrane>): Promise<Crane | undefined> {
    const [crane] = await db
      .update(cranes)
      .set(updates)
      .where(eq(cranes.id, id))
      .returning();
    return crane || undefined;
  }

  async getFailureRecords(): Promise<FailureRecord[]> {
    return await db.select().from(failureRecords);
  }

  async getFailureRecord(id: number): Promise<FailureRecord | undefined> {
    const [record] = await db.select().from(failureRecords).where(eq(failureRecords.id, id));
    return record || undefined;
  }

  async getFailureRecordsByCraneId(craneId: string): Promise<FailureRecord[]> {
    return await db.select().from(failureRecords).where(eq(failureRecords.craneId, craneId));
  }

  async createFailureRecord(insertRecord: InsertFailureRecord): Promise<FailureRecord> {
    const [record] = await db
      .insert(failureRecords)
      .values(insertRecord)
      .returning();
    return record;
  }

  async getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    return await db.select().from(maintenanceRecords);
  }

  async getMaintenanceRecord(id: number): Promise<MaintenanceRecord | undefined> {
    const [record] = await db.select().from(maintenanceRecords).where(eq(maintenanceRecords.id, id));
    return record || undefined;
  }

  async getMaintenanceRecordsByCraneId(craneId: string): Promise<MaintenanceRecord[]> {
    return await db.select().from(maintenanceRecords).where(eq(maintenanceRecords.craneId, craneId));
  }

  async createMaintenanceRecord(insertRecord: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const [record] = await db
      .insert(maintenanceRecords)
      .values(insertRecord)
      .returning();
    return record;
  }

  async getAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts);
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).where(eq(alerts.isActive, true));
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db
      .insert(alerts)
      .values(insertAlert)
      .returning();
    return alert;
  }

  async deactivateAlert(id: number): Promise<void> {
    await db
      .update(alerts)
      .set({ isActive: false })
      .where(eq(alerts.id, id));
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const allCranes = await this.getCranes();
    
    return {
      totalCranes: allCranes.length,
      operatingCranes: allCranes.filter(c => c.status === 'operating').length,
      maintenanceCranes: allCranes.filter(c => c.status === 'maintenance').length,
      urgentCranes: allCranes.filter(c => c.status === 'urgent' || c.isUrgent).length,
    };
  }

  async getMaintenanceStats(): Promise<MaintenanceStats[]> {
    const records = await this.getMaintenanceRecords();
    const stats = new Map<string, number>();
    
    records.forEach(record => {
      const count = stats.get(record.type) || 0;
      stats.set(record.type, count + 1);
    });
    
    return Array.from(stats.entries()).map(([type, count]) => ({ type, count }));
  }

  async getFailureStats(): Promise<MaintenanceStats[]> {
    const records = await this.getFailureRecords();
    const stats = new Map<string, number>();
    
    records.forEach(record => {
      const count = stats.get(record.failureType) || 0;
      stats.set(record.failureType, count + 1);
    });
    
    return Array.from(stats.entries()).map(([type, count]) => ({ type, count }));
  }

  async getMonthlyTrends(): Promise<MonthlyTrend[]> {
    const records = await this.getMaintenanceRecords();
    const trends = new Map<string, number>();
    
    records.forEach(record => {
      const date = new Date(record.date);
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      const count = trends.get(monthKey) || 0;
      trends.set(monthKey, count + 1);
    });
    
    return Array.from(trends.entries()).map(([month, count]) => ({ month, count }));
  }

  async getUniqueFactories(): Promise<string[]> {
    const result = await db.selectDistinct({ plantSection: cranes.plantSection }).from(cranes);
    return result.map(r => r.plantSection).filter((section): section is string => Boolean(section)).sort();
  }

  async getUniqueCraneNames(): Promise<string[]> {
    const result = await db.selectDistinct({ craneName: cranes.craneName }).from(cranes);
    return result.map(r => r.craneName).filter((name): name is string => Boolean(name)).sort();
  }

  async getCranesByFactoryAndName(factory?: string, craneName?: string): Promise<Crane[]> {
    if (factory && craneName) {
      return await db.select().from(cranes).where(eq(cranes.plantSection, factory));
    } else if (factory) {
      return await db.select().from(cranes).where(eq(cranes.plantSection, factory));
    } else if (craneName) {
      return await db.select().from(cranes).where(eq(cranes.craneName, craneName));
    }
    
    return await db.select().from(cranes);
  }

  async syncDataFromSheets(cranesData: any[], failureData: any[], maintenanceData: any[]): Promise<void> {
    console.log('Syncing data from sheets...');
    console.log('Cranes data sample:', cranesData.slice(0, 2));
    console.log('Failure data sample:', failureData.slice(0, 2));
    console.log('Maintenance data sample:', maintenanceData.slice(0, 2));
    
    // Clear existing data
    await db.delete(alerts);
    await db.delete(maintenanceRecords);
    await db.delete(failureRecords);
    await db.delete(cranes);
    
    // Process cranes data - handle both EquipmentCode and crane_id field names
    for (const data of cranesData) {
      const equipmentCode = data.EquipmentCode || data.crane_id || data.CraneID || data.equipment_code;
      if (equipmentCode) {
        // Extract exact Plant/Section data preserving original format - handle typo in column name
        const plantSection = data['Plant/Secsion'] || data['Plant/Section'] || data.PlantSection || data.plant_section || data['공장'] || data.Factory;
        const craneName = data.CraneName || data.crane_name || data.Name || data.name || data['크레인명'];
        
        console.log('Extracting Plant/Section for', equipmentCode);
        console.log('Plant/Section value:', plantSection);
        console.log('CraneName value:', craneName);
        console.log('Available columns:', Object.keys(data));
        
        await this.createCrane({
          craneId: equipmentCode,
          craneName: craneName,
          plantSection: plantSection,
          status: data.Status || data.status || 'operating',
          location: data.Location || data.location || '',
          model: data.Model || data.model || '',
          lastMaintenanceDate: data.LastMaintenanceDate || data.last_maintenance_date || null,
          nextMaintenanceDate: data.NextMaintenanceDate || data.next_maintenance_date || null,
          isUrgent: (data.IsUrgent || data.is_urgent) === 'true' || (data.IsUrgent || data.is_urgent) === true,
          grade: data.Grade || data.grade || null,
          driveType: data.DriveType || data.drive_type || data['운전방식'] || null,
          unmannedOperation: data.UnmannedOperation || data.unmanned_operation || data['유무인'] || null,
          installationDate: data.InstallationDate || data.installation_date || null,
          inspectionReferenceDate: data.InspectionReferenceDate || data.inspection_reference_date || null,
          inspectionCycle: data.InspectionCycle ? parseInt(data.InspectionCycle) : (data.inspection_cycle ? parseInt(data.inspection_cycle) : null),
          leadTime: data['LeadTime\n(Days)'] ? parseInt(data['LeadTime\n(Days)']) : (data.LeadTime ? parseInt(data.LeadTime) : (data.lead_time ? parseInt(data.lead_time) : null)),
        });
      }
    }
    
    // Process failure records - handle EquipmentCode field
    for (const data of failureData) {
      const equipmentCode = data.EquipmentCode || data.crane_id || data.CraneID || data.equipment_code;
      const date = data.Date || data.date || data.FailureDate || data.failure_date;
      if (equipmentCode && date) {
        console.log('Processing failure record:', equipmentCode, date);
        await this.createFailureRecord({
          craneId: equipmentCode,
          date: date,
          failureType: data.FailureType || data.failure_type || 'mechanical',
          description: data.Description || data.description || '',
          severity: data.Severity || data.severity || 'medium',
          downtime: data.Downtime ? parseInt(data.Downtime) : (data.downtime ? parseInt(data.downtime) : null),
          cause: data.Cause || data.cause || null,
          reportedBy: data.ReportedBy || data.reported_by || null,
        });
      }
    }
    
    // Process maintenance records - handle EquipmentCode field
    for (const data of maintenanceData) {
      const equipmentCode = data.EquipmentCode || data.crane_id || data.CraneID || data.equipment_code;
      const date = data.Date || data.date || data.MaintenanceDate || data.maintenance_date;
      if (equipmentCode && date) {
        console.log('Processing maintenance record:', equipmentCode, date);
        await this.createMaintenanceRecord({
          craneId: equipmentCode,
          date: date,
          type: data.Type || data.type || 'routine',
          technician: data.Technician || data.technician || '',
          status: data.Status || data.status || 'completed',
          notes: data.Notes || data.notes || null,
          duration: data.Duration ? parseInt(data.Duration) : (data.duration ? parseInt(data.duration) : null),
          cost: data.Cost ? parseInt(data.Cost) : (data.cost ? parseInt(data.cost) : null),
          relatedFailureId: data.RelatedFailureId ? parseInt(data.RelatedFailureId) : (data.related_failure_id ? parseInt(data.related_failure_id) : null),
        });
      }
    }
    
    console.log('Data sync completed, generating alerts...');
    // Generate alerts based on data
    await this.generateAlerts();
  }
  
  private async generateAlerts(): Promise<void> {
    const cranes = await this.getCranes();
    const now = new Date();
    
    for (const crane of cranes) {
      // Check for overdue maintenance
      if (crane.nextMaintenanceDate) {
        const nextDate = new Date(crane.nextMaintenanceDate);
        if (nextDate < now) {
          const daysPastDue = Math.floor((now.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
          await this.createAlert({
            craneId: crane.craneId,
            type: 'overdue',
            message: `Crane ${crane.craneId} is ${daysPastDue} days overdue for maintenance`,
            severity: daysPastDue > 7 ? 'critical' : 'high',
            isActive: true,
            createdAt: now.toISOString(),
          });
        } else {
          // Check for maintenance due soon
          const daysUntilDue = Math.floor((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 3) {
            await this.createAlert({
              craneId: crane.craneId,
              type: 'due_soon',
              message: `Crane ${crane.craneId} has maintenance due in ${daysUntilDue} days`,
              severity: 'medium',
              isActive: true,
              createdAt: now.toISOString(),
            });
          }
        }
      }
      
      // Check for high maintenance frequency
      const recentRecords = await this.getMaintenanceRecordsByCraneId(crane.craneId);
      const recentFailures = recentRecords.filter(record => {
        const recordDate = new Date(record.date);
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        return recordDate >= thirtyDaysAgo;
      });
        
      if (recentFailures.length >= 4) {
        await this.createAlert({
          craneId: crane.craneId,
          type: 'high_frequency',
          message: `Crane ${crane.craneId} has required maintenance ${recentFailures.length} times this month`,
          severity: 'medium',
          isActive: true,
          createdAt: now.toISOString(),
        });
      }
    }
  }
}

export const storage = new DatabaseStorage();
