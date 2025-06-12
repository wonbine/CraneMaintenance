#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os
import sys
from datetime import datetime

def connect_db():
    return psycopg2.connect(
        host=os.getenv('PGHOST'),
        database=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD'),
        port=os.getenv('PGPORT')
    )

def batch_import(start_idx=0, batch_size=50):
    excel_file = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    crane_df = pd.read_excel(excel_file, sheet_name='CraneList')
    
    conn = connect_db()
    cursor = conn.cursor()
    
    try:
        # Get current count
        cursor.execute("SELECT COUNT(*) FROM cranes")
        current_count = cursor.fetchone()[0]
        print(f"현재 DB에 {current_count}개 크레인 존재")
        
        # Process batch
        end_idx = min(start_idx + batch_size, len(crane_df))
        batch_df = crane_df.iloc[start_idx:end_idx]
        
        success_count = 0
        for index, row in batch_df.iterrows():
            equipment_code = str(row.get('EquipmentCode', '')).strip()
            if equipment_code and equipment_code != 'nan':
                crane_id = equipment_code
                crane_name = str(row.get('CraneName', '')).strip() or str(row.get('EquipmentName', '')).strip() or None
                plant_section = str(row.get('Plant/Secsion', '')).strip() or None
                location = str(row.get('InstallationLocation', '')).strip() or ''
                model = str(row.get('HoistingDevice', '')).strip() or ''
                grade = str(row.get('Grade', '')).strip() if pd.notna(row.get('Grade')) else None
                drive_type = str(row.get('DriveType', '')).strip() if pd.notna(row.get('DriveType')) else None
                unmanned_operation = str(row.get('UnmannedOperation', '')).strip() if pd.notna(row.get('UnmannedOperation')) else None
                
                try:
                    # Check if crane already exists
                    cursor.execute("SELECT COUNT(*) FROM cranes WHERE crane_id = %s", (crane_id,))
                    if cursor.fetchone()[0] == 0:
                        cursor.execute("""
                            INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) 
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            crane_id, crane_name, plant_section, '정상', location, model, 
                            grade, drive_type, unmanned_operation, False
                        ))
                        success_count += 1
                        
                except Exception as e:
                    print(f"크레인 {equipment_code} 입력 오류: {e}")
                    continue
        
        conn.commit()
        
        # Final count
        cursor.execute("SELECT COUNT(*) FROM cranes")
        final_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT plant_section) FROM cranes WHERE plant_section IS NOT NULL")
        factory_count = cursor.fetchone()[0]
        
        print(f"배치 완료: {success_count}개 추가")
        print(f"총 크레인: {final_count}개")
        print(f"총 공장: {factory_count}개")
        
        return final_count, factory_count
        
    except Exception as e:
        print(f"오류 발생: {e}")
        conn.rollback()
        return 0, 0
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    batch_size = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    batch_import(start, batch_size)