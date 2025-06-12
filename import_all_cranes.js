import https from 'https';

const spreadsheetId = '11kjTBnfPRys5ZCEzRw_N6dvPEM4KMi00XiBjPyVS70k';
const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CraneList!A1:Z?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.values && jsonData.values.length > 1) {
        const headers = jsonData.values[0];
        const rows = jsonData.values.slice(1); // All rows except header
        
        console.log(`Total rows found: ${rows.length}`);
        
        const cranes = [];
        
        rows.forEach((row, index) => {
          if (row[0]) { // Has equipment code
            const equipmentCode = row[0];
            const plantSection = row[1] || '';
            const craneName = row[3] || '';
            const location = row[11] || '';
            
            // Skip if essential data is missing
            if (!equipmentCode || !plantSection) return;
            
            cranes.push({
              equipmentCode: equipmentCode,
              plantSection: plantSection,
              craneName: craneName,
              location: location,
              status: 'operating'
            });
          }
        });
        
        console.log(`Processing ${cranes.length} valid cranes out of ${rows.length} total rows`);
        
        // Split into batches for SQL insertion
        const batchSize = 50;
        const batches = [];
        
        for (let i = 0; i < cranes.length; i += batchSize) {
          batches.push(cranes.slice(i, i + batchSize));
        }
        
        console.log(`\nCreating ${batches.length} SQL batches:`);
        
        batches.forEach((batch, batchIndex) => {
          console.log(`\n-- Batch ${batchIndex + 1} (${batch.length} cranes)`);
          console.log('INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model) VALUES');
          
          const values = batch.map(crane => {
            const escapedPlantSection = crane.plantSection.replace(/'/g, "''");
            const escapedCraneName = crane.craneName.replace(/'/g, "''");
            const escapedLocation = crane.location.replace(/'/g, "''");
            
            return `('${crane.equipmentCode}', '${escapedCraneName}', '${escapedPlantSection}', '${crane.status}', '${escapedLocation}', 'Bridge Crane')`;
          });
          
          console.log(values.join(',\n') + ';');
        });
        
      } else {
        console.log('No data found');
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err);
});