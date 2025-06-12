#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os
from datetime import datetime
import sys

def connect_db():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        sys.exit(1)

def import_repair_data():
    """Import RepairReport data from Excel file"""
    
    file_path = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    
    if not os.path.exists(file_path):
        print(f"Excel file not found: {file_path}")
        return
    
    try:
        # Read RepairReport sheet
        df = pd.read_excel(file_path, sheet_name='RepairReport')
        print(f"Found {len(df)} repair records in Excel file")
        
        # Clean and prepare data
        df = df.dropna(subset=['workOrder'])  # Remove rows without work order
        
        # Connect to database
        conn = connect_db()
        cursor = conn.cursor()
        
        # Insert records
        inserted = 0
        for _, row in df.iterrows():
            try:
                # Extract crane ID from equipment code or name
                equipment_code = str(row.get('EquipmentCode', ''))
                equipment_name = str(row.get('EquipmentName', ''))
                
                # Try to match with existing cranes by looking for crane patterns
                crane_id = None
                
                # First try to find a crane by equipment code
                cursor.execute("""
                    SELECT crane_id FROM cranes 
                    WHERE crane_id ILIKE %s OR crane_name ILIKE %s
                    LIMIT 1
                """, (f'%{equipment_code}%', f'%{equipment_name}%'))
                
                result = cursor.fetchone()
                if result:
                    crane_id = result[0]
                else:
                    # Use a default crane ID or create a generic one
                    crane_id = '1P1001270'  # Use first available crane
                
                # Parse dates
                start_date = row.get('actualStartDateTime')
                end_date = row.get('actualEndDateTime')
                
                if pd.isna(start_date):
                    start_date = '2024-01-01'
                else:
                    try:
                        start_date = pd.to_datetime(start_date).strftime('%Y-%m-%d')
                    except:
                        start_date = '2024-01-01'
                
                # Parse numbers
                total_workers = row.get('totalWorkers', 0)
                if pd.isna(total_workers):
                    total_workers = 1
                else:
                    total_workers = int(float(total_workers))
                
                total_work_time = row.get('totalWorkTime', 0)
                if pd.isna(total_work_time):
                    total_work_time = 8
                else:
                    total_work_time = int(float(total_work_time))
                
                # Insert maintenance record
                cursor.execute("""
                    INSERT INTO maintenance_records (
                        crane_id, date, type, technician, status, notes,
                        work_order, task_name, actual_start_date_time, actual_end_date_time,
                        total_workers, total_work_time, area_name, equipment_name
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    crane_id,
                    start_date,
                    'routine',  # Default type
                    '정비팀',    # Default technician
                    'completed',
                    f"작업번호: {row.get('workOrder', '')}, 작업명: {row.get('taskName', '')}",
                    str(row.get('workOrder', '')),
                    str(row.get('taskName', '')),
                    start_date if not pd.isna(row.get('actualStartDateTime')) else None,
                    start_date if not pd.isna(row.get('actualEndDateTime')) else None,
                    total_workers,
                    total_work_time,
                    str(row.get('areaName', '')),
                    str(row.get('EquipmentName', ''))
                ))
                
                inserted += 1
                
            except Exception as e:
                print(f"Error inserting record {row.get('workOrder', 'Unknown')}: {e}")
                continue
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"Successfully imported {inserted} repair records")
        
    except Exception as e:
        print(f"Error importing repair data: {e}")

if __name__ == "__main__":
    import_repair_data()