#!/usr/bin/env python3
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import os

def connect_db():
    """Connect to PostgreSQL database"""
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

def update_bydevice_from_excel():
    """Update failure_records with actual byDevice data from Excel"""
    excel_file = "attached_assets/DB용 크레인 데이터_1749738215644.xlsx"
    
    if not os.path.exists(excel_file):
        print(f"Excel file not found: {excel_file}")
        return
    
    conn = connect_db()
    if not conn:
        return
    
    try:
        # Read FailureReport sheet
        df = pd.read_excel(excel_file, sheet_name='FailureReport')
        print(f"Loaded {len(df)} records from FailureReport sheet")
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Clear existing byDevice data first
        cursor.execute("UPDATE failure_records SET by_device = NULL")
        print("Cleared existing byDevice data")
        
        # Get all failure records from database
        cursor.execute("SELECT id, date, crane_id, description FROM failure_records ORDER BY date")
        db_records = cursor.fetchall()
        print(f"Found {len(db_records)} records in database")
        
        updated_count = 0
        
        # Try to match Excel data with database records
        for db_record in db_records:
            db_date = db_record['date']
            db_crane = db_record['crane_id']
            
            # Convert db_date to match Excel format if needed
            if isinstance(db_date, str):
                # Try to parse the date string
                try:
                    from datetime import datetime
                    db_date_obj = datetime.strptime(db_date.split('T')[0], '%Y-%m-%d')
                except:
                    continue
            else:
                db_date_obj = db_date
            
            # Look for matching record in Excel based on date and crane
            excel_matches = df[
                (pd.to_datetime(df['date']).dt.date == db_date_obj.date()) &
                (df['crane'].astype(str).str.contains(db_crane.split('_')[0] if '_' in db_crane else db_crane, na=False))
            ]
            
            if len(excel_matches) > 0:
                # Use the first match
                excel_record = excel_matches.iloc[0]
                bydevice_value = excel_record['byDevice']
                
                if pd.notna(bydevice_value) and bydevice_value.strip() != '':
                    # Update database record
                    cursor.execute(
                        "UPDATE failure_records SET by_device = %s WHERE id = %s",
                        (str(bydevice_value).strip(), db_record['id'])
                    )
                    updated_count += 1
                    
                    if updated_count % 100 == 0:
                        print(f"Updated {updated_count} records...")
        
        conn.commit()
        print(f"Successfully updated {updated_count} records with byDevice data")
        
        # Verify the update
        cursor.execute("SELECT by_device, COUNT(*) as count FROM failure_records WHERE by_device IS NOT NULL GROUP BY by_device ORDER BY count DESC LIMIT 10")
        results = cursor.fetchall()
        
        print("\nTop byDevice categories after update:")
        for row in results:
            print(f"  {row['by_device']}: {row['count']} records")
            
    except Exception as e:
        print(f"Error updating byDevice data: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    update_bydevice_from_excel()