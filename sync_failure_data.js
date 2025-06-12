const { db } = require('./server/db.ts');
const { failureRecords } = require('./shared/schema.ts');

async function syncFailureData() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) {
    console.error('Google Sheets API key not found');
    return;
  }

  const spreadsheetId = '11kjTBnfPRys5ZCEzRw_N6dvPEM4KMi00XiBjPyVS70k';
  const sheetName = 'FailureReport';
  
  try {
    console.log('Fetching FailureReport data from Google Sheets...');
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.values || [];
    
    console.log(`Total rows fetched: ${rows.length}`);
    
    if (rows.length === 0) {
      console.log('No data found');
      return;
    }
    
    // Clear existing failure records
    await db.delete(failureRecords);
    console.log('Cleared existing failure records');
    
    // Process all rows (skip header)
    let processedCount = 0;
    let skippedCount = 0;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Map columns based on header: date, dayOfweek, plant, crane, grade, UnmannedOperation, symptom, starttime, endtime, worktime, shiftType, Mechanical/Electrical, byDevice, type, EquipmentCode, failureDetails, actionTaken
      const date = row[0];
      const equipmentCode = row[14];
      const symptom = row[6] || '';
      const worktime = row[9];
      const type = row[13] || 'mechanical';
      const mechanicalElectrical = row[11] || 'mechanical';
      
      if (equipmentCode && date) {
        try {
          await db.insert(failureRecords).values({
            craneId: equipmentCode,
            date: date,
            failureType: type || mechanicalElectrical || 'mechanical',
            description: symptom,
            severity: 'medium',
            downtime: null,
            cause: null,
            reportedBy: null,
            data: null,
            worktime: worktime || null,
          });
          processedCount++;
          
          if (processedCount % 100 === 0) {
            console.log(`Processed ${processedCount} records...`);
          }
        } catch (error) {
          console.error(`Error inserting record ${i}:`, error);
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Sync completed! Processed: ${processedCount}, Skipped: ${skippedCount}`);
    
    // Check unique crane count
    const uniqueCranes = await db.selectDistinct({ craneId: failureRecords.craneId }).from(failureRecords);
    console.log(`Data available for ${uniqueCranes.length} unique cranes`);
    
  } catch (error) {
    console.error('Error syncing failure data:', error);
  }
}

syncFailureData().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});