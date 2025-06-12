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
  const range = sheetName ? `${sheetName}!A:Z` : 'A:Z';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}?key=${apiKey}`;
  
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

  // Get failure records
  app.get("/api/failure-records", async (req, res) => {
    try {
      const records = await storage.getFailureRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching failure records:", error);
      res.status(500).json({ message: "Failed to fetch failure records" });
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
      
      if (!cranesSpreadsheetId || !failureSpreadsheetId || !maintenanceSpreadsheetId) {
        return res.status(400).json({ 
          message: "모든 스프레드시트 ID가 필요합니다: 크레인, 고장, 수리 이력" 
        });
      }

      const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          message: "Google Sheets API 키가 설정되지 않았습니다." 
        });
      }

      // Fetch data from all sheets
      const [cranesData, failureData, maintenanceData] = await Promise.all([
        fetchGoogleSheetData(cranesSpreadsheetId, apiKey, cranesSheetName),
        fetchGoogleSheetData(failureSpreadsheetId, apiKey, failureSheetName),
        fetchGoogleSheetData(maintenanceSpreadsheetId, apiKey, maintenanceSheetName)
      ]);
      
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
