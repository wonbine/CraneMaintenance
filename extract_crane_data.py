import pandas as pd
import json
import sys

def extract_crane_coordinates(file_path):
    try:
        # Read the Excel file
        df = pd.read_excel(file_path, sheet_name=None, header=None)
        
        # Print available sheet names
        print("Available sheets:", list(df.keys()))
        
        # Try to find the sheet with coordinate data
        coordinate_data = []
        
        for sheet_name, sheet_df in df.items():
            print(f"\nProcessing sheet: {sheet_name}")
            print(f"Shape: {sheet_df.shape}")
            
            # Search through all cells for crane codes
            print("Searching for crane codes in cells...")
            for row_idx in range(len(sheet_df)):
                for col_idx in range(len(sheet_df.columns)):
                    cell_value = sheet_df.iloc[row_idx, col_idx]
                    
                    if pd.notna(cell_value) and isinstance(cell_value, str):
                        cell_value = str(cell_value).strip()
                        
                        # Look for potential crane codes (patterns like CT11, BT01, A01, etc.)
                        if (len(cell_value) >= 2 and 
                            any(pattern in cell_value for pattern in ['CT', 'BT', 'A0', 'B0', 'C0', 'D0', 'FL', 'SL', 'KBT', 'KTB', 'STB', 'SBT', 'MM', 'HM', 'TU', 'TCL', 'EG', 'IF', 'GOH', 'CAT', 'RG', 'OB', 'GCM', 'SC', 'SP', 'SW']) or
                            any(cell_value.startswith(letter) and cell_value[1:].isdigit() for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')):
                            
                            # Convert row/column to Excel coordinate (A1, B2, etc.)
                            excel_col = ''
                            col_num = col_idx + 1
                            while col_num > 0:
                                col_num -= 1
                                excel_col = chr(col_num % 26 + ord('A')) + excel_col
                                col_num //= 26
                            excel_row = row_idx + 1
                            coordinate = f"{excel_col}{excel_row}"
                            
                            coordinate_data.append({
                                "크레인코드": cell_value,
                                "좌표": coordinate
                            })
                            print(f"Found crane: {cell_value} at {coordinate}")
            
            # Also look for any cells that might contain crane information
            print("\nLooking for non-empty cells (first 20):")
            count = 0
            for row_idx in range(len(sheet_df)):
                for col_idx in range(len(sheet_df.columns)):
                    cell_value = sheet_df.iloc[row_idx, col_idx]
                    if pd.notna(cell_value) and str(cell_value).strip():
                        if count < 20:
                            excel_col = ''
                            col_num = col_idx + 1
                            while col_num > 0:
                                col_num -= 1
                                excel_col = chr(col_num % 26 + ord('A')) + excel_col
                                col_num //= 26
                            excel_row = row_idx + 1
                            print(f"  {excel_col}{excel_row}: {cell_value}")
                            count += 1
        
        return coordinate_data
        
    except Exception as e:
        print(f"Error reading file: {e}")
        return []

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_crane_data.py <excel_file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    coordinates = extract_crane_coordinates(file_path)
    
    if coordinates:
        # Save to JSON file
        with open('updated_crane_coordinates.json', 'w', encoding='utf-8') as f:
            json.dump(coordinates, f, ensure_ascii=False, indent=2)
        print(f"Extracted {len(coordinates)} coordinate entries")
    else:
        print("No coordinate data found")