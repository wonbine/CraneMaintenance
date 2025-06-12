#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os

def import_remaining_cranes():
    excel_file = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    
    conn = psycopg2.connect(
        host=os.getenv('PGHOST'),
        database=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD'),
        port=os.getenv('PGPORT')
    )
    cursor = conn.cursor()
    
    # Get existing crane IDs to avoid duplicates
    cursor.execute("SELECT crane_id FROM cranes")
    existing_ids = set(row[0] for row in cursor.fetchall())
    
    crane_df = pd.read_excel(excel_file, sheet_name='CraneList')
    
    inserted = 0
    batch_values = []
    
    for index, row in crane_df.iterrows():
        equipment_code = str(row.get('EquipmentCode', '')).strip()
        if equipment_code and equipment_code != 'nan' and equipment_code not in existing_ids:
            crane_name = str(row.get('CraneName', '')).strip() or str(row.get('EquipmentName', '')).strip() or None
            plant_section = str(row.get('Plant/Secsion', '')).strip() or None
            location = str(row.get('InstallationLocation', '')).strip() or ''
            model = str(row.get('HoistingDevice', '')).strip() or ''
            grade = str(row.get('Grade', '')).strip() if pd.notna(row.get('Grade')) else None
            drive_type = str(row.get('DriveType', '')).strip() if pd.notna(row.get('DriveType')) else None
            unmanned_operation = str(row.get('UnmannedOperation', '')).strip() if pd.notna(row.get('UnmannedOperation')) else None
            
            batch_values.append((
                equipment_code, crane_name, plant_section, '정상', location, model,
                grade, drive_type, unmanned_operation, False
            ))
            
            if len(batch_values) >= 20:
                try:
                    cursor.executemany("""
                        INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, batch_values)
                    conn.commit()
                    inserted += len(batch_values)
                    print(f"{inserted}개 크레인 추가 완료")
                    batch_values = []
                except Exception as e:
                    print(f"배치 입력 오류: {e}")
                    conn.rollback()
                    batch_values = []
    
    # Insert remaining batch
    if batch_values:
        try:
            cursor.executemany("""
                INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, batch_values)
            conn.commit()
            inserted += len(batch_values)
            print(f"최종 {inserted}개 크레인 추가 완료")
        except Exception as e:
            print(f"최종 배치 입력 오류: {e}")
            conn.rollback()
    
    # Final count
    cursor.execute("SELECT COUNT(*) FROM cranes")
    total_cranes = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT plant_section) FROM cranes WHERE plant_section IS NOT NULL")
    total_factories = cursor.fetchone()[0]
    
    print(f"최종 결과: 총 크레인 {total_cranes}개, 공장 {total_factories}개")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    import_remaining_cranes()