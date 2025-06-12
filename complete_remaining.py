#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os

def complete_remaining():
    excel_file = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    
    conn = psycopg2.connect(
        host=os.getenv('PGHOST'),
        database=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD'),
        port=os.getenv('PGPORT')
    )
    cursor = conn.cursor()
    
    # Get existing crane IDs
    cursor.execute("SELECT crane_id FROM cranes")
    existing_ids = set(row[0] for row in cursor.fetchall())
    print(f"현재 {len(existing_ids)}개 크레인 존재")
    
    crane_df = pd.read_excel(excel_file, sheet_name='CraneList')
    print(f"엑셀 파일에 총 {len(crane_df)}개 크레인")
    
    missing_cranes = []
    
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
            
            missing_cranes.append({
                'equipment_code': equipment_code,
                'crane_name': crane_name,
                'plant_section': plant_section,
                'location': location,
                'model': model,
                'grade': grade,
                'drive_type': drive_type,
                'unmanned_operation': unmanned_operation
            })
    
    print(f"누락된 크레인: {len(missing_cranes)}개")
    
    # Insert missing cranes one by one
    inserted = 0
    for crane in missing_cranes:
        try:
            cursor.execute("""
                INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                crane['equipment_code'], crane['crane_name'], crane['plant_section'], '정상', 
                crane['location'], crane['model'], crane['grade'], crane['drive_type'], 
                crane['unmanned_operation'], False
            ))
            conn.commit()
            inserted += 1
            print(f"크레인 {crane['equipment_code']} 추가 완료 ({inserted}/{len(missing_cranes)})")
        except Exception as e:
            print(f"크레인 {crane['equipment_code']} 입력 오류: {e}")
            continue
    
    # Final verification
    cursor.execute("SELECT COUNT(*) FROM cranes")
    total_cranes = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT plant_section) FROM cranes WHERE plant_section IS NOT NULL")
    total_factories = cursor.fetchone()[0]
    
    cursor.execute("SELECT plant_section, COUNT(*) FROM cranes WHERE plant_section IS NOT NULL GROUP BY plant_section ORDER BY COUNT(*) DESC")
    factory_stats = cursor.fetchall()
    
    print(f"\n최종 결과:")
    print(f"총 크레인: {total_cranes}개")
    print(f"총 공장: {total_factories}개")
    print("\n공장별 크레인 수:")
    for factory, count in factory_stats:
        print(f"  {factory}: {count}개")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    complete_remaining()