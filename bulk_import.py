#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os

# Connect to database
conn = psycopg2.connect(
    host=os.getenv('PGHOST'),
    database=os.getenv('PGDATABASE'),
    user=os.getenv('PGUSER'),
    password=os.getenv('PGPASSWORD'),
    port=os.getenv('PGPORT')
)

# Read Excel file
df = pd.read_excel('attached_assets/DB용 크레인 데이터_1749738215644.xlsx', sheet_name='CraneList')
print(f"Read {len(df)} rows from Excel")

# Process and deduplicate data
processed_cranes = {}
for _, row in df.iterrows():
    crane_id = str(row.get('CraneCode', '')).strip()
    if not crane_id or crane_id == 'nan':
        crane_id = str(row.get('EquipmentCode', '')).strip()
    
    if crane_id and crane_id != 'nan' and crane_id != '':
        # Use the first occurrence of each crane_id
        if crane_id not in processed_cranes:
            processed_cranes[crane_id] = {
                'crane_id': crane_id,
                'crane_name': str(row.get('CraneName', '')).strip() or str(row.get('EquipmentName', '')).strip() or None,
                'plant_section': str(row.get('Plant/Secsion', '')).strip() or None,
                'status': '정상',
                'location': str(row.get('InstallationLocation', '')).strip() or '',
                'model': str(row.get('HoistingDevice', '')).strip() or '',
                'grade': str(row.get('Grade', '')).strip() or None,
                'drive_type': str(row.get('DriveType', '')).strip() or None,
                'unmanned_operation': str(row.get('UnmannedOperation', '')).strip() or None,
                'is_urgent': False
            }

print(f"Processed {len(processed_cranes)} unique cranes")

# Clear existing data and insert new data
cursor = conn.cursor()

try:
    # Clear existing data
    cursor.execute("DELETE FROM cranes")
    print("Cleared existing crane data")
    
    # Bulk insert using executemany
    insert_query = """
        INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) 
        VALUES (%(crane_id)s, %(crane_name)s, %(plant_section)s, %(status)s, %(location)s, %(model)s, %(grade)s, %(drive_type)s, %(unmanned_operation)s, %(is_urgent)s)
    """
    
    # Convert to list for executemany
    crane_data_list = list(processed_cranes.values())
    
    # Insert all data at once
    cursor.executemany(insert_query, crane_data_list)
    
    # Commit transaction
    conn.commit()
    print(f"Successfully inserted {len(crane_data_list)} crane records")
    
except Exception as e:
    print(f"Error during import: {e}")
    conn.rollback()
    
finally:
    cursor.close()
    conn.close()