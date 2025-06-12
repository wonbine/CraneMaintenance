import { 
  cranes, 
  maintenanceRecords, 
  alerts,
  type Crane, 
  type InsertCrane,
  type MaintenanceRecord,
  type InsertMaintenanceRecord,
  type Alert,
  type InsertAlert,
  type DashboardSummary,
  type MaintenanceStats,
  type MonthlyTrend
} from "@shared/schema";

export interface IStorage {
  // Crane operations
  getCranes(): Promise<Crane[]>;
  getCrane(id: number): Promise<Crane | undefined>;
  getCraneByCraneId(craneId: string): Promise<Crane | undefined>;
  createCrane(crane: InsertCrane): Promise<Crane>;
  updateCrane(id: number, crane: Partial<InsertCrane>): Promise<Crane | undefined>;
  
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
  getMonthlyTrends(): Promise<MonthlyTrend[]>;
  
  // Google Sheets sync
  syncDataFromSheets(cranesData: any[], maintenanceData: any[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private cranes: Map<number, Crane>;
  private maintenanceRecords: Map<number, MaintenanceRecord>;
  private alerts: Map<number, Alert>;
  private currentCraneId: number;
  private currentMaintenanceId: number;
  private currentAlertId: number;

  constructor() {
    this.cranes = new Map();
    this.maintenanceRecords = new Map();
    this.alerts = new Map();
    this.currentCraneId = 1;
    this.currentMaintenanceId = 1;
    this.currentAlertId = 1;
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
      ...insertCrane, 
      id,
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
      cost: insertRecord.cost || null
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

  async syncDataFromSheets(cranesData: any[], maintenanceData: any[]): Promise<void> {
    // Clear existing data
    this.cranes.clear();
    this.maintenanceRecords.clear();
    this.alerts.clear();
    
    // Reset counters
    this.currentCraneId = 1;
    this.currentMaintenanceId = 1;
    this.currentAlertId = 1;
    
    // Process cranes data
    for (const data of cranesData) {
      if (data.crane_id) {
        await this.createCrane({
          craneId: data.crane_id,
          status: data.status || 'operating',
          location: data.location || '',
          model: data.model || '',
          lastMaintenanceDate: data.last_maintenance_date || null,
          nextMaintenanceDate: data.next_maintenance_date || null,
          isUrgent: data.is_urgent === 'true' || data.is_urgent === true,
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

export const storage = new MemStorage();
