#!/usr/bin/env python3
import pandas as pd
import os

def check_excel_bydevice():
    """Check actual byDevice values in Excel FailureReport sheet"""
    excel_file = "attached_assets/DB용 크레인 데이터_1749738215644.xlsx"
    
    if not os.path.exists(excel_file):
        print(f"Excel file not found: {excel_file}")
        return
    
    try:
        # Read FailureReport sheet
        df = pd.read_excel(excel_file, sheet_name='FailureReport')
        print(f"FailureReport sheet loaded with {len(df)} rows")
        print(f"Columns: {list(df.columns)}")
        
        # Check byDevice column
        if 'byDevice' in df.columns:
            print(f"\nbyDevice column found!")
            
            # Get unique byDevice values (excluding NaN/empty)
            bydevice_values = df['byDevice'].dropna()
            unique_values = bydevice_values.unique()
            
            print(f"\nUnique byDevice values ({len(unique_values)}):")
            for value in sorted(unique_values):
                count = (df['byDevice'] == value).sum()
                print(f"  - {value}: {count} records")
                
            # Check for empty/null values
            null_count = df['byDevice'].isnull().sum()
            empty_count = (df['byDevice'] == '').sum()
            print(f"\nNull values: {null_count}")
            print(f"Empty string values: {empty_count}")
            
        else:
            print("byDevice column not found in FailureReport sheet")
            print("Available columns:", list(df.columns))
            
    except Exception as e:
        print(f"Error reading Excel file: {e}")

if __name__ == "__main__":
    check_excel_bydevice()