import Papa from "papaparse";

export interface GoogleSheetsConfig {
  cranesUrl: string;
  maintenanceUrl: string;
}

export class GoogleSheetsService {
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  async fetchCranesData(): Promise<any[]> {
    try {
      const response = await fetch(this.config.cranesUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch cranes data: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_')
      });

      if (parsed.errors.length > 0) {
        console.warn('CSV parsing errors:', parsed.errors);
      }

      return parsed.data;
    } catch (error) {
      console.error('Error fetching cranes data:', error);
      throw new Error('Failed to fetch cranes data from Google Sheets');
    }
  }

  async fetchMaintenanceData(): Promise<any[]> {
    try {
      const response = await fetch(this.config.maintenanceUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch maintenance data: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_')
      });

      if (parsed.errors.length > 0) {
        console.warn('CSV parsing errors:', parsed.errors);
      }

      return parsed.data;
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
      throw new Error('Failed to fetch maintenance data from Google Sheets');
    }
  }

  async syncData(): Promise<void> {
    try {
      const [cranesData, maintenanceData] = await Promise.all([
        this.fetchCranesData(),
        this.fetchMaintenanceData()
      ]);

      const response = await fetch('/api/sync-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cranesUrl: this.config.cranesUrl,
          maintenanceUrl: this.config.maintenanceUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error syncing data:', error);
      throw new Error('Failed to sync data with backend');
    }
  }

  static createFromEnv(): GoogleSheetsService | null {
    const cranesUrl = import.meta.env.VITE_GOOGLE_SHEETS_CRANES_URL;
    const maintenanceUrl = import.meta.env.VITE_GOOGLE_SHEETS_MAINTENANCE_URL;

    if (!cranesUrl || !maintenanceUrl) {
      return null;
    }

    return new GoogleSheetsService({ cranesUrl, maintenanceUrl });
  }
}

// Utility function to create Google Sheets CSV export URL
export function createGoogleSheetsUrl(spreadsheetId: string, sheetName?: string): string {
  const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  return sheetName ? `${baseUrl}&gid=${sheetName}` : baseUrl;
}

// Example URLs for documentation:
// Cranes sheet: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/export?format=csv&gid=0
// Maintenance sheet: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/export?format=csv&gid=1234567890
