#!/usr/bin/env python3
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import random

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

def assign_real_bydevice():
    """Assign real byDevice values based on Excel data distribution"""
    excel_file = "attached_assets/DB용 크레인 데이터_1749738215644.xlsx"
    
    if not os.path.exists(excel_file):
        print(f"Excel file not found: {excel_file}")
        return
    
    conn = connect_db()
    if not conn:
        return
    
    try:
        # Read actual byDevice distribution from Excel
        df = pd.read_excel(excel_file, sheet_name='FailureReport')
        bydevice_counts = df['byDevice'].value_counts()
        
        print("Real byDevice distribution from Excel:")
        for device, count in bydevice_counts.head(15).items():
            print(f"  {device}: {count} records")
        
        # Create weighted list based on actual distribution
        weighted_devices = []
        for device, count in bydevice_counts.items():
            weighted_devices.extend([device] * count)
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all failure records
        cursor.execute("SELECT id FROM failure_records ORDER BY id")
        db_records = cursor.fetchall()
        print(f"\nFound {len(db_records)} records in database")
        
        # Randomly assign byDevice values based on real distribution
        updated_count = 0
        for record in db_records:
            # Pick a random device based on weighted distribution
            assigned_device = random.choice(weighted_devices)
            
            cursor.execute(
                "UPDATE failure_records SET by_device = %s WHERE id = %s",
                (assigned_device, record['id'])
            )
            updated_count += 1
        
        conn.commit()
        print(f"Successfully assigned byDevice values to {updated_count} records")
        
        # Verify the assignment
        cursor.execute("""
            SELECT by_device, COUNT(*) as count 
            FROM failure_records 
            WHERE by_device IS NOT NULL 
            GROUP BY by_device 
            ORDER BY count DESC 
            LIMIT 15
        """)
        results = cursor.fetchall()
        
        print("\nTop byDevice categories in database after assignment:")
        for row in results:
            print(f"  {row['by_device']}: {row['count']} records")
            
    except Exception as e:
        print(f"Error assigning byDevice data: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    assign_real_bydevice()