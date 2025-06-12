#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os
from datetime import datetime
import sys

def connect_to_db():
    """Connect to PostgreSQL database using environment variables"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('PGHOST'),
            database=os.getenv('PGDATABASE'),
            user=os.getenv('PGUSER'),
            password=os.getenv('PGPASSWORD'),
            port=os.getenv('PGPORT')
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def process_crane_data(df):
    """Process crane data from Excel file"""
    processed_data = []
    
    for _, row in df.iterrows():
        try:
            # Extract and clean data using actual column names
            crane_data = {
                'craneId': str(row.get('CraneCode', '')).strip() if pd.notna(row.get('CraneCode')) else str(row.get('EquipmentCode', '')).strip(),
                'craneName': str(row.get('CraneName', '')).strip() if pd.notna(row.get('CraneName')) else str(row.get('EquipmentName', '')).strip(),
                'plantSection': str(row.get('Plant/Secsion', '')).strip() if pd.notna(row.get('Plant/Secsion')) else None,
                'status': '정상',  # Default status
                'location': str(row.get('InstallationLocation', '')).strip() if pd.notna(row.get('InstallationLocation')) else '',
                'model': str(row.get('HoistingDevice', '')).strip() if pd.notna(row.get('HoistingDevice')) else '',
                'grade': str(row.get('Grade', '')).strip() if pd.notna(row.get('Grade')) else None,
                'driveType': str(row.get('DriveType', '')).strip() if pd.notna(row.get('DriveType')) else None,
                'unmannedOperation': str(row.get('UnmannedOperation', '')).strip() if pd.notna(row.get('UnmannedOperation')) else None,
                'capacity': None,  # Will extract from MainLoad
                'span': None,
                'height': None,
                'manufacturer': None,
                'installationDate': None,
                'lastMaintenanceDate': None,
                'nextMaintenanceDate': None,
                'isUrgent': False
            }
            
            # Handle capacity from MainLoad
            if pd.notna(row.get('MainLoad\n(Ton)')):
                try:
                    capacity_val = str(row.get('MainLoad\n(Ton)')).replace('Ton', '').replace('ton', '').strip()
                    crane_data['capacity'] = float(capacity_val)
                except:
                    pass
            
            # Handle installation date
            if pd.notna(row.get('InstallationDate')):
                try:
                    install_date = pd.to_datetime(row.get('InstallationDate'))
                    crane_data['installationDate'] = install_date.strftime('%Y-%m-%d')
                except:
                    pass
            
            # Handle inspection reference date as last maintenance
            if pd.notna(row.get('InspectionReferenceDate')):
                try:
                    ref_date = pd.to_datetime(row.get('InspectionReferenceDate'))
                    crane_data['lastMaintenanceDate'] = ref_date.strftime('%Y-%m-%d')
                except:
                    pass
            
            # Skip empty crane IDs
            if crane_data['craneId'] and crane_data['craneId'] != 'nan' and crane_data['craneId'] != '':
                processed_data.append(crane_data)
                print(f"Processed crane: {crane_data['craneId']} - {crane_data['craneName']}")
                
        except Exception as e:
            print(f"Error processing row: {e}")
            continue
    
    return processed_data

def insert_crane_data(conn, crane_data_list):
    """Insert crane data into database"""
    cursor = conn.cursor()
    
    try:
        # Clear existing crane data
        print("Clearing existing crane data...")
        cursor.execute("DELETE FROM cranes")
        conn.commit()
        
        insert_query = """
            INSERT INTO cranes (
                crane_id, crane_name, plant_section, status, location, model, 
                grade, drive_type, unmanned_operation, installation_date, 
                last_maintenance_date, next_maintenance_date, is_urgent
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """
        
        inserted_count = 0
        for crane_data in crane_data_list:
            try:
                cursor.execute(insert_query, (
                    crane_data['craneId'],
                    crane_data['craneName'],
                    crane_data['plantSection'],
                    crane_data['status'],
                    crane_data['location'],
                    crane_data['model'],
                    crane_data['grade'],
                    crane_data['driveType'],
                    crane_data['unmannedOperation'],
                    crane_data['installationDate'],
                    crane_data['lastMaintenanceDate'],
                    crane_data['nextMaintenanceDate'],
                    crane_data['isUrgent']
                ))
                inserted_count += 1
                
                # Commit each insert to avoid transaction issues
                conn.commit()
                
            except Exception as e:
                print(f"Error inserting crane {crane_data['craneId']}: {e}")
                conn.rollback()
                continue
        
        print(f"Successfully inserted {inserted_count} crane records")
        
    except Exception as e:
        print(f"Database error: {e}")
        conn.rollback()
    finally:
        cursor.close()

def main():
    excel_file = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    
    # Check if file exists
    if not os.path.exists(excel_file):
        print(f"Excel file not found: {excel_file}")
        sys.exit(1)
    
    print(f"Reading Excel file: {excel_file}")
    
    try:
        # Read Excel file - try different sheet names
        xl_file = pd.ExcelFile(excel_file)
        print(f"Available sheets: {xl_file.sheet_names}")
        
        # Try to find the crane data sheet
        df = None
        for sheet_name in xl_file.sheet_names:
            try:
                temp_df = pd.read_excel(excel_file, sheet_name=sheet_name)
                if len(temp_df) > 0:
                    print(f"Using sheet: {sheet_name}")
                    df = temp_df
                    break
            except:
                continue
        
        if df is None:
            print("No valid data found in Excel file")
            sys.exit(1)
        
        print(f"Read {len(df)} rows from Excel")
        print("Columns found:", list(df.columns))
        
        # Process crane data
        print("Processing crane data...")
        crane_data_list = process_crane_data(df)
        print(f"Processed {len(crane_data_list)} crane records")
        
        # Connect to database
        print("Connecting to database...")
        conn = connect_to_db()
        if not conn:
            print("Failed to connect to database")
            sys.exit(1)
        
        # Insert data
        print("Inserting data into database...")
        insert_crane_data(conn, crane_data_list)
        
        conn.close()
        print("Data import completed successfully!")
        
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()