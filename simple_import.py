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
print(f"Read {len(df)} rows")

# Clear existing data
cursor = conn.cursor()
cursor.execute("DELETE FROM cranes")
conn.commit()

# Insert 10 sample records to test
insert_query = """
    INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) 
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

count = 0
for _, row in df.iterrows():
    if count >= 10:  # Limit to 10 records for testing
        break
        
    crane_id = str(row.get('CraneCode', '')).strip()
    if not crane_id or crane_id == 'nan':
        crane_id = str(row.get('EquipmentCode', '')).strip()
    
    if crane_id and crane_id != 'nan':
        try:
            cursor.execute(insert_query, (
                crane_id,
                str(row.get('CraneName', '')).strip() or None,
                str(row.get('Plant/Secsion', '')).strip() or None,
                '정상',
                str(row.get('InstallationLocation', '')).strip() or '',
                str(row.get('HoistingDevice', '')).strip() or '',
                str(row.get('Grade', '')).strip() or None,
                str(row.get('DriveType', '')).strip() or None,
                str(row.get('UnmannedOperation', '')).strip() or None,
                False
            ))
            count += 1
            print(f"Inserted: {crane_id}")
        except Exception as e:
            print(f"Error with {crane_id}: {e}")

conn.commit()
cursor.close()
conn.close()
print(f"Inserted {count} records successfully")