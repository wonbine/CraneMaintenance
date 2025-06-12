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
  type MonthlyTrend,
  type FactoryOverview,
  type SystemOverview,
  type CraneGradeStats,
  type OperationTypeStats
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNotNull } from "drizzle-orm";
import { cache } from "./cache";

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
  getMonthlyFailureStats(craneId?: string, factory?: string): Promise<MonthlyTrend[]>;
  getMonthlyRepairTimeStats(craneId?: string, factory?: string): Promise<{ month: string; avgRepairTime: number }[]>;
  
  // Factory and crane filters
  getUniqueFactories(): Promise<string[]>;
  getUniqueCraneNames(): Promise<string[]>;
  getCranesByFactoryAndName(factory?: string, craneName?: string): Promise<Crane[]>;
  
  // Google Sheets sync
  syncDataFromSheets(cranesData: any[], failureData: any[], maintenanceData: any[]): Promise<void>;
  
  // Factory and system overview
  getFactoryOverview(): Promise<FactoryOverview[]>;
  getSystemOverview(): Promise<SystemOverview>;
  getCraneGradeStats(): Promise<CraneGradeStats[]>;
  getOperationTypeStats(): Promise<OperationTypeStats>;
  
  // Recent maintenance statistics
  getRecentMaintenanceStats(): Promise<{ month: string; failureCount: number; maintenanceCount: number; total: number }[]>;
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

    // Sample failure records with device information
    const sampleFailureRecords = [
      {
        craneId: "CR-002",
        date: "2024-05-19",
        failureType: "hydraulic",
        description: "Hydraulic pump failure causing loss of lifting capacity",
        severity: "high",
        downtime: 24,
        cause: "Seal wear and contamination",
        reportedBy: "Operations Team",
        byDevice: "유압펌프"
      },
      {
        craneId: "CR-004",
        date: "2024-04-29",
        failureType: "electrical",
        description: "Main control circuit breaker tripped repeatedly",
        severity: "critical",
        downtime: 48,
        cause: "Overload due to worn motor bearings",
        reportedBy: "Site Supervisor",
        byDevice: "제어회로"
      },
      {
        craneId: "CR-003",
        date: "2024-04-24",
        failureType: "mechanical",
        description: "Wire rope showing signs of wear and fraying",
        severity: "medium",
        downtime: 12,
        cause: "Normal wear exceeding replacement interval",
        reportedBy: "Safety Inspector",
        byDevice: "와이어로프"
      },
      {
        craneId: "CR-002",
        date: "2024-05-10",
        failureType: "electrical",
        description: "Motor overheating during operation",
        severity: "high",
        downtime: 18,
        cause: "Insufficient cooling system maintenance",
        reportedBy: "Operations Team",
        byDevice: "구동모터"
      },
      {
        craneId: "CR-003",
        date: "2024-05-05",
        failureType: "hydraulic",
        description: "Hydraulic fluid leak in main cylinder",
        severity: "medium",
        downtime: 6,
        cause: "Worn seal in hydraulic cylinder",
        reportedBy: "Maintenance Team",
        byDevice: "유압실린더"
      },
      {
        craneId: "CR-004",
        date: "2024-04-20",
        failureType: "mechanical",
        description: "Brake system malfunction",
        severity: "critical",
        downtime: 36,
        cause: "Brake pad wear beyond safety limits",
        reportedBy: "Safety Inspector",
        byDevice: "브레이크시스템"
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
      installationDate: insertCrane.installationDate || null,
      inspectionReferenceDate: insertCrane.inspectionReferenceDate || null,
      inspectionCycle: insertCrane.inspectionCycle || null,
      leadTime: insertCrane.leadTime || null,
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
      data: insertRecord.data || null,
      worktime: insertRecord.worktime || null,
      downtime: insertRecord.downtime || null,
      cause: insertRecord.cause || null,
      reportedBy: insertRecord.reportedBy || null,
      byDevice: insertRecord.byDevice || null
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
      relatedFailureId: insertRecord.relatedFailureId || null,
      workOrder: insertRecord.workOrder || null,
      taskName: insertRecord.taskName || null,
      actualStartDateTime: insertRecord.actualStartDateTime || null,
      actualEndDateTime: insertRecord.actualEndDateTime || null,
      totalWorkers: insertRecord.totalWorkers || null,
      totalWorkTime: insertRecord.totalWorkTime || null,
      areaName: insertRecord.areaName || null,
      equipmentName: insertRecord.equipmentName || null
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

  async getMonthlyFailureStats(craneId?: string, factory?: string): Promise<MonthlyTrend[]> {
    let records = Array.from(this.failureRecords.values());
    
    // Filter by crane if specified
    if (craneId && craneId !== 'all') {
      records = records.filter(record => record.craneId === craneId);
    }
    
    // Filter by factory if specified
    if (factory && factory !== 'all') {
      const cranesList = Array.from(this.cranes.values());
      const factoryCranes = cranesList.filter(crane => crane.plantSection === factory);
      const factoryCraneIds = factoryCranes.map(crane => crane.craneId);
      records = records.filter(record => factoryCraneIds.includes(record.craneId));
    }
    
    const trends = new Map<string, number>();
    
    records.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const count = trends.get(monthKey) || 0;
      trends.set(monthKey, count + 1);
    });
    
    // Sort by month and format for display
    return Array.from(trends.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('ko-KR', { month: 'short' });
        return { month: `${year}년 ${monthName}`, count };
      });
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

  async getMonthlyRepairTimeStats(craneId?: string, factory?: string): Promise<{ month: string; avgRepairTime: number }[]> {
    let records = Array.from(this.maintenanceRecords.values());
    
    // Filter by crane if specified
    if (craneId && craneId !== 'all') {
      records = records.filter(record => record.craneId === craneId);
    }
    
    // Filter by factory if specified
    if (factory && factory !== 'all') {
      const cranesList = Array.from(this.cranes.values());
      const factoryCranes = cranesList.filter(crane => crane.plantSection === factory);
      const factoryCraneIds = factoryCranes.map(crane => crane.craneId);
      records = records.filter(record => factoryCraneIds.includes(record.craneId));
    }
    
    const monthlyData = new Map<string, { totalTime: number; count: number }>();
    
    records.forEach(record => {
      // Only include records with valid totalWorkTime
      if (record.totalWorkTime && record.totalWorkTime > 0) {
        const date = new Date(record.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const existing = monthlyData.get(monthKey) || { totalTime: 0, count: 0 };
        existing.totalTime += record.totalWorkTime;
        existing.count += 1;
        monthlyData.set(monthKey, existing);
      }
    });
    
    // Calculate averages and format for display
    return Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('ko-KR', { month: 'short' });
        return { 
          month: `${year}년 ${monthName}`, 
          avgRepairTime: Math.round((data.totalTime / data.count) * 10) / 10 
        };
      });
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

  async getFactoryOverview(): Promise<FactoryOverview[]> {
    const cranes = Array.from(this.cranes.values());
    const factoryMap = new Map<string, { total: number; manned: number; unmanned: number }>();
    
    cranes.forEach(crane => {
      const factory = crane.plantSection || '미분류';
      const existing = factoryMap.get(factory) || { total: 0, manned: 0, unmanned: 0 };
      
      existing.total += 1;
      if (crane.unmannedOperation === '무인' || crane.unmannedOperation === 'Y') {
        existing.unmanned += 1;
      } else {
        existing.manned += 1;
      }
      
      factoryMap.set(factory, existing);
    });
    
    return Array.from(factoryMap.entries()).map(([factoryName, data]) => ({
      factoryName,
      totalCranes: data.total,
      mannedCranes: data.manned,
      unmannedCranes: data.unmanned,
      mannedPercentage: data.total > 0 ? Math.round((data.manned / data.total) * 100) : 0,
      unmannedPercentage: data.total > 0 ? Math.round((data.unmanned / data.total) * 100) : 0
    })).sort((a, b) => b.totalCranes - a.totalCranes);
  }

  async getSystemOverview(): Promise<SystemOverview> {
    const cranes = Array.from(this.cranes.values());
    const factories = new Set(cranes.map(crane => crane.plantSection || '미분류'));
    
    const totalCranes = cranes.length;
    const mannedCranes = cranes.filter(crane => 
      crane.unmannedOperation !== '무인' && crane.unmannedOperation !== 'Y'
    ).length;
    
    return {
      totalFactories: factories.size,
      totalCranes,
      totalMannedPercentage: totalCranes > 0 ? Math.round((mannedCranes / totalCranes) * 100) : 0
    };
  }

  async getCraneGradeStats(): Promise<CraneGradeStats[]> {
    const cranes = Array.from(this.cranes.values());
    const gradeMap = new Map<string, number>();
    
    cranes.forEach(crane => {
      const grade = crane.grade || '미분류';
      gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
    });
    
    const totalCranes = cranes.length;
    
    return Array.from(gradeMap.entries()).map(([grade, count]) => ({
      grade,
      count,
      percentage: totalCranes > 0 ? Math.round((count / totalCranes) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  }

  async getOperationTypeStats(): Promise<OperationTypeStats> {
    const cranes = Array.from(this.cranes.values());
    const totalCranes = cranes.length;
    
    const unmannedCranes = cranes.filter(crane => 
      crane.unmannedOperation === '무인' || crane.unmannedOperation === 'Y'
    ).length;
    const mannedCranes = totalCranes - unmannedCranes;
    
    return {
      manned: mannedCranes,
      unmanned: unmannedCranes,
      mannedPercentage: totalCranes > 0 ? Math.round((mannedCranes / totalCranes) * 100) : 0,
      unmannedPercentage: totalCranes > 0 ? Math.round((unmannedCranes / totalCranes) * 100) : 0
    };
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

  async getRecentMaintenanceStats(): Promise<{ month: string; failureCount: number; maintenanceCount: number; total: number }[]> {
    // Get current date and calculate 6 months ago
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Create map for monthly stats
    const monthlyStats = new Map<string, { failureCount: number; maintenanceCount: number }>();

    // Initialize last 6 months
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyStats.set(monthKey, { failureCount: 0, maintenanceCount: 0 });
    }

    // Count failure records by month
    Array.from(this.failureRecords.values()).forEach(record => {
      if (record.date) {
        const recordDate = new Date(record.date);
        if (recordDate >= sixMonthsAgo) {
          const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
          const stats = monthlyStats.get(monthKey);
          if (stats) {
            stats.failureCount++;
          }
        }
      }
    });

    // Count maintenance records by month
    Array.from(this.maintenanceRecords.values()).forEach(record => {
      if (record.date) {
        const recordDate = new Date(record.date);
        if (recordDate >= sixMonthsAgo) {
          const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
          const stats = monthlyStats.get(monthKey);
          if (stats) {
            stats.maintenanceCount++;
          }
        }
      }
    });

    // Convert to result format and sort by month (oldest first)
    return Array.from(monthlyStats.entries())
      .map(([monthKey, stats]) => ({
        month: monthKey,
        failureCount: stats.failureCount,
        maintenanceCount: stats.maintenanceCount,
        total: stats.failureCount + stats.maintenanceCount
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  async getCranes(): Promise<Crane[]> {
    const cacheKey = 'cranes:all';
    const cached = cache.get<Crane[]>(cacheKey);
    if (cached) return cached;

    const result = await db.select().from(cranes);
    cache.set(cacheKey, result, 2 * 60 * 1000); // Cache for 2 minutes
    return result;
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
    const cacheKey = 'failure-records:all';
    const cached = cache.get<FailureRecord[]>(cacheKey);
    if (cached) return cached;

    const result = await db.select().from(failureRecords);
    cache.set(cacheKey, result, 3 * 60 * 1000); // Cache for 3 minutes
    return result;
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
    const recordToInsert = {
      ...insertRecord,
      workOrder: insertRecord.workOrder || null,
      taskName: insertRecord.taskName || null,
      actualStartDateTime: insertRecord.actualStartDateTime || null,
      actualEndDateTime: insertRecord.actualEndDateTime || null,
      totalWorkers: insertRecord.totalWorkers || null,
      totalWorkTime: insertRecord.totalWorkTime || null,
      areaName: insertRecord.areaName || null,
      equipmentName: insertRecord.equipmentName || null,
      notes: insertRecord.notes || null,
      duration: insertRecord.duration || null,
      cost: insertRecord.cost || null,
      relatedFailureId: insertRecord.relatedFailureId || null
    };
    
    const [record] = await db
      .insert(maintenanceRecords)
      .values(recordToInsert)
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

  async getRepairStats(): Promise<{ totalRepairs: number; averageWorkers: number; averageWorkTime: number }> {
    const records = await this.getMaintenanceRecords();
    
    const totalRepairs = records.length;
    let totalWorkers = 0;
    let totalWorkTime = 0;
    let workersCount = 0;
    let workTimeCount = 0;
    
    records.forEach(record => {
      if (record.totalWorkers && record.totalWorkers > 0) {
        totalWorkers += record.totalWorkers;
        workersCount++;
      }
      if (record.totalWorkTime && record.totalWorkTime > 0) {
        totalWorkTime += parseFloat(record.totalWorkTime.toString());
        workTimeCount++;
      }
    });
    
    return {
      totalRepairs,
      averageWorkers: workersCount > 0 ? Math.round((totalWorkers / workersCount) * 10) / 10 : 0,
      averageWorkTime: workTimeCount > 0 ? Math.round((totalWorkTime / workTimeCount) * 10) / 10 : 0,
    };
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

  async getMonthlyRepairTimeStats(craneId?: string, factory?: string): Promise<{ month: string; avgRepairTime: number }[]> {
    let records = await this.getMaintenanceRecords();
    
    // Filter by crane if specified
    if (craneId && craneId !== 'all') {
      records = records.filter(record => record.craneId === craneId);
    }
    
    // Filter by factory if specified
    if (factory && factory !== 'all') {
      const cranesList = await this.getCranes();
      const factoryCranes = cranesList.filter(crane => crane.plantSection === factory);
      const factoryCraneIds = factoryCranes.map(crane => crane.craneId);
      records = records.filter(record => factoryCraneIds.includes(record.craneId));
    }
    
    const monthlyData = new Map<string, { totalTime: number; count: number }>();
    
    records.forEach(record => {
      // Only include records with valid totalWorkTime
      if (record.totalWorkTime && record.totalWorkTime > 0) {
        const date = new Date(record.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const existing = monthlyData.get(monthKey) || { totalTime: 0, count: 0 };
        existing.totalTime += record.totalWorkTime;
        existing.count += 1;
        monthlyData.set(monthKey, existing);
      }
    });
    
    // Calculate averages and format for display
    return Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('ko-KR', { month: 'short' });
        return { 
          month: `${year}년 ${monthName}`, 
          avgRepairTime: Math.round((data.totalTime / data.count) * 10) / 10 
        };
      });
  }

  async getMonthlyFailureStats(craneId?: string, factory?: string): Promise<MonthlyTrend[]> {
    let records = Array.from(this.failureRecords.values());
    
    // Filter by crane if specified
    if (craneId && craneId !== 'all') {
      records = records.filter(record => record.craneId === craneId);
    }
    
    // Filter by factory if specified
    if (factory && factory !== 'all') {
      const cranesList = Array.from(this.cranes.values());
      const factoryCranes = cranesList.filter(crane => crane.plantSection === factory);
      const factoryCraneIds = factoryCranes.map(crane => crane.craneId);
      records = records.filter(record => factoryCraneIds.includes(record.craneId));
    }
    
    const trends = new Map<string, number>();
    
    records.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const count = trends.get(monthKey) || 0;
      trends.set(monthKey, count + 1);
    });
    
    // Sort by month and format for display
    return Array.from(trends.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('ko-KR', { month: 'short' });
        return { month: `${year}년 ${monthName}`, count };
      });
  }

  async getUniqueFactories(): Promise<string[]> {
    const cacheKey = 'factories:unique';
    const cached = cache.get<string[]>(cacheKey);
    if (cached) return cached;

    const result = await db.selectDistinct({ plantSection: cranes.plantSection }).from(cranes);
    const factories = result.map(r => r.plantSection).filter((section): section is string => Boolean(section)).sort();
    cache.set(cacheKey, factories, 5 * 60 * 1000); // Cache for 5 minutes
    return factories;
  }

  async getUniqueCraneNames(): Promise<string[]> {
    const cacheKey = 'crane-names:unique';
    const cached = cache.get<string[]>(cacheKey);
    if (cached) return cached;

    const result = await db.selectDistinct({ craneName: cranes.craneName }).from(cranes);
    const craneNames = result.map(r => r.craneName).filter((name): name is string => Boolean(name)).sort();
    cache.set(cacheKey, craneNames, 5 * 60 * 1000); // Cache for 5 minutes
    return craneNames;
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
    // Clear relevant cache entries before syncing
    cache.delete('cranes:all');
    cache.delete('failure-records:all');
    cache.delete('maintenance-records:all');
    cache.delete('factories:unique');
    cache.delete('crane-names:unique');
    
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
    console.log(`Processing ${failureData.length} failure records...`);
    for (let i = 0; i < failureData.length; i++) {
      const data = failureData[i];
      // Skip header row
      if (i === 0) continue;
      
      // Map array indices to field names based on the header structure
      const equipmentCode = Array.isArray(data) ? data[14] : (data.EquipmentCode || data.crane_id);
      const date = Array.isArray(data) ? data[0] : (data.date || data.Date);
      const symptom = Array.isArray(data) ? data[6] : (data.symptom || data.Description);
      const worktime = Array.isArray(data) ? data[9] : (data.worktime || data.Worktime);
      const type = Array.isArray(data) ? data[13] : (data.type || data.FailureType);
      const mechanicalElectrical = Array.isArray(data) ? data[11] : (data['Mechanical/Electrical'] || data.category);
      const byDevice = Array.isArray(data) ? data[12] : (data.byDevice || data.ByDevice || data.by_device);
      
      if (equipmentCode && date) {
        console.log('Processing failure record:', equipmentCode, date);
        try {
          await this.createFailureRecord({
            craneId: equipmentCode,
            date: date,
            failureType: type || mechanicalElectrical || 'mechanical',
            description: symptom || '',
            severity: 'medium',
            downtime: null,
            cause: null,
            reportedBy: null,
            data: null,
            worktime: worktime || null,
            byDevice: byDevice || null,
          });
        } catch (error) {
          console.error(`Error creating failure record for ${equipmentCode}:`, error);
        }
      }
    }
    
    // Process maintenance records - handle EquipmentCode field from RepairReport
    console.log(`Processing ${maintenanceData.length} maintenance records...`);
    for (let i = 0; i < maintenanceData.length; i++) {
      const data = maintenanceData[i];
      // Skip header row
      if (i === 0) continue;
      
      // Map array indices to field names based on RepairReport header structure
      // ["workOrder", "taskName", "actualStartDateTime", "actualEndDateTime", "totalWorkers", "totalWorkTime", "areaName", "EquipmentCode", "EquipmentName"]
      const workOrder = Array.isArray(data) ? data[0] : (data.workOrder || data.WorkOrder);
      const taskName = Array.isArray(data) ? data[1] : (data.taskName || data.TaskName);
      const actualStartDateTime = Array.isArray(data) ? data[2] : (data.actualStartDateTime || data.ActualStartDateTime);
      const actualEndDateTime = Array.isArray(data) ? data[3] : (data.actualEndDateTime || data.ActualEndDateTime);
      const totalWorkers = Array.isArray(data) ? data[4] : (data.totalWorkers || data.TotalWorkers);
      const totalWorkTime = Array.isArray(data) ? data[5] : (data.totalWorkTime || data.TotalWorkTime);
      const areaName = Array.isArray(data) ? data[6] : (data.areaName || data.AreaName);
      const equipmentCode = Array.isArray(data) ? data[7] : (data.EquipmentCode || data.equipment_code);
      const equipmentName = Array.isArray(data) ? data[8] : (data.EquipmentName || data.equipment_name);
      
      if (equipmentCode && actualStartDateTime) {
        console.log('Processing maintenance record:', equipmentCode, actualStartDateTime);
        try {
          await this.createMaintenanceRecord({
            craneId: equipmentCode,
            date: actualStartDateTime,
            type: 'repair',
            technician: '',
            status: 'completed',
            notes: taskName || null,
            duration: null,
            cost: null,
            relatedFailureId: null,
            workOrder: workOrder || null,
            taskName: taskName || null,
            actualStartDateTime: actualStartDateTime || null,
            actualEndDateTime: actualEndDateTime || null,
            totalWorkers: totalWorkers ? parseInt(totalWorkers) : null,
            totalWorkTime: totalWorkTime ? parseFloat(totalWorkTime) : null,
            areaName: areaName || null,
            equipmentName: equipmentName || null,
          });
        } catch (error) {
          console.error(`Error creating maintenance record for ${equipmentCode}:`, error);
        }
      }
    }
    
    console.log('Data sync completed, generating alerts...');
    // Generate alerts based on data
    await this.generateAlerts();
  }
  
  async getFactoryOverview(): Promise<FactoryOverview[]> {
    const cacheKey = 'factory-overview';
    const cached = cache.get<FactoryOverview[]>(cacheKey);
    if (cached) return cached;

    const cranes = await this.getCranes();
    const factoryMap = new Map<string, { total: number; manned: number; unmanned: number }>();
    
    cranes.forEach(crane => {
      const factory = crane.plantSection || '미분류';
      const existing = factoryMap.get(factory) || { total: 0, manned: 0, unmanned: 0 };
      
      existing.total += 1;
      if (crane.unmannedOperation === '무인' || crane.unmannedOperation === 'Y') {
        existing.unmanned += 1;
      } else {
        existing.manned += 1;
      }
      
      factoryMap.set(factory, existing);
    });
    
    const result = Array.from(factoryMap.entries()).map(([factoryName, data]) => ({
      factoryName,
      totalCranes: data.total,
      mannedCranes: data.manned,
      unmannedCranes: data.unmanned,
      mannedPercentage: data.total > 0 ? Math.round((data.manned / data.total) * 100) : 0,
      unmannedPercentage: data.total > 0 ? Math.round((data.unmanned / data.total) * 100) : 0
    })).sort((a, b) => b.totalCranes - a.totalCranes);

    cache.set(cacheKey, result);
    return result;
  }

  async getSystemOverview(): Promise<SystemOverview> {
    const cacheKey = 'system-overview';
    const cached = cache.get<SystemOverview>(cacheKey);
    if (cached) return cached;

    const cranes = await this.getCranes();
    const factories = new Set(cranes.map(crane => crane.plantSection || '미분류'));
    
    const totalCranes = cranes.length;
    const mannedCranes = cranes.filter(crane => 
      crane.unmannedOperation !== '무인' && crane.unmannedOperation !== 'Y'
    ).length;
    
    const result = {
      totalFactories: factories.size,
      totalCranes,
      totalMannedPercentage: totalCranes > 0 ? Math.round((mannedCranes / totalCranes) * 100) : 0
    };

    cache.set(cacheKey, result);
    return result;
  }

  async getCraneGradeStats(): Promise<CraneGradeStats[]> {
    const cacheKey = 'crane-grade-stats';
    const cached = cache.get<CraneGradeStats[]>(cacheKey);
    if (cached) return cached;

    const cranes = await this.getCranes();
    const gradeMap = new Map<string, number>();
    
    cranes.forEach(crane => {
      const grade = crane.grade || '미분류';
      gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
    });
    
    const totalCranes = cranes.length;
    
    const result = Array.from(gradeMap.entries()).map(([grade, count]) => ({
      grade,
      count,
      percentage: totalCranes > 0 ? Math.round((count / totalCranes) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    cache.set(cacheKey, result);
    return result;
  }

  async getOperationTypeStats(): Promise<OperationTypeStats> {
    const cacheKey = 'operation-type-stats';
    const cached = cache.get<OperationTypeStats>(cacheKey);
    if (cached) return cached;

    const cranes = await this.getCranes();
    const totalCranes = cranes.length;
    
    const unmannedCranes = cranes.filter(crane => 
      crane.unmannedOperation === '무인' || crane.unmannedOperation === 'Y'
    ).length;
    const mannedCranes = totalCranes - unmannedCranes;
    
    const result = {
      manned: mannedCranes,
      unmanned: unmannedCranes,
      mannedPercentage: totalCranes > 0 ? Math.round((mannedCranes / totalCranes) * 100) : 0,
      unmannedPercentage: totalCranes > 0 ? Math.round((unmannedCranes / totalCranes) * 100) : 0
    };

    cache.set(cacheKey, result);
    return result;
  }

  async getRecentMaintenanceStats(): Promise<{ month: string; failureCount: number; maintenanceCount: number; total: number }[]> {
    const cacheKey = 'recent-maintenance-stats';
    const cached = cache.get<{ month: string; failureCount: number; maintenanceCount: number; total: number }[]>(cacheKey);
    if (cached) return cached;

    // Get current date and calculate 6 months ago
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Get failure and maintenance records
    const failureRecords = await this.getFailureRecords();
    const maintenanceRecords = await this.getMaintenanceRecords();

    // Create map for monthly stats
    const monthlyStats = new Map<string, { failureCount: number; maintenanceCount: number }>();

    // Initialize last 6 months
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyStats.set(monthKey, { failureCount: 0, maintenanceCount: 0 });
    }

    // Count failure records by month
    failureRecords.forEach(record => {
      if (record.date) {
        const recordDate = new Date(record.date);
        if (recordDate >= sixMonthsAgo) {
          const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
          const stats = monthlyStats.get(monthKey);
          if (stats) {
            stats.failureCount++;
          }
        }
      }
    });

    // Count maintenance records by month
    maintenanceRecords.forEach(record => {
      if (record.date) {
        const recordDate = new Date(record.date);
        if (recordDate >= sixMonthsAgo) {
          const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
          const stats = monthlyStats.get(monthKey);
          if (stats) {
            stats.maintenanceCount++;
          }
        }
      }
    });

    // Convert to result format and sort by month (oldest first)
    const result = Array.from(monthlyStats.entries())
      .map(([monthKey, stats]) => ({
        month: monthKey,
        failureCount: stats.failureCount,
        maintenanceCount: stats.maintenanceCount,
        total: stats.failureCount + stats.maintenanceCount
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    cache.set(cacheKey, result);
    return result;
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
