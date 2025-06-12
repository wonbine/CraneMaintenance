#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os
import random

def import_all_repair_data():
    """Import RepairReport data and distribute across all cranes"""
    
    # Connect to database
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Clear existing maintenance records
    cursor.execute('DELETE FROM maintenance_records')
    
    # Read RepairReport data
    file_path = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    repair_df = pd.read_excel(file_path, sheet_name='RepairReport')
    
    # Get all crane IDs from database
    cursor.execute('SELECT crane_id FROM cranes')
    all_crane_ids = [row[0] for row in cursor.fetchall()]
    
    print(f"Found {len(repair_df)} repair records and {len(all_crane_ids)} cranes")
    
    # Import repair records, distributing them across all cranes
    imported = 0
    for i, (_, repair) in enumerate(repair_df.iterrows()):
        try:
            # Use the original EquipmentCode if it matches a crane ID
            equipment_code = str(repair.get('EquipmentCode', ''))
            
            if equipment_code in all_crane_ids:
                crane_id = equipment_code
            else:
                # Distribute repairs across all cranes cyclically
                crane_id = all_crane_ids[i % len(all_crane_ids)]
            
            # Parse work time if it's in time format
            work_time = 8  # default
            total_work_time = repair.get('totalWorkTime', '')
            if pd.notna(total_work_time) and ':' in str(total_work_time):
                try:
                    hours, minutes = str(total_work_time).split(':')
                    work_time = int(hours) + (int(minutes) / 60)
                except:
                    work_time = 8
            
            # Parse workers
            workers = 1
            if pd.notna(repair.get('totalWorkers')):
                try:
                    workers = int(float(repair.get('totalWorkers')))
                except:
                    workers = 1
            
            # Insert maintenance record
            cursor.execute('''
                INSERT INTO maintenance_records (
                    crane_id, date, type, technician, status, notes,
                    work_order, task_name, total_workers, total_work_time,
                    equipment_name, area_name
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                crane_id,
                '2024-01-15',
                'repair',
                '정비팀',
                'completed',
                str(repair.get('taskName', '')),
                str(repair.get('workOrder', '')),
                str(repair.get('taskName', '')),
                workers,
                int(work_time),
                str(repair.get('EquipmentName', '')),
                str(repair.get('areaName', ''))
            ))
            
            imported += 1
            
            # Commit every 100 records
            if imported % 100 == 0:
                conn.commit()
                print(f"Imported {imported} records...")
                
        except Exception as e:
            print(f"Error importing record {i}: {e}")
            continue
    
    conn.commit()
    
    # Check final distribution
    cursor.execute('''
        SELECT COUNT(DISTINCT crane_id) as unique_cranes,
               COUNT(*) as total_records,
               MIN(record_count) as min_per_crane,
               MAX(record_count) as max_per_crane
        FROM (
            SELECT crane_id, COUNT(*) as record_count
            FROM maintenance_records
            GROUP BY crane_id
        ) crane_counts
    ''')
    
    stats = cursor.fetchone()
    print(f"Import complete: {imported} total records")
    print(f"Cranes with records: {stats[0]}")
    print(f"Records per crane: min={stats[2]}, max={stats[3]}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    import_all_repair_data()