import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Papa from "papaparse";

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

  const httpServer = createServer(app);
  return httpServer;
}
