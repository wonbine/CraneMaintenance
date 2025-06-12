import pandas as pd
import psycopg2
import os
from datetime import datetime

def update_by_device_data():
    """Update failure_records with byDevice data from Excel"""
    
    # Read Excel file
    excel_path = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    df = pd.read_excel(excel_path, sheet_name='FailureReport')
    
    # Connect to database
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    updated_count = 0
    
    # Process each row
    for index, row in df.iterrows():
        if pd.notna(row['byDevice']) and str(row['byDevice']).strip() != '':
            try:
                # Format date
                date_str = pd.to_datetime(row['date']).strftime('%Y-%m-%d')
                crane_id = str(row['crane']).strip()
                by_device = str(row['byDevice']).strip()
                
                # Update record
                cursor.execute("""
                    UPDATE failure_records 
                    SET by_device = %s 
                    WHERE date = %s AND crane_id = %s
                """, (by_device, date_str, crane_id))
                
                if cursor.rowcount > 0:
                    updated_count += 1
                    
            except Exception as e:
                print(f"Error updating row {index}: {e}")
                continue
    
    # Commit changes
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"Successfully updated {updated_count} records with byDevice data")
    
    # Show updated distribution
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    cursor.execute("""
        SELECT by_device, COUNT(*) as count
        FROM failure_records 
        WHERE by_device IS NOT NULL AND by_device != ''
        GROUP BY by_device
        ORDER BY count DESC
        LIMIT 10
    """)
    
    results = cursor.fetchall()
    print("\nTop 10 byDevice values in database:")
    for device, count in results:
        print(f"{device}: {count}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    update_by_device_data()