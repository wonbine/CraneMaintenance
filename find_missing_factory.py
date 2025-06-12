#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os

def find_missing_factory():
    excel_file = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    
    conn = psycopg2.connect(
        host=os.getenv('PGHOST'),
        database=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD'),
        port=os.getenv('PGPORT')
    )
    cursor = conn.cursor()
    
    # Get existing factories in DB
    cursor.execute("SELECT DISTINCT plant_section FROM cranes WHERE plant_section IS NOT NULL ORDER BY plant_section")
    db_factories = set(row[0] for row in cursor.fetchall())
    print(f"DB에 있는 공장 ({len(db_factories)}개):")
    for factory in sorted(db_factories):
        print(f"  - {factory}")
    
    # Get all factories from Excel
    crane_df = pd.read_excel(excel_file, sheet_name='CraneList')
    excel_factories = set()
    
    for index, row in crane_df.iterrows():
        plant_section = str(row.get('Plant/Secsion', '')).strip()
        if plant_section and plant_section != 'nan':
            excel_factories.add(plant_section)
    
    print(f"\n엑셀에 있는 공장 ({len(excel_factories)}개):")
    for factory in sorted(excel_factories):
        print(f"  - {factory}")
    
    # Find missing factories
    missing_factories = excel_factories - db_factories
    print(f"\n누락된 공장 ({len(missing_factories)}개):")
    for factory in sorted(missing_factories):
        print(f"  - {factory}")
        
        # Find cranes in missing factory
        missing_cranes = []
        for index, row in crane_df.iterrows():
            if str(row.get('Plant/Secsion', '')).strip() == factory:
                equipment_code = str(row.get('EquipmentCode', '')).strip()
                if equipment_code and equipment_code != 'nan':
                    missing_cranes.append(equipment_code)
        
        print(f"    해당 공장의 크레인: {missing_cranes}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    find_missing_factory()