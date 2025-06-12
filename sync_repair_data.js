import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function syncRepairData() {
  try {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = '11kjTBnfPRys5ZCEzRw_N6dvPEM4KMi00XiBjPyVS70k';
    
    if (!apiKey) {
      console.error('Google Sheets API key not found');
      return;
    }

    console.log('Fetching RepairReport data...');
    
    // Fetch RepairReport data
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RepairReport?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.values || data.values.length === 0) {
      console.log('No RepairReport data found');
      return;
    }
    
    console.log(`Found ${data.values.length} rows of RepairReport data`);
    
    // Skip header row and process maintenance records
    const records = data.values.slice(1);
    let processedCount = 0;
    let errorCount = 0;
    
    for (const row of records) {
      try {
        // RepairReport structure: ["workOrder", "taskName", "actualStartDateTime", "actualEndDateTime", "totalWorkers", "totalWorkTime", "areaName", "EquipmentCode", "EquipmentName"]
        const workOrder = row[0];
        const taskName = row[1]; 
        const actualStartDateTime = row[2];
        const actualEndDateTime = row[3];
        const totalWorkers = row[4];
        const totalWorkTime = row[5];
        const areaName = row[6];
        const equipmentCode = row[7];
        const equipmentName = row[8];
        
        if (equipmentCode && actualStartDateTime) {
          // Insert maintenance record
          await pool.query(`
            INSERT INTO maintenance_records (
              crane_id, date, type, technician, status, notes, 
              work_order, task_name, actual_start_date_time, actual_end_date_time,
              total_workers, total_work_time, area_name, equipment_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (crane_id, date, work_order) DO NOTHING
          `, [
            equipmentCode,
            actualStartDateTime,
            'repair',
            '',
            'completed',
            taskName,
            workOrder,
            taskName,
            actualStartDateTime,
            actualEndDateTime,
            totalWorkers ? parseInt(totalWorkers) : null,
            totalWorkTime ? parseFloat(totalWorkTime) : null,
            areaName,
            equipmentName
          ]);
          
          processedCount++;
          
          if (processedCount % 100 === 0) {
            console.log(`Processed ${processedCount} maintenance records...`);
          }
        }
      } catch (error) {
        errorCount++;
        if (errorCount < 10) {
          console.error(`Error processing maintenance record:`, error.message);
        }
      }
    }
    
    console.log(`RepairReport sync completed: ${processedCount} records processed, ${errorCount} errors`);
    
    // Get final statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_repairs,
        AVG(total_workers) as average_workers,
        AVG(total_work_time) as average_work_time
      FROM maintenance_records 
      WHERE total_workers IS NOT NULL AND total_work_time IS NOT NULL
    `);
    
    console.log('Maintenance Statistics:', statsResult.rows[0]);
    
  } catch (error) {
    console.error('Error syncing RepairReport data:', error);
  } finally {
    await pool.end();
  }
}

syncRepairData();