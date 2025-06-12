import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Papa from "papaparse";

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

      // Helper function to fetch sheet data
      const fetchSheetData = async (spreadsheetId: string, sheetName?: string) => {
        const range = sheetName ? `${sheetName}!A:Z` : 'A:Z';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Google Sheets API 오류: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
          return [];
        }

        // Convert array of arrays to array of objects using first row as headers
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
      };

      // Fetch data from all sheets
      const [cranesData, failureData, maintenanceData] = await Promise.all([
        fetchSheetData(cranesSpreadsheetId, cranesSheetName),
        fetchSheetData(failureSpreadsheetId, failureSheetName),
        fetchSheetData(maintenanceSpreadsheetId, maintenanceSheetName)
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

      // Helper function to fetch sheet data
      const fetchSheetData = async (spreadsheetId: string, sheetName?: string) => {
        const range = sheetName ? `${sheetName}!A:Z` : 'A:Z';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Google Sheets API 오류: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
          return [];
        }

        const [headers, ...rows] = data.values;
        
        if (!headers || headers.length === 0) {
          throw new Error('시트에 헤더가 없습니다.');
        }

        return rows.map((row: any[]) => {
          const obj: any = {};
          headers.forEach((header: string, index: number) => {
            obj[header.trim()] = row[index] || '';
          });
          return obj;
        });
      };

      // Fetch data from all sheets
      const [refreshCranesData, refreshFailureData, refreshMaintenanceData] = await Promise.all([
        fetchSheetData(config.cranesSpreadsheetId, config.cranesSheetName),
        fetchSheetData(config.failureSpreadsheetId, config.failureSheetName),
        fetchSheetData(config.maintenanceSpreadsheetId, config.maintenanceSheetName)
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

  const httpServer = createServer(app);
  return httpServer;
}
