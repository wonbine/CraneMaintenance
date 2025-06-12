#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os

def verify_crane_count():
    excel_file = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    
    # Read Excel file
    crane_df = pd.read_excel(excel_file, sheet_name='CraneList')
    
    # Count valid cranes in Excel
    valid_excel_cranes = []
    for index, row in crane_df.iterrows():
        equipment_code = str(row.get('EquipmentCode', '')).strip()
        if equipment_code and equipment_code != 'nan':
            valid_excel_cranes.append(equipment_code)
    
    print(f"엑셀 파일의 유효한 크레인 수: {len(valid_excel_cranes)}개")
    print(f"엑셀 파일의 유니크 크레인 수: {len(set(valid_excel_cranes))}개")
    
    # Check for duplicates in Excel
    excel_duplicates = []
    seen = set()
    for crane_id in valid_excel_cranes:
        if crane_id in seen:
            excel_duplicates.append(crane_id)
        seen.add(crane_id)
    
    if excel_duplicates:
        print(f"엑셀 파일에 중복된 크레인: {excel_duplicates}")
    else:
        print("엑셀 파일에 중복 없음")
    
    # Connect to DB and check
    conn = psycopg2.connect(
        host=os.getenv('PGHOST'),
        database=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD'),
        port=os.getenv('PGPORT')
    )
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM cranes")
    db_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT plant_section) FROM cranes WHERE plant_section IS NOT NULL")
    factory_count = cursor.fetchone()[0]
    
    print(f"DB의 크레인 수: {db_count}개")
    print(f"DB의 공장 수: {factory_count}개")
    
    # Find extra cranes in DB
    cursor.execute("SELECT crane_id FROM cranes")
    db_cranes = [row[0] for row in cursor.fetchall()]
    
    excel_set = set(valid_excel_cranes)
    db_set = set(db_cranes)
    
    extra_in_db = db_set - excel_set
    missing_in_db = excel_set - db_set
    
    print(f"\nDB에만 있는 크레인 ({len(extra_in_db)}개): {list(extra_in_db)}")
    print(f"DB에 없는 크레인 ({len(missing_in_db)}개): {list(missing_in_db)}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    verify_crane_count()