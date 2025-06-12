#!/usr/bin/env python3
import pandas as pd
import sys

def generate_crane_sql():
    excel_file = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    crane_df = pd.read_excel(excel_file, sheet_name='CraneList')
    
    print("-- Clear existing data")
    print("DELETE FROM maintenance_records;")
    print("DELETE FROM failure_records;")
    print("DELETE FROM cranes;")
    print()
    
    print("-- Insert all cranes")
    print("INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) VALUES")
    
    values = []
    for index, row in crane_df.iterrows():
        equipment_code = str(row.get('EquipmentCode', '')).strip()
        if equipment_code and equipment_code != 'nan':
            crane_name = str(row.get('CraneName', '')).strip() or str(row.get('EquipmentName', '')).strip() or None
            plant_section = str(row.get('Plant/Secsion', '')).strip() or None
            location = str(row.get('InstallationLocation', '')).strip() or ''
            model = str(row.get('HoistingDevice', '')).strip() or ''
            grade = str(row.get('Grade', '')).strip() if pd.notna(row.get('Grade')) else None
            drive_type = str(row.get('DriveType', '')).strip() if pd.notna(row.get('DriveType')) else None
            unmanned_operation = str(row.get('UnmannedOperation', '')).strip() if pd.notna(row.get('UnmannedOperation')) else None
            
            # Escape single quotes in strings
            def escape_sql(value):
                if value is None:
                    return 'NULL'
                return "'" + str(value).replace("'", "''") + "'"
            
            value_str = f"({escape_sql(equipment_code)}, {escape_sql(crane_name)}, {escape_sql(plant_section)}, '정상', {escape_sql(location)}, {escape_sql(model)}, {escape_sql(grade)}, {escape_sql(drive_type)}, {escape_sql(unmanned_operation)}, false)"
            values.append(value_str)
    
    # Split into batches to avoid SQL size limits
    batch_size = 50
    for i in range(0, len(values), batch_size):
        batch = values[i:i+batch_size]
        if i == 0:
            print(",\n".join(batch) + ";")
        else:
            print("\nINSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) VALUES")
            print(",\n".join(batch) + ";")
    
    print(f"\n-- Total cranes: {len(values)}")

if __name__ == "__main__":
    generate_crane_sql()