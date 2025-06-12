#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os

def bulk_insert_remaining():
    excel_file = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    crane_df = pd.read_excel(excel_file, sheet_name='CraneList')
    
    conn = psycopg2.connect(
        host=os.getenv('PGHOST'),
        database=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD'),
        port=os.getenv('PGPORT')
    )
    cursor = conn.cursor()
    
    # Get current count
    cursor.execute("SELECT COUNT(*) FROM cranes")
    current_count = cursor.fetchone()[0]
    print(f"현재 {current_count}개 크레인 존재")
    
    # Skip first 51 rows (already inserted)
    remaining_df = crane_df.iloc[51:]
    print(f"추가 입력할 크레인: {len(remaining_df)}개")
    
    # Prepare batch insert
    values = []
    for index, row in remaining_df.iterrows():
        equipment_code = str(row.get('EquipmentCode', '')).strip()
        if equipment_code and equipment_code != 'nan':
            crane_name = str(row.get('CraneName', '')).strip() or str(row.get('EquipmentName', '')).strip() or None
            plant_section = str(row.get('Plant/Secsion', '')).strip() or None
            location = str(row.get('InstallationLocation', '')).strip() or ''
            model = str(row.get('HoistingDevice', '')).strip() or ''
            grade = str(row.get('Grade', '')).strip() if pd.notna(row.get('Grade')) else None
            drive_type = str(row.get('DriveType', '')).strip() if pd.notna(row.get('DriveType')) else None
            unmanned_operation = str(row.get('UnmannedOperation', '')).strip() if pd.notna(row.get('UnmannedOperation')) else None
            
            values.append((
                equipment_code, crane_name, plant_section, '정상', location, model,
                grade, drive_type, unmanned_operation, False
            ))
    
    # Batch insert in chunks of 25
    inserted = 0
    for i in range(0, len(values), 25):
        chunk = values[i:i+25]
        try:
            cursor.executemany("""
                INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (crane_id) DO NOTHING
            """, chunk)
            inserted += len(chunk)
            conn.commit()
            print(f"{inserted}개 크레인 입력 완료")
        except Exception as e:
            print(f"배치 입력 오류: {e}")
            conn.rollback()
            break
    
    # Final count
    cursor.execute("SELECT COUNT(*) FROM cranes")
    total_cranes = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT plant_section) FROM cranes WHERE plant_section IS NOT NULL")
    total_factories = cursor.fetchone()[0]
    
    print(f"최종 결과: 크레인 {total_cranes}개, 공장 {total_factories}개")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    bulk_insert_remaining()