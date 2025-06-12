#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os
from datetime import datetime

# Connect to database
conn = psycopg2.connect(
    host=os.getenv('PGHOST'),
    database=os.getenv('PGDATABASE'),
    user=os.getenv('PGUSER'),
    password=os.getenv('PGPASSWORD'),
    port=os.getenv('PGPORT')
)

# Read all sheets from Excel file
excel_file = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
crane_df = pd.read_excel(excel_file, sheet_name='CraneList')
failure_df = pd.read_excel(excel_file, sheet_name='FailureReport')
repair_df = pd.read_excel(excel_file, sheet_name='RepairReport')

print(f"CraneList: {len(crane_df)} rows")
print(f"FailureReport: {len(failure_df)} rows")
print(f"RepairReport: {len(repair_df)} rows")

# Process all unique cranes (not just 50)
unique_cranes = {}
for _, row in crane_df.iterrows():
    equipment_code = str(row.get('EquipmentCode', '')).strip()
    crane_code = str(row.get('CraneCode', '')).strip()
    
    # Use EquipmentCode as primary identifier
    if equipment_code and equipment_code != 'nan' and equipment_code != '':
        if equipment_code not in unique_cranes:
            unique_cranes[equipment_code] = {
                'crane_id': crane_code if crane_code and crane_code != 'nan' else equipment_code,
                'crane_name': str(row.get('CraneName', '')).strip() or str(row.get('EquipmentName', '')).strip() or None,
                'plant_section': str(row.get('Plant/Secsion', '')).strip() or None,
                'status': '정상',
                'location': str(row.get('InstallationLocation', '')).strip() or '',
                'model': str(row.get('HoistingDevice', '')).strip() or '',
                'grade': str(row.get('Grade', '')).strip() if pd.notna(row.get('Grade')) else None,
                'drive_type': str(row.get('DriveType', '')).strip() if pd.notna(row.get('DriveType')) else None,
                'unmanned_operation': str(row.get('UnmannedOperation', '')).strip() if pd.notna(row.get('UnmannedOperation')) else None,
                'installation_date': None,
                'last_maintenance_date': None,
                'is_urgent': False
            }
            
            # Handle installation date
            if pd.notna(row.get('InstallationDate')):
                try:
                    install_date = pd.to_datetime(row.get('InstallationDate'))
                    unique_cranes[equipment_code]['installation_date'] = install_date.strftime('%Y-%m-%d')
                except:
                    pass
            
            # Handle inspection reference date as last maintenance
            if pd.notna(row.get('InspectionReferenceDate')):
                try:
                    ref_date = pd.to_datetime(row.get('InspectionReferenceDate'))
                    unique_cranes[equipment_code]['last_maintenance_date'] = ref_date.strftime('%Y-%m-%d')
                except:
                    pass

print(f"Processed {len(unique_cranes)} unique cranes")

# Clear existing data and insert all cranes
cursor = conn.cursor()

try:
    # Clear existing data
    cursor.execute("DELETE FROM maintenance_records")
    cursor.execute("DELETE FROM failure_records")
    cursor.execute("DELETE FROM cranes")
    print("Cleared existing data")
    
    # Insert all cranes
    for equipment_code, crane_data in unique_cranes.items():
        try:
            cursor.execute("""
                INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, 
                                  grade, drive_type, unmanned_operation, installation_date, 
                                  last_maintenance_date, is_urgent) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                crane_data['crane_id'],
                crane_data['crane_name'],
                crane_data['plant_section'],
                crane_data['status'],
                crane_data['location'],
                crane_data['model'],
                crane_data['grade'],
                crane_data['drive_type'],
                crane_data['unmanned_operation'],
                crane_data['installation_date'],
                crane_data['last_maintenance_date'],
                crane_data['is_urgent']
            ))
        except Exception as e:
            print(f"Error inserting crane {equipment_code}: {e}")
    
    conn.commit()
    
    # Count inserted cranes
    cursor.execute("SELECT COUNT(*) FROM cranes")
    crane_count = cursor.fetchone()[0]
    print(f"Inserted {crane_count} cranes")
    
    # Insert failure records
    failure_count = 0
    for _, row in failure_df.iterrows():
        equipment_code = str(row.get('EquipmentCode', '')).strip()
        if equipment_code and equipment_code in unique_cranes:
            try:
                failure_date = None
                if pd.notna(row.get('FailureDate')):
                    failure_date = pd.to_datetime(row.get('FailureDate')).strftime('%Y-%m-%d')
                
                cursor.execute("""
                    INSERT INTO failure_records (crane_id, date, type, description, status, severity) 
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    unique_cranes[equipment_code]['crane_id'],
                    failure_date or '2024-01-01',
                    str(row.get('FailureType', '기타')).strip(),
                    str(row.get('Description', '')).strip() or '고장 발생',
                    '완료',
                    'medium'
                ))
                failure_count += 1
            except Exception as e:
                print(f"Error inserting failure for {equipment_code}: {e}")
    
    conn.commit()
    print(f"Inserted {failure_count} failure records")
    
    # Insert maintenance/repair records  
    repair_count = 0
    for _, row in repair_df.iterrows():
        equipment_code = str(row.get('EquipmentCode', '')).strip()
        if equipment_code and equipment_code in unique_cranes:
            try:
                repair_date = None
                if pd.notna(row.get('ActualStartDateTime')):
                    repair_date = pd.to_datetime(row.get('ActualStartDateTime')).strftime('%Y-%m-%d')
                elif pd.notna(row.get('ActualEndDateTime')):
                    repair_date = pd.to_datetime(row.get('ActualEndDateTime')).strftime('%Y-%m-%d')
                
                total_workers = None
                if pd.notna(row.get('TotalWorkers')):
                    try:
                        total_workers = int(float(row.get('TotalWorkers')))
                    except:
                        pass
                
                total_work_time = None
                if pd.notna(row.get('TotalWorkTime')):
                    try:
                        total_work_time = float(row.get('TotalWorkTime'))
                    except:
                        pass
                
                cursor.execute("""
                    INSERT INTO maintenance_records (crane_id, date, type, description, status, 
                                                   total_workers, total_work_time, technician) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    unique_cranes[equipment_code]['crane_id'],
                    repair_date or '2024-01-01',
                    '수리',
                    str(row.get('TaskName', '')).strip() or '정비 작업',
                    '완료',
                    total_workers,
                    total_work_time,
                    str(row.get('Technician', '')).strip() or '정비팀'
                ))
                repair_count += 1
            except Exception as e:
                print(f"Error inserting repair for {equipment_code}: {e}")
    
    conn.commit()
    print(f"Inserted {repair_count} maintenance records")
    
    # Final counts
    cursor.execute("SELECT COUNT(*) FROM cranes")
    final_crane_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM failure_records")
    final_failure_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM maintenance_records")
    final_maintenance_count = cursor.fetchone()[0]
    
    print(f"\nFinal counts:")
    print(f"Cranes: {final_crane_count}")
    print(f"Failure records: {final_failure_count}")
    print(f"Maintenance records: {final_maintenance_count}")
    
except Exception as e:
    print(f"Error during import: {e}")
    conn.rollback()
    
finally:
    cursor.close()
    conn.close()