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

# Process unique cranes
unique_cranes = {}
for _, row in df.iterrows():
    crane_id = str(row.get('CraneCode', '')).strip()
    if not crane_id or crane_id == 'nan':
        crane_id = str(row.get('EquipmentCode', '')).strip()
    
    if crane_id and crane_id != 'nan' and crane_id != '':
        if crane_id not in unique_cranes:
            unique_cranes[crane_id] = {
                'crane_id': crane_id,
                'crane_name': str(row.get('CraneName', '')).strip(),
                'plant_section': str(row.get('Plant/Secsion', '')).strip(),
                'grade': str(row.get('Grade', '')).strip() if pd.notna(row.get('Grade')) else None,
                'drive_type': str(row.get('DriveType', '')).strip() if pd.notna(row.get('DriveType')) else None,
                'unmanned_operation': str(row.get('UnmannedOperation', '')).strip() if pd.notna(row.get('UnmannedOperation')) else None,
                'location': str(row.get('InstallationLocation', '')).strip(),
                'model': str(row.get('HoistingDevice', '')).strip() if pd.notna(row.get('HoistingDevice')) else '',
            }

# Generate SQL VALUES
values_list = []
for crane in unique_cranes.values():
    crane_name = crane['crane_name'].replace("'", "''") if crane['crane_name'] else 'NULL'
    plant_section = crane['plant_section'].replace("'", "''") if crane['plant_section'] else 'NULL'
    grade = f"'{crane['grade']}'" if crane['grade'] else 'NULL'
    drive_type = f"'{crane['drive_type']}'" if crane['drive_type'] else 'NULL'
    unmanned_operation = f"'{crane['unmanned_operation']}'" if crane['unmanned_operation'] else 'NULL'
    location = crane['location'].replace("'", "''") if crane['location'] else ''
    model = crane['model'].replace("'", "''") if crane['model'] else ''
    
    values_list.append(f"('{crane['crane_id']}', '{crane_name}', '{plant_section}', '정상', '{location}', '{model}', {grade}, {drive_type}, {unmanned_operation}, false)")

# Execute bulk insert
cursor = conn.cursor()
try:
    cursor.execute("DELETE FROM cranes")
    
    sql = f"""
    INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent)
    VALUES {', '.join(values_list[:50])}
    """
    
    cursor.execute(sql)
    conn.commit()
    print(f"Inserted first 50 cranes successfully")
    
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    cursor.close()
    conn.close()