export interface GoogleSheetsConfig {
  cranesSpreadsheetId: string;
  failureSpreadsheetId: string;
  maintenanceSpreadsheetId: string;
  cranesSheetName?: string;
  failureSheetName?: string;
  maintenanceSheetName?: string;
}

export class GoogleSheetsService {
  private config: GoogleSheetsConfig;
  private apiKey: string;

  constructor(config: GoogleSheetsConfig, apiKey: string) {
    this.config = config;
    this.apiKey = apiKey;
  }

  async fetchCranesData(): Promise<any[]> {
    return this.fetchSheetData(this.config.cranesSpreadsheetId, this.config.cranesSheetName);
  }

  async fetchFailureData(): Promise<any[]> {
    return this.fetchSheetData(this.config.failureSpreadsheetId, this.config.failureSheetName);
  }

  async fetchMaintenanceData(): Promise<any[]> {
    return this.fetchSheetData(this.config.maintenanceSpreadsheetId, this.config.maintenanceSheetName);
  }

  private async fetchSheetData(spreadsheetId: string, sheetName?: string): Promise<any[]> {
    try {
      const range = sheetName ? `${sheetName}!A:Z` : 'A:Z';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${this.apiKey}`;
      
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
    } catch (error) {
      throw new Error(`데이터 가져오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  async syncData(): Promise<void> {
    try {
      const [cranesData, failureData, maintenanceData] = await Promise.all([
        this.fetchCranesData(),
        this.fetchFailureData(), 
        this.fetchMaintenanceData()
      ]);

      // Send data to backend for processing
      const response = await fetch('/api/sync-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cranesData,
          failureData,
          maintenanceData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`동기화 실패: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      throw new Error(`동기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  static createFromConfig(config: GoogleSheetsConfig): GoogleSheetsService | null {
    // Note: API key is handled server-side for security
    return new GoogleSheetsService(config, '');
  }
}

export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function createGoogleSheetsUrl(spreadsheetId: string, sheetName?: string): string {
  const range = sheetName ? `${sheetName}!A:Z` : 'A:Z';
  return `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
}
