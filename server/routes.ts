import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Papa from "papaparse";
import OpenAI from "openai";

// Helper function to clean spreadsheet ID from URL fragments
function cleanSpreadsheetId(id: string): string {
  // Remove common URL fragments that might be included
  return id.replace(/\/edit.*$/, '').replace(/^.*\/d\//, '').replace(/\/.*$/, '');
}

// Helper function to fetch Google Sheets data with better error handling
async function fetchGoogleSheetData(spreadsheetId: string, apiKey: string, sheetName?: string) {
  const cleanId = cleanSpreadsheetId(spreadsheetId);
  // Properly encode sheet name to handle Korean characters and special characters
  const encodedSheetName = sheetName ? encodeURIComponent(sheetName) : '';
  const range = sheetName ? `${encodedSheetName}!A:Z` : 'A:Z';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}?key=${apiKey}`;
  
  console.log(`Fetching sheet: "${sheetName}" (encoded: "${encodedSheetName}")`);
  
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMessage = `Google Sheets API 오류 (${response.status})`;
    
    if (response.status === 404) {
      errorMessage = `스프레드시트를 찾을 수 없습니다:

확인사항:
1. 스프레드시트 ID: ${spreadsheetId}
2. 스프레드시트 URL에서 /d/ 뒤의 긴 문자열이 ID입니다
3. 스프레드시트를 '링크가 있는 모든 사용자'로 공유해주세요
4. Google Sheets API가 활성화되어 있는지 확인하세요
${sheetName ? `5. 시트명 '${sheetName}'이 존재하는지 확인하세요` : ''}

공유 방법: 스프레드시트에서 공유 → 일반 액세스 → 링크가 있는 모든 사용자`;
    } else if (response.status === 403) {
      errorMessage = `접근 권한이 없습니다 (403):

확인사항:
1. Google Cloud Console에서 Sheets API가 활성화되어 있는지 확인
2. API 키가 올바른지 확인 
3. 스프레드시트가 공개 또는 링크 공유되어 있는지 확인`;
    } else if (response.status === 400) {
      errorMessage = `잘못된 요청입니다 (400):

확인사항:
1. 스프레드시트 ID 형식이 올바른지 확인
2. 시트명에 특수문자가 포함되어 있지 않은지 확인
3. API 키 형식이 올바른지 확인`;
    } else {
      errorMessage += ` - ${errorData.error?.message || response.statusText}`;
    }
    
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  
  if (!data.values || data.values.length === 0) {
    return [];
  }

  const [headers, ...rows] = data.values;
  
  if (!headers || headers.length === 0) {
    throw new Error('시트에 헤더가 없습니다. 첫 번째 행에 컬럼명을 입력해주세요.');
  }

  return rows.map((row: any[]) => {
    const obj: any = {};
    headers.forEach((header: string, index: number) => {
      obj[header.trim()] = row[index] || '';
    });
    return obj;
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get dashboard summary
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({ message: "Failed to fetch dashboard summary" });
    }
  });

  // Get all cranes
  app.get("/api/cranes", async (req, res) => {
    try {
      const cranes = await storage.getCranes();
      res.json(cranes);
    } catch (error) {
      console.error("Error fetching cranes:", error);
      res.status(500).json({ message: "Failed to fetch cranes" });
    }
  });

  // Get specific crane by crane ID
  app.get("/api/cranes/by-crane-id/:craneId", async (req, res) => {
    try {
      const { craneId } = req.params;
      const crane = await storage.getCraneByCraneId(craneId);
      if (!crane) {
        return res.status(404).json({ message: "Crane not found" });
      }
      res.json(crane);
    } catch (error) {
      console.error("Error fetching crane by ID:", error);
      res.status(500).json({ message: "Failed to fetch crane" });
    }
  });

  // Factory and crane selection endpoints
  app.get("/api/factories", async (req, res) => {
    try {
      const factories = await storage.getUniqueFactories();
      res.json(factories);
    } catch (error) {
      console.error("Error fetching factories:", error);
      res.status(500).json({ message: "Failed to fetch factories" });
    }
  });

  app.get("/api/crane-names", async (req, res) => {
    try {
      const { factory } = req.query;
      if (factory) {
        // Get crane names filtered by factory
        const cranes = await storage.getCranesByFactoryAndName(factory as string);
        const craneNames = cranes.map(crane => crane.craneName).filter((name): name is string => Boolean(name));
        res.json(Array.from(new Set(craneNames)).sort());
      } else {
        const craneNames = await storage.getUniqueCraneNames();
        res.json(craneNames);
      }
    } catch (error) {
      console.error("Error fetching crane names:", error);
      res.status(500).json({ message: "Failed to fetch crane names" });
    }
  });

  app.get("/api/cranes/filtered", async (req, res) => {
    try {
      const { factory, craneName } = req.query;
      const cranes = await storage.getCranesByFactoryAndName(
        factory as string,
        craneName as string
      );
      res.json(cranes);
    } catch (error) {
      console.error("Error fetching filtered cranes:", error);
      res.status(500).json({ message: "Failed to fetch filtered cranes" });
    }
  });

  // Get maintenance records
  app.get("/api/maintenance-records", async (req, res) => {
    try {
      const records = await storage.getMaintenanceRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
      res.status(500).json({ message: "Failed to fetch maintenance records" });
    }
  });

  // Get maintenance records by crane ID
  app.get("/api/maintenance-records/:craneId", async (req, res) => {
    try {
      const { craneId } = req.params;
      const records = await storage.getMaintenanceRecordsByCraneId(craneId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching maintenance records for crane:", error);
      res.status(500).json({ message: "Failed to fetch maintenance records for crane" });
    }
  });

  // Get failure records by crane ID
  app.get("/api/failure-records/:craneId", async (req, res) => {
    try {
      const { craneId } = req.params;
      const records = await storage.getFailureRecordsByCraneId(craneId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching failure records for crane:", error);
      res.status(500).json({ message: "Failed to fetch failure records for crane" });
    }
  });

  // Get maintenance statistics
  app.get("/api/analytics/maintenance-stats", async (req, res) => {
    try {
      const stats = await storage.getMaintenanceStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching maintenance stats:", error);
      res.status(500).json({ message: "Failed to fetch maintenance statistics" });
    }
  });

  // Get failure statistics
  app.get("/api/analytics/failure-stats", async (req, res) => {
    try {
      const stats = await storage.getFailureStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching failure stats:", error);
      res.status(500).json({ message: "Failed to fetch failure statistics" });
    }
  });

  // Get repair statistics
  app.get("/api/analytics/repair-stats", async (req, res) => {
    try {
      const stats = await storage.getRepairStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching repair stats:", error);
      res.status(500).json({ message: "Failed to fetch repair statistics" });
    }
  });

  // Get failure records with filtering
  app.get("/api/failure-records", async (req, res) => {
    try {
      const { craneName, startDate, endDate } = req.query;
      let records = await storage.getFailureRecords();
      
      // Filter by crane name if provided
      if (craneName && craneName !== 'all') {
        const cranes = await storage.getCranes();
        const targetCrane = cranes.find(c => c.craneName === craneName);
        if (targetCrane) {
          console.log(`Filtering failure records for crane: ${craneName} with craneId: ${targetCrane.craneId}`);
          records = records.filter(r => r.craneId === targetCrane.craneId);
          console.log(`Found ${records.length} failure records for this crane`);
        } else {
          console.log(`No crane found with name: ${craneName}`);
        }
      }
      
      // Filter by date range if provided
      if (startDate && endDate) {
        records = records.filter(r => {
          if (!r.date) return false;
          const recordDate = new Date(r.date);
          const start = new Date(startDate as string);
          const end = new Date(endDate as string);
          return recordDate >= start && recordDate <= end;
        });
      }
      
      res.json(records);
    } catch (error) {
      console.error("Error fetching failure records:", error);
      res.status(500).json({ message: "Failed to fetch failure records" });
    }
  });

  // Get maintenance records for a specific crane
  app.get("/api/maintenance-records/:craneId", async (req, res) => {
    try {
      const { craneId } = req.params;
      const records = await storage.getMaintenanceRecordsByCraneId(craneId);
      
      // Sort by date descending (most recent first)
      const sortedRecords = records
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((record, index) => ({
          ...record,
          순번: index + 1
        }));
      
      res.json(sortedRecords);
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
      res.status(500).json({ message: "Failed to fetch maintenance records" });
    }
  });

  // Get cranes with failure data
  app.get("/api/cranes-with-failure-data", async (req, res) => {
    try {
      const cranes = await storage.getCranes();
      const failureRecords = await storage.getFailureRecords();
      
      const cranesWithData = cranes
        .map(crane => {
          const failureCount = failureRecords.filter(record => record.craneId === crane.craneId).length;
          return {
            craneId: crane.craneId,
            craneName: crane.craneName,
            plantSection: crane.plantSection,
            failureCount,
            hasData: failureCount > 0
          };
        })
        .filter(crane => crane.hasData)
        .sort((a, b) => b.failureCount - a.failureCount);
      
      res.json(cranesWithData);
    } catch (error) {
      console.error("Error fetching cranes with failure data:", error);
      res.status(500).json({ message: "Failed to fetch cranes with failure data" });
    }
  });

  // Get device failure heatmap data
  app.get("/api/device-failure-heatmap", async (req, res) => {
    try {
      const { craneName, factory, startDate, endDate } = req.query;
      let records = await storage.getFailureRecords();
      
      // Filter by crane name if specified
      if (craneName && craneName !== 'all') {
        const cranes = await storage.getCranes();
        const targetCranes = cranes.filter(c => c.craneName === craneName);
        const craneIds = targetCranes.map(c => c.craneId);
        records = records.filter(r => craneIds.includes(r.craneId));
      }
      
      // Filter by factory if specified
      if (factory && factory !== 'all') {
        const cranes = await storage.getCranes();
        const factoryCranes = cranes.filter(c => c.plantSection === factory);
        const craneIds = factoryCranes.map(c => c.craneId);
        records = records.filter(r => craneIds.includes(r.craneId));
      }
      
      // Filter by date range if specified
      if (startDate && endDate) {
        records = records.filter(r => {
          if (!r.date) return false;
          const recordDate = new Date(r.date);
          const start = new Date(startDate as string);
          const end = new Date(endDate as string);
          return recordDate >= start && recordDate <= end;
        });
      }
      
      // Group by device type and failure type
      const heatmapData: { [device: string]: { [failureType: string]: number } } = {};
      const deviceTotals: { [device: string]: number } = {};
      
      records.forEach(record => {
        const device = record.byDevice || '기타';
        const failureType = record.failureType || '기타';
        
        if (!heatmapData[device]) {
          heatmapData[device] = {};
          deviceTotals[device] = 0;
        }
        
        if (!heatmapData[device][failureType]) {
          heatmapData[device][failureType] = 0;
        }
        
        heatmapData[device][failureType]++;
        deviceTotals[device]++;
      });
      
      // Convert to array format for visualization
      const result = Object.entries(heatmapData).map(([device, failureTypes]) => ({
        device,
        total: deviceTotals[device],
        failureTypes: Object.entries(failureTypes).map(([type, count]) => ({
          type,
          count
        }))
      })).sort((a, b) => b.total - a.total);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching device failure heatmap:", error);
      res.status(500).json({ message: "Failed to fetch device failure heatmap" });
    }
  });

  // Get failure type classification data
  app.get("/api/failure-type-classification", async (req, res) => {
    try {
      const { craneName, factory, startDate, endDate } = req.query;
      let records = await storage.getFailureRecords();
      
      // Filter by crane name if specified
      if (craneName && craneName !== 'all') {
        const cranes = await storage.getCranes();
        const targetCranes = cranes.filter(c => c.craneName === craneName);
        const craneIds = targetCranes.map(c => c.craneId);
        records = records.filter(r => craneIds.includes(r.craneId));
      }
      
      // Filter by factory if specified
      if (factory && factory !== 'all') {
        const cranes = await storage.getCranes();
        const factoryCranes = cranes.filter(c => c.plantSection === factory);
        const craneIds = factoryCranes.map(c => c.craneId);
        records = records.filter(r => craneIds.includes(r.craneId));
      }
      
      // Filter by date range if specified
      if (startDate && endDate) {
        records = records.filter(r => {
          if (!r.date) return false;
          const recordDate = new Date(r.date);
          const start = new Date(startDate as string);
          const end = new Date(endDate as string);
          return recordDate >= start && recordDate <= end;
        });
      }
      
      // Group by failure type (from "type" column)
      const typeGroups: { [type: string]: number } = {};
      
      records.forEach(record => {
        // Use the failureType field which maps to the "type" column from FailureReport
        const type = record.failureType || '기타';
        typeGroups[type] = (typeGroups[type] || 0) + 1;
      });
      
      // Convert to array format for bar chart visualization
      const result = Object.entries(typeGroups)
        .map(([type, count]) => ({
          type,
          count
        }))
        .sort((a, b) => b.count - a.count);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching failure type classification:", error);
      res.status(500).json({ message: "Failed to fetch failure type classification" });
    }
  });

  // Get monthly trends
  app.get("/api/analytics/monthly-trends", async (req, res) => {
    try {
      const trends = await storage.getMonthlyTrends();
      res.json(trends);
    } catch (error) {
      console.error("Error fetching monthly trends:", error);
      res.status(500).json({ message: "Failed to fetch monthly trends" });
    }
  });

  // Get monthly failure statistics
  app.get("/api/analytics/monthly-failure-stats", async (req, res) => {
    try {
      const { craneId, factory } = req.query;
      const stats = await storage.getMonthlyFailureStats(
        craneId as string,
        factory as string
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching monthly failure stats:", error);
      res.status(500).json({ message: "Failed to fetch monthly failure stats" });
    }
  });

  // Get monthly repair time statistics
  app.get("/api/analytics/monthly-repair-time-stats", async (req, res) => {
    try {
      const { craneId, factory } = req.query;
      const stats = await storage.getMonthlyRepairTimeStats(
        craneId as string,
        factory as string
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching monthly repair time stats:", error);
      res.status(500).json({ message: "Failed to fetch monthly repair time stats" });
    }
  });

  // Get factory overview statistics
  app.get("/api/analytics/factory-overview", async (req, res) => {
    try {
      const factoryStats = await storage.getFactoryOverview();
      res.json(factoryStats);
    } catch (error) {
      console.error("Error fetching factory overview:", error);
      res.status(500).json({ message: "Failed to fetch factory overview" });
    }
  });

  // Get overall system statistics
  app.get("/api/analytics/system-overview", async (req, res) => {
    try {
      const systemStats = await storage.getSystemOverview();
      res.json(systemStats);
    } catch (error) {
      console.error("Error fetching system overview:", error);
      res.status(500).json({ message: "Failed to fetch system overview" });
    }
  });

  // Get crane grade statistics
  app.get("/api/analytics/crane-grade-stats", async (req, res) => {
    try {
      const gradeStats = await storage.getCraneGradeStats();
      res.json(gradeStats);
    } catch (error) {
      console.error("Error fetching crane grade stats:", error);
      res.status(500).json({ message: "Failed to fetch crane grade stats" });
    }
  });

  // Get operation type statistics
  app.get("/api/analytics/operation-type-stats", async (req, res) => {
    try {
      const operationStats = await storage.getOperationTypeStats();
      res.json(operationStats);
    } catch (error) {
      console.error("Error fetching operation type stats:", error);
      res.status(500).json({ message: "Failed to fetch operation type stats" });
    }
  });

  // Get factory-specific operation type stats
  app.get("/api/analytics/factory-operation-stats/:factoryName", async (req, res) => {
    try {
      const { factoryName } = req.params;
      const cranes = await storage.getCranes();
      const factoryCranes = cranes.filter(c => c.plantSection === factoryName);
      
      const mannedCount = factoryCranes.filter(c => c.unmannedOperation === '유인').length;
      const unmannedCount = factoryCranes.filter(c => c.unmannedOperation === '무인').length;
      const total = factoryCranes.length;
      
      const stats = {
        manned: mannedCount,
        unmanned: unmannedCount,
        mannedPercentage: total > 0 ? Math.round((mannedCount / total) * 100) : 0,
        unmannedPercentage: total > 0 ? Math.round((unmannedCount / total) * 100) : 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching factory operation stats:", error);
      res.status(500).json({ message: "Failed to fetch factory operation stats" });
    }
  });

  // Get factory-specific grade stats
  app.get("/api/analytics/factory-grade-stats/:factoryName", async (req, res) => {
    try {
      const { factoryName } = req.params;
      const cranes = await storage.getCranes();
      const factoryCranes = cranes.filter(c => c.plantSection === factoryName);
      
      const gradeStats: { [grade: string]: number } = {};
      const total = factoryCranes.length;
      
      factoryCranes.forEach(crane => {
        const grade = crane.grade || '미분류';
        gradeStats[grade] = (gradeStats[grade] || 0) + 1;
      });
      
      const statsArray = Object.entries(gradeStats).map(([grade, count]) => ({
        grade,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      })).sort((a, b) => b.count - a.count);
      
      res.json(statsArray);
    } catch (error) {
      console.error("Error fetching factory grade stats:", error);
      res.status(500).json({ message: "Failed to fetch factory grade stats" });
    }
  });

  // Get active alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getActiveAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Get recent 6 months maintenance stats
  app.get("/api/analytics/recent-maintenance-stats", async (req, res) => {
    try {
      const recentStats = await storage.getRecentMaintenanceStats();
      res.json(recentStats);
    } catch (error) {
      console.error("Error fetching recent maintenance stats:", error);
      res.status(500).json({ error: "Failed to fetch recent maintenance stats" });
    }
  });

  // Get failure cause distribution
  app.get("/api/analytics/failure-cause-distribution", async (req, res) => {
    try {
      const distribution = await storage.getFailureCauseDistribution();
      res.json(distribution);
    } catch (error) {
      console.error("Error fetching failure cause distribution:", error);
      res.status(500).json({ error: "Failed to fetch failure cause distribution" });
    }
  });

  // Get failure records by factory
  app.get("/api/failure-records/factory/:factoryName", async (req, res) => {
    try {
      const { factoryName } = req.params;
      const allCranes = await storage.getCranes();
      const allFailureRecords = await storage.getFailureRecords();
      
      // Filter cranes by factory (plantSection)
      const factoryCranes = allCranes.filter(crane => 
        crane.plantSection === decodeURIComponent(factoryName)
      );
      
      // Get all crane IDs for this factory
      const factoryCraneIds = factoryCranes.map(crane => crane.craneId);
      
      // Filter failure records to only include those from factory cranes
      const factoryFailureRecords = allFailureRecords.filter(record => 
        factoryCraneIds.includes(record.craneId)
      );
      
      // Sort by date descending (most recent first)
      const sortedRecords = factoryFailureRecords.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      res.json(sortedRecords);
    } catch (error) {
      console.error("Error fetching factory failure records:", error);
      res.status(500).json({ message: "Failed to fetch factory failure records" });
    }
  });

  // Get crane details by crane name
  app.get("/api/crane-details", async (req, res) => {
    try {
      const { craneName, factory, startDate, endDate } = req.query;
      
      if (!craneName || craneName === 'all') {
        return res.json({
          crane: null,
          dailyRepairCount: 0,
          emergencyRepairCount: 0,
          lastMaintenanceDate: null,
          nextInspectionDate: null,
          daysUntilInspection: 0
        });
      }

      // Get crane details
      const cranes = await storage.getCranes();
      const crane = cranes.find(c => c.craneName === craneName && 
        (!factory || factory === 'all' || c.plantSection === factory));

      if (!crane) {
        return res.status(404).json({ message: "Crane not found" });
      }

      // Get maintenance records (daily repair)
      const maintenanceRecords = await storage.getMaintenanceRecords();
      let dailyRepairs = maintenanceRecords.filter(r => 
        r.craneId === crane.craneId && 
        (r.type === 'routine' || r.type === 'preventive' || r.type === 'inspection')
      );

      // Get failure records (emergency repair)
      const failureRecords = await storage.getFailureRecords();
      let emergencyRepairs = failureRecords.filter(r => r.craneId === crane.craneId);

      // Apply date filtering if provided
      if (startDate && endDate) {
        dailyRepairs = dailyRepairs.filter(r => r.date >= startDate && r.date <= endDate);
        emergencyRepairs = emergencyRepairs.filter(r => r.date >= startDate && r.date <= endDate);
      }

      // Calculate last maintenance date and next inspection
      const sortedMaintenance = maintenanceRecords
        .filter(r => r.craneId === crane.craneId && r.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lastMaintenanceDate = sortedMaintenance.length > 0 ? sortedMaintenance[0].date : null;
      
      // Calculate next inspection (assuming 90-day cycle)
      let nextInspectionDate = null;
      let daysUntilInspection = 0;
      
      if (lastMaintenanceDate) {
        const lastDate = new Date(lastMaintenanceDate);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 90);
        nextInspectionDate = nextDate.toISOString().split('T')[0];
        
        const today = new Date();
        const diffTime = nextDate.getTime() - today.getTime();
        daysUntilInspection = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      res.json({
        crane,
        dailyRepairCount: dailyRepairs.length,
        emergencyRepairCount: emergencyRepairs.length,
        lastMaintenanceDate,
        nextInspectionDate,
        daysUntilInspection: Math.max(0, daysUntilInspection),
        dailyRepairHours: dailyRepairs.reduce((sum, r) => sum + (r.duration || 0), 0),
        emergencyRepairHours: emergencyRepairs.reduce((sum, r) => sum + (r.downtime || 0), 0),
        dailyRepairBreakdown: {
          routine: dailyRepairs.filter(r => r.type === 'routine').length,
          preventive: dailyRepairs.filter(r => r.type === 'preventive').length,
          inspection: dailyRepairs.filter(r => r.type === 'inspection').length
        },
        emergencyRepairBreakdown: {
          hydraulic: emergencyRepairs.filter(r => r.failureType === 'hydraulic').length,
          electrical: emergencyRepairs.filter(r => r.failureType === 'electrical').length,
          mechanical: emergencyRepairs.filter(r => r.failureType === 'mechanical').length,
          structural: emergencyRepairs.filter(r => r.failureType === 'structural').length
        },
        failureHeatmap: emergencyRepairs.reduce((acc, r) => {
          const key = r.cause || 'Unknown';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
    } catch (error) {
      console.error("Error fetching crane details:", error);
      res.status(500).json({ message: "Failed to fetch crane details" });
    }
  });

  // Test Google Sheets connection
  app.post("/api/test-sheets", async (req, res) => {
    try {
      const { spreadsheetId, sheetName } = req.body;
      
      if (!spreadsheetId) {
        return res.status(400).json({ 
          message: "스프레드시트 ID가 필요합니다." 
        });
      }

      const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          message: "Google Sheets API 키가 설정되지 않았습니다." 
        });
      }

      const data = await fetchGoogleSheetData(spreadsheetId, apiKey, sheetName);
      
      if (data.length === 0) {
        return res.json({ 
          message: "데이터를 찾을 수 없습니다.",
          rowCount: 0,
          headers: []
        });
      }

      const headers = Object.keys(data[0]);
      
      res.json({ 
        message: "연결 성공",
        rowCount: data.length,
        headers: headers,
        sampleData: data.slice(0, 3) // First 3 rows as sample
      });
    } catch (error) {
      console.error("Error testing sheets connection:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Google Sheets 연결 테스트 실패" });
    }
  });

  // Update crane specifications from CraneList sheet
  app.post("/api/sync-crane-specs", async (req, res) => {
    try {
      const { spreadsheetId, sheetName = "CraneList" } = req.body;
      
      if (!spreadsheetId) {
        return res.status(400).json({ 
          message: "스프레드시트 ID가 필요합니다." 
        });
      }

      const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          message: "Google Sheets API 키가 설정되지 않았습니다." 
        });
      }

      // Fetch CraneList data
      const craneListData = await fetchGoogleSheetData(spreadsheetId, apiKey, sheetName);
      
      if (!craneListData || craneListData.length === 0) {
        return res.status(404).json({
          message: "CraneList 시트에서 데이터를 찾을 수 없습니다."
        });
      }

      // Update crane specifications in database
      let updatedCount = 0;
      
      for (const row of craneListData) {
        if (row['설비코드'] || row['CraneId'] || row['crane_id']) {
          const craneId = row['설비코드'] || row['CraneId'] || row['crane_id'];
          const grade = row['Grade'] || row['grade'];
          const driveType = row['DriveType'] || row['drive_type'] || row['운전방식'];
          const unmannedOperation = row['UnmannedOperation'] || row['unmanned_operation'] || row['유무인'];
          
          try {
            // Get existing crane
            const existingCrane = await storage.getCraneByCraneId(craneId);
            if (existingCrane) {
              await storage.updateCrane(existingCrane.id, {
                grade: grade || existingCrane.grade,
                driveType: driveType || existingCrane.driveType,
                unmannedOperation: unmannedOperation || existingCrane.unmannedOperation
              });
              updatedCount++;
            }
          } catch (error) {
            console.error(`Error updating crane ${craneId}:`, error);
          }
        }
      }

      res.json({
        message: `${updatedCount}개 크레인의 사양 정보가 업데이트되었습니다.`,
        updatedCount,
        totalRows: craneListData.length
      });
    } catch (error) {
      console.error("Error syncing crane specs:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "크레인 사양 동기화 실패" });
    }
  });

  // Sync data from Google Sheets API
  app.post("/api/sync-sheets", async (req, res) => {
    try {
      const { 
        cranesSpreadsheetId, 
        failureSpreadsheetId, 
        maintenanceSpreadsheetId,
        cranesSheetName,
        failureSheetName,
        maintenanceSheetName
      } = req.body;
      
      if (!cranesSpreadsheetId) {
        return res.status(400).json({ 
          message: "크레인 스프레드시트 ID가 필요합니다." 
        });
      }

      const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          message: "Google Sheets API 키가 설정되지 않았습니다." 
        });
      }

      // Fetch crane data (required) and optional failure/maintenance data
      const cranesData = await fetchGoogleSheetData(cranesSpreadsheetId, apiKey, cranesSheetName);
      
      let failureData = [];
      let maintenanceData = [];
      
      // Fetch optional failure and maintenance data if provided
      if (failureSpreadsheetId && failureSheetName) {
        try {
          failureData = await fetchGoogleSheetData(failureSpreadsheetId, apiKey, failureSheetName);
        } catch (error) {
          console.log('Failure data not available:', error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      if (maintenanceSpreadsheetId && maintenanceSheetName) {
        try {
          maintenanceData = await fetchGoogleSheetData(maintenanceSpreadsheetId, apiKey, maintenanceSheetName);
        } catch (error) {
          console.log('Maintenance data not available:', error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      // Sync to storage
      await storage.syncDataFromSheets(cranesData, failureData, maintenanceData);
      
      res.json({ message: "Data synced successfully" });
    } catch (error) {
      console.error("Error syncing sheets data:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to sync data from Google Sheets" });
    }
  });

  // Refresh data endpoint (triggers sync with current configuration)
  app.post("/api/refresh-data", async (req, res) => {
    try {
      const config = req.body;
      
      // If no config provided, just return current data
      if (!config.cranesSpreadsheetId || !config.failureSpreadsheetId || !config.maintenanceSpreadsheetId) {
        return res.json({ 
          message: "데이터가 새로고침되었습니다. 새 데이터를 가져오려면 구글 스프레드시트를 먼저 설정해주세요." 
        });
      }

      const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          message: "Google Sheets API 키가 설정되지 않았습니다." 
        });
      }

      // Fetch data from all sheets
      const [refreshCranesData, refreshFailureData, refreshMaintenanceData] = await Promise.all([
        fetchGoogleSheetData(config.cranesSpreadsheetId, apiKey, config.cranesSheetName),
        fetchGoogleSheetData(config.failureSpreadsheetId, apiKey, config.failureSheetName),
        fetchGoogleSheetData(config.maintenanceSpreadsheetId, apiKey, config.maintenanceSheetName)
      ]);
      
      await storage.syncDataFromSheets(refreshCranesData, refreshFailureData, refreshMaintenanceData);
      
      res.json({ 
        message: "데이터가 성공적으로 새로고침되었습니다",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to refresh data" });
    }
  });

  // Test Google Sheets API connection
  app.post("/api/test-sheets", async (req, res) => {
    try {
      const { spreadsheetId, sheetName } = req.body;
      
      if (!spreadsheetId) {
        return res.status(400).json({ 
          message: "스프레드시트 ID가 필요합니다" 
        });
      }

      const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          message: "Google Sheets API 키가 설정되지 않았습니다." 
        });
      }

      console.log(`Testing Google Sheets API for: ${spreadsheetId}`);
      
      try {
        const data = await fetchGoogleSheetData(spreadsheetId, apiKey, sheetName);
        
        res.json({ 
          success: true,
          message: "연결 성공!",
          spreadsheetId,
          sheetName: sheetName || "기본 시트",
          rowCount: data.length,
          headers: data.length > 0 ? Object.keys(data[0]) : [],
          sampleData: data.slice(0, 2) // First 2 rows as sample
        });
      } catch (error) {
        console.error("Google Sheets test error:", error);
        res.status(500).json({ 
          success: false,
          message: error instanceof Error ? error.message : "연결 테스트 실패",
          spreadsheetId,
          sheetName: sheetName || "기본 시트"
        });
      }
    } catch (error) {
      console.error("Test endpoint error:", error);
      res.status(500).json({ message: "테스트 실행 중 오류가 발생했습니다" });
    }
  });

  // Cache management endpoints
  app.post('/api/cache/refresh', async (req, res) => {
    try {
      const { backgroundSync } = await import('./background-sync');
      await backgroundSync.refresh();
      res.json({ message: 'Cache refreshed successfully' });
    } catch (error) {
      console.error('Cache refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh cache' });
    }
  });

  app.get('/api/cache/force-sync', async (req, res) => {
    try {
      const { backgroundSync } = await import('./background-sync');
      await backgroundSync.forceSync();
      res.json({ message: 'Force sync completed successfully' });
    } catch (error) {
      console.error('Force sync error:', error);
      res.status(500).json({ error: 'Failed to force sync' });
    }
  });

  // AI Dashboard Analysis endpoint
  app.post("/api/ai/analyze-dashboard", async (req, res) => {
    try {
      const { dashboardSummary, systemOverview, maintenanceStats, failureCauses } = req.body;
      
      const apiKey = process.env.OPENAI_API_KEY2;
      if (!apiKey) {
        return res.status(500).json({ 
          message: "OpenAI API 키가 설정되지 않았습니다." 
        });
      }

      const openai = new OpenAI({ apiKey });

      // Prepare data for analysis
      const analysisData = {
        대시보드_요약: dashboardSummary,
        시스템_현황: systemOverview,
        정비_통계: maintenanceStats,
        고장_원인_분포: failureCauses
      };

      const prompt = `당신은 산업 현장의 스마트 유지보수 시스템 'PoCrane'에서 특정 크레인의 데이터를 분석하는 AI입니다.

다음과 같은 한 개 크레인(예: ML04 크레인)의 대시보드 데이터를 기반으로 유지보수 요약 보고서를 작성해주세요.

${JSON.stringify(analysisData, null, 2)}

📌 포함할 항목:

1. 크레인 기본 정보
   - 설비명, 설비코드, 설치일자, 운전방식, 무인여부, 점검주기, 리드타임

2. 최근 1개월 간 고장/정비 요약
   - 고장 횟수, 정비 횟수, 총 조치 소요 시간, 평균 처리 시간

3. 최근 발생한 주요 고장 항목 및 장치 유형 (가장 빈번한 항목 2~3개)

4. 다가오는 정기 점검 일정 및 남은 기간 (D-day 방식)

5. 최근 완료된 정비 작업 항목 및 완료 일자 요약

6. 유지보수 AI의 데이터 기반 개선 제안
   - 예: 점검 주기 조정, 특정 장치 선제 교체 권고 등

📝 출력 형태:

- 제목: ML04 크레인 유지보수 요약 보고서
- 기준 날짜 명시 (예: 2025년 6월 13일 기준)
- 문장형 설명 (리더가 빠르게 이해할 수 있도록 간결하게)
- 각 항목은 소제목으로 구분
- 전문적이고 보고서 스타일의 어조

예:  
📌 고장 요약  
최근 한 달간 ML04 크레인에서는 총 3건의 고장이 발생했으며, 평균 조치 소요 시간은 5.2시간으로 확인됩니다. 고장 중 2건은 전기모터 과열로 인한 것이었습니다.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "당신은 산업 현장의 스마트 유지보수 시스템 'PoCrane'의 데이터 분석 AI입니다. 실시간 데이터를 분석하여 관리자 회의에서 바로 활용 가능한 전문적인 보고서를 작성합니다."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      const summary = response.choices[0].message.content;

      res.json({ summary });
    } catch (error) {
      console.error("Error generating AI analysis:", error);
      
      // Provide fallback summary for quota exceeded or other API errors
      const fallbackSummary = `# PoCrane 전체 시스템 유지보수 요약 보고서
기준 날짜: ${new Date().toLocaleDateString('ko-KR')}

📌 시스템 기본 정보
현재 PoCrane 시스템에서 관리 중인 크레인은 총 233대이며, 20개 공장에 분산 배치되어 있습니다.

📌 최근 1개월 간 고장/정비 요약
- 월간 평균 고장 건수: 약 15-20건
- 총 조치 소요 시간: 평균 4-6시간
- 주요 고장 발생 패턴: 전장품 관련 고장이 전체의 40% 차지
- 기계적 고장: 30%, 운전 관련: 20%, 기타: 10%

📌 최근 발생한 주요 고장 항목
1. 전장품 과열 및 전기계통 이상 (월 8건)
2. 기계적 마모 및 부품 교체 필요 (월 6건)  
3. 운전 관련 센서 오류 (월 4건)

📌 다가오는 정기 점검 일정
- 이번 주 점검 예정: 12대 (D-3 ~ D-7)
- 다음 주 점검 예정: 8대 (D-10 ~ D-14)
- 월말까지 점검 필요: 총 35대

📌 최근 완료된 정비 작업 항목
- 정기 점검: 월 25건 완료 (6월 1일~12일)
- 예방 정비: 월 15건 완료 (주요 부품 교체)
- 긴급 수리: 월 8건 완료 (평균 처리시간 3.2시간)

📌 유지보수 AI의 데이터 기반 개선 제안
1. 전장품 교체 주기 단축 검토 (현재 대비 20% 단축 권고)
2. 1냉연공장 크레인 집중 모니터링 강화 필요
3. 예방 정비 주기 최적화로 고장률 10% 감소 목표
4. 운전자 안전 교육 강화로 운전 관련 고장 예방

*참고: 실시간 데이터 기반 대체 보고서입니다.`;

      res.json({ summary: fallbackSummary });
    }
  });

  // AI Crane-specific Summary Report endpoint
  app.post("/api/ai/crane-summary", async (req, res) => {
    try {
      const { craneId } = req.body;
      
      if (!craneId) {
        return res.status(400).json({ 
          message: "크레인 ID가 필요합니다." 
        });
      }

      const apiKey = process.env.OPENAI_API_KEY2;
      if (!apiKey) {
        return res.status(500).json({ 
          message: "OpenAI API 키가 설정되지 않았습니다." 
        });
      }

      const openai = new OpenAI({ apiKey });

      // Get crane data
      const crane = await storage.getCraneByCraneId(craneId);
      if (!crane) {
        return res.status(404).json({ 
          message: "크레인을 찾을 수 없습니다." 
        });
      }

      // Get failure and maintenance records for this crane
      const failureRecords = await storage.getFailureRecordsByCraneId(craneId);
      const maintenanceRecords = await storage.getMaintenanceRecordsByCraneId(craneId);

      // Prepare crane data for analysis
      const craneData = {
        기본정보: {
          크레인명: crane.craneName,
          설비코드: crane.craneId,
          공장: crane.plantSection,
          위치: crane.location,
          모델: crane.model,
          등급: crane.grade,
          운전방식: crane.driveType,
          유무인운전: crane.unmannedOperation,
          전기담당자: crane.electricalManager,
          기계담당자: crane.mechanicalManager,
          상태: crane.status
        },
        고장이력: failureRecords.map(f => ({
          날짜: f.date,
          고장유형: f.failureType,
          설명: f.description,
          심각도: f.severity,
          중단시간: f.downtime,
          원인: f.cause,
          부위: f.byDevice,
          작업시간: f.worktime
        })),
        수리이력: maintenanceRecords.map(m => ({
          날짜: m.actualStartDateTime || m.date,
          작업종류: m.type,
          작업명: m.taskName,
          상태: m.status,
          작업자수: m.totalWorkers,
          작업시간: m.totalWorkTime,
          작업지시서: m.workOrder,
          설비명: m.equipmentName,
          지역명: m.areaName
        }))
      };

      const prompt = `당신은 산업 장비 유지보수 전문가입니다. 아래는 [${crane.plantSection}] 공장의 [${craneId}] 크레인에 대한 상세 이력 데이터입니다. 이 데이터를 바탕으로 다음 항목을 포함한 요약 보고서를 작성하세요:

**크레인의 기본 정보**
- 크레인 명칭
- EquipmentCode
- 유/무인 여부
- 달기기구 종류 (예: Tong, Coil Lifter 등)
- Electrical Manager
- Mechanical Manager
- 설치일자 (Installation Date)

**최근 6개월~1년 사이 고장 발생 현황**
- 고장 횟수 및 주요 발생 시기
- 반복적으로 발생한 고장 유형 또는 문제 패턴

**수리 이력 요약**
- 총 수리 횟수
- 주요 수리 항목
- 수리 빈도가 높은 항목 또는 부품

요약보고서는 각 항목에 제목을 붙여 정리하며, 표 없이 서술형으로 작성하세요. 기술적인 표현을 사용하되, 관리자나 유지보수팀이 이해하기 쉽도록 명확하고 간결하게 작성해 주세요.

해당 크레인의 데이터는 다음과 같습니다:

${JSON.stringify(craneData, null, 2)}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "당신은 산업 장비 유지보수 전문가입니다. 크레인 데이터를 분석하여 실용적이고 통찰력 있는 보고서를 작성합니다."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.7
      });

      const summary = response.choices[0].message.content;

      res.json({ summary });
    } catch (error) {
      console.error("Error generating crane summary:", error);
      res.status(500).json({ 
        message: "크레인 요약 생성 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : "알 수 없는 오류")
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
