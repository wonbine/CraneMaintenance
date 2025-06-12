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

# Read all sheets
crane_df = pd.read_excel('attached_assets/DB용 크레인 데이터_1749738215644.xlsx', sheet_name='CraneList')
failure_df = pd.read_excel('attached_assets/DB용 크레인 데이터_1749738215644.xlsx', sheet_name='FailureReport')
repair_df = pd.read_excel('attached_assets/DB용 크레인 데이터_1749738215644.xlsx', sheet_name='RepairReport')

print(f"총 데이터: 크레인 {len(crane_df)}개, 고장기록 {len(failure_df)}개, 수리기록 {len(repair_df)}개")

# Process cranes using EquipmentCode as unique identifier
cranes_data = {}
for _, row in crane_df.iterrows():
    equipment_code = str(row.get('EquipmentCode', '')).strip()
    if equipment_code and equipment_code != 'nan':
        # Use EquipmentCode + row index to ensure uniqueness
        unique_id = f"{equipment_code}_{len(cranes_data)}"
        
        cranes_data[equipment_code] = {
            'equipment_code': equipment_code,
            'crane_id': unique_id,
            'crane_name': str(row.get('CraneName', '')).strip() or None,
            'plant_section': str(row.get('Plant/Secsion', '')).strip() or None,
            'grade': str(row.get('Grade', '')).strip() if pd.notna(row.get('Grade')) else None,
            'drive_type': str(row.get('DriveType', '')).strip() if pd.notna(row.get('DriveType')) else None,
            'unmanned_operation': str(row.get('UnmannedOperation', '')).strip() if pd.notna(row.get('UnmannedOperation')) else None,
            'location': str(row.get('InstallationLocation', '')).strip() or '',
            'model': str(row.get('HoistingDevice', '')).strip() or ''
        }

cursor = conn.cursor()

try:
    # Clear all existing data
    cursor.execute("DELETE FROM maintenance_records")
    cursor.execute("DELETE FROM failure_records") 
    cursor.execute("DELETE FROM cranes")
    conn.commit()
    
    # Insert cranes using parameterized queries
    insert_crane_sql = """
        INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    crane_count = 0
    for equipment_code, crane in cranes_data.items():
        cursor.execute(insert_crane_sql, (
            crane['crane_id'],
            crane['crane_name'],
            crane['plant_section'],
            '정상',
            crane['location'],
            crane['model'],
            crane['grade'],
            crane['drive_type'],
            crane['unmanned_operation'],
            False
        ))
        crane_count += 1
        
        if crane_count % 50 == 0:
            conn.commit()
            print(f"크레인 {crane_count}개 입력 완료")
    
    conn.commit()
    
    # Insert failure records (sample)
    failure_count = 0
    for _, row in failure_df.head(100).iterrows():  # First 100 records
        equipment_code = str(row.get('EquipmentCode', '')).strip()
        if equipment_code in cranes_data:
            try:
                cursor.execute("""
                    INSERT INTO failure_records (crane_id, date, type, description, status, severity) 
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    cranes_data[equipment_code]['crane_id'],
                    '2024-01-01',
                    str(row.get('FailureType', '기타')).strip(),
                    str(row.get('Description', '고장 발생')).strip(),
                    '완료',
                    'medium'
                ))
                failure_count += 1
            except:
                pass
    
    conn.commit()
    print(f"고장 기록 {failure_count}개 입력 완료")
    
    # Insert repair records (sample)
    repair_count = 0 
    for _, row in repair_df.head(100).iterrows():  # First 100 records
        equipment_code = str(row.get('EquipmentCode', '')).strip()
        if equipment_code in cranes_data:
            try:
                cursor.execute("""
                    INSERT INTO maintenance_records (crane_id, date, type, description, status, technician) 
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    cranes_data[equipment_code]['crane_id'],
                    '2024-01-01',
                    '수리',
                    str(row.get('TaskName', '정비 작업')).strip(),
                    '완료',
                    '정비팀'
                ))
                repair_count += 1
            except:
                pass
    
    conn.commit()
    print(f"수리 기록 {repair_count}개 입력 완료")
    
    print("데이터 가져오기 완료!")
    
except Exception as e:
    print(f"오류 발생: {e}")
    conn.rollback()
finally:
    cursor.close()
    conn.close()