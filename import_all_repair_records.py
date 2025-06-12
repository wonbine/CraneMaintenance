#!/usr/bin/env python3

import pandas as pd
import psycopg2
import os
from datetime import datetime
import sys

def import_all_repair_records():
    """Import all RepairReport records with correct EquipmentCode mapping"""
    
    try:
        # Connect to database
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cursor = conn.cursor()
        
        # Read RepairReport data
        file_path = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
        print(f"Reading RepairReport data from {file_path}...")
        repair_df = pd.read_excel(file_path, sheet_name='RepairReport')
        
        print(f"Found {len(repair_df)} total RepairReport records")
        
        # Filter out records without EquipmentCode
        valid_records = repair_df[repair_df['EquipmentCode'].notna() & (repair_df['EquipmentCode'] != '')]
        print(f"Valid records with EquipmentCode: {len(valid_records)}")
        
        # Group by EquipmentCode to show distribution
        equipment_counts = valid_records['EquipmentCode'].value_counts()
        print(f"Records per equipment: {equipment_counts.head(10).to_dict()}")
        
        # Import all records
        imported_count = 0
        for i, (_, repair) in enumerate(valid_records.iterrows()):
            try:
                equipment_code = str(repair['EquipmentCode']).strip()
                
                # Get date values
                date_val = repair.get('actualStartDateTime')
                if pd.notna(date_val):
                    if isinstance(date_val, str):
                        date_str = date_val[:10] if len(date_val) >= 10 else '2024-01-15'
                    else:
                        date_str = date_val.strftime('%Y-%m-%d')
                else:
                    date_str = '2024-01-15'
                
                # Get work order
                work_order = str(repair.get('workOrder', '')) if pd.notna(repair.get('workOrder')) else ''
                
                # Get task name
                task_name = str(repair.get('taskName', '')) if pd.notna(repair.get('taskName')) else ''
                
                # Get area name
                area_name = str(repair.get('areaName', '')) if pd.notna(repair.get('areaName')) else ''
                
                # Get equipment name
                equipment_name = str(repair.get('EquipmentName', '')) if pd.notna(repair.get('EquipmentName')) else ''
                
                # Get total workers
                total_workers = 1
                if pd.notna(repair.get('totalWorkers')):
                    try:
                        total_workers = int(float(repair.get('totalWorkers')))
                    except:
                        total_workers = 1
                
                cursor.execute('''
                    INSERT INTO maintenance_records (
                        crane_id, type, date, work_order, task_name,
                        actual_start_date_time, actual_end_date_time,
                        total_workers, total_work_time, area_name, equipment_name,
                        status, technician
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (
                    equipment_code,
                    'repair',
                    date_str,
                    work_order,
                    task_name,
                    date_str + ' 08:00:00',
                    date_str + ' 16:00:00',
                    total_workers,
                    8,
                    area_name,
                    equipment_name,
                    'completed',
                    'maintenance_team'
                ))
                
                imported_count += 1
                
                if imported_count % 100 == 0:
                    conn.commit()
                    print(f"Imported {imported_count} records...")
                    
            except Exception as e:
                print(f"Error importing record {i}: {e}")
                continue
        
        conn.commit()
        print(f"Successfully imported {imported_count} maintenance records")
        
        # Verify specific crane records
        cursor.execute('SELECT COUNT(*) FROM maintenance_records WHERE crane_id = %s', ('4P1001201',))
        ct73_count = cursor.fetchone()[0]
        print(f"CT73_PCM (4P1001201) now has {ct73_count} maintenance records")
        
        cursor.execute('SELECT COUNT(*) FROM maintenance_records')
        total_count = cursor.fetchone()[0]
        print(f"Total maintenance records in database: {total_count}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error during import: {e}")
        return False

if __name__ == "__main__":
    success = import_all_repair_records()
    sys.exit(0 if success else 1)