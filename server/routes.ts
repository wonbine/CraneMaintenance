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

  // Sync data from Google Sheets
  app.post("/api/sync-sheets", async (req, res) => {
    try {
      const { cranesUrl, failureUrl, maintenanceUrl } = req.body;
      
      if (!cranesUrl || !failureUrl || !maintenanceUrl) {
        return res.status(400).json({ message: "All three URLs are required: cranes, failures, and maintenance" });
      }

      // Fetch cranes data
      const cranesResponse = await fetch(cranesUrl);
      const cranesText = await cranesResponse.text();
      
      // Fetch failure data
      const failureResponse = await fetch(failureUrl);
      const failureText = await failureResponse.text();
      
      // Fetch maintenance data
      const maintenanceResponse = await fetch(maintenanceUrl);
      const maintenanceText = await maintenanceResponse.text();
      
      // Parse CSV data
      const cranesData = Papa.parse(cranesText, { header: true }).data;
      const failureData = Papa.parse(failureText, { header: true }).data;
      const maintenanceData = Papa.parse(maintenanceText, { header: true }).data;
      
      // Sync to storage
      await storage.syncDataFromSheets(cranesData, failureData, maintenanceData);
      
      res.json({ message: "Data synced successfully" });
    } catch (error) {
      console.error("Error syncing sheets data:", error);
      res.status(500).json({ message: "Failed to sync data from Google Sheets" });
    }
  });

  // Refresh data endpoint (triggers sync with predefined URLs)
  app.post("/api/refresh-data", async (req, res) => {
    try {
      // These would typically come from environment variables
      const cranesUrl = process.env.GOOGLE_SHEETS_CRANES_URL || req.body.cranesUrl;
      const failureUrl = process.env.GOOGLE_SHEETS_FAILURE_URL || req.body.failureUrl;
      const maintenanceUrl = process.env.GOOGLE_SHEETS_MAINTENANCE_URL || req.body.maintenanceUrl;
      
      if (!cranesUrl || !failureUrl || !maintenanceUrl) {
        return res.status(400).json({ 
          message: "Google Sheets URLs not configured. Please provide all three URLs in request body or set environment variables." 
        });
      }

      // Fetch and sync data
      const cranesResponse = await fetch(cranesUrl);
      const cranesText = await cranesResponse.text();
      
      const failureResponse = await fetch(failureUrl);
      const failureText = await failureResponse.text();
      
      const maintenanceResponse = await fetch(maintenanceUrl);
      const maintenanceText = await maintenanceResponse.text();
      
      const cranesData = Papa.parse(cranesText, { header: true }).data;
      const failureData = Papa.parse(failureText, { header: true }).data;
      const maintenanceData = Papa.parse(maintenanceText, { header: true }).data;
      
      await storage.syncDataFromSheets(cranesData, failureData, maintenanceData);
      
      res.json({ 
        message: "Data refreshed successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      res.status(500).json({ message: "Failed to refresh data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
