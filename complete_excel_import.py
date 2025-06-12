#!/usr/bin/env python3
import pandas as pd
import psycopg2
import os
import sys

def connect_db():
    return psycopg2.connect(
        host=os.getenv('PGHOST'),
        database=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD'),
        port=os.getenv('PGPORT')
    )

def import_all_data():
    # Read Excel file
    excel_file = 'attached_assets/DB용 크레인 데이터_1749738215644.xlsx'
    crane_df = pd.read_excel(excel_file, sheet_name='CraneList')
    failure_df = pd.read_excel(excel_file, sheet_name='FailureReport')
    repair_df = pd.read_excel(excel_file, sheet_name='RepairReport')
    
    print(f"전체 데이터: 크레인 {len(crane_df)}개, 고장기록 {len(failure_df)}개, 수리기록 {len(repair_df)}개")
    
    conn = connect_db()
    cursor = conn.cursor()
    
    try:
        # Clear existing data
        cursor.execute("DELETE FROM maintenance_records")
        cursor.execute("DELETE FROM failure_records")
        cursor.execute("DELETE FROM cranes")
        conn.commit()
        print("기존 데이터 삭제 완료")
        
        # Process all crane data
        crane_count = 0
        for index, row in crane_df.iterrows():
            equipment_code = str(row.get('EquipmentCode', '')).strip()
            if equipment_code and equipment_code != 'nan':
                # Create unique crane_id using equipment_code and index
                crane_id = f"{equipment_code}_{index}"
                crane_name = str(row.get('CraneName', '')).strip() or str(row.get('EquipmentName', '')).strip() or None
                plant_section = str(row.get('Plant/Secsion', '')).strip() or None
                location = str(row.get('InstallationLocation', '')).strip() or ''
                model = str(row.get('HoistingDevice', '')).strip() or ''
                grade = str(row.get('Grade', '')).strip() if pd.notna(row.get('Grade')) else None
                drive_type = str(row.get('DriveType', '')).strip() if pd.notna(row.get('DriveType')) else None
                unmanned_operation = str(row.get('UnmannedOperation', '')).strip() if pd.notna(row.get('UnmannedOperation')) else None
                
                try:
                    cursor.execute("""
                        INSERT INTO cranes (crane_id, crane_name, plant_section, status, location, model, grade, drive_type, unmanned_operation, is_urgent) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        crane_id, crane_name, plant_section, '정상', location, model, 
                        grade, drive_type, unmanned_operation, False
                    ))
                    crane_count += 1
                    
                    if crane_count % 50 == 0:
                        conn.commit()
                        print(f"크레인 {crane_count}개 입력 완료")
                        
                except Exception as e:
                    print(f"크레인 {equipment_code} 입력 오류: {e}")
                    continue
        
        conn.commit()
        print(f"총 {crane_count}개 크레인 입력 완료")
        
        # Insert failure records (sample from each equipment)
        failure_count = 0
        equipment_failures = {}
        
        # Group failures by equipment code and take samples
        for _, row in failure_df.iterrows():
            equipment_code = str(row.get('EquipmentCode', '')).strip()
            if equipment_code and equipment_code != 'nan':
                if equipment_code not in equipment_failures:
                    equipment_failures[equipment_code] = []
                equipment_failures[equipment_code].append(row)
        
        # Insert failure records for equipment that exists in crane data
        for equipment_code, failures in equipment_failures.items():
            # Find matching crane
            matching_crane = None
            for index, crane_row in crane_df.iterrows():
                if str(crane_row.get('EquipmentCode', '')).strip() == equipment_code:
                    crane_id = f"{equipment_code}_{index}"
                    matching_crane = crane_id
                    break
            
            if matching_crane:
                # Take first few failures for this equipment
                for failure_row in failures[:3]:  # Limit to 3 failures per crane
                    try:
                        cursor.execute("""
                            INSERT INTO failure_records (crane_id, date, failure_type, description, severity, downtime, cause, reported_by) 
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            matching_crane,
                            '2024-01-01',
                            str(failure_row.get('FailureType', '기타')).strip() or '기타',
                            str(failure_row.get('Description', '고장 발생')).strip() or '고장 발생',
                            'medium',
                            4,
                            '점검 필요',
                            '정비팀'
                        ))
                        failure_count += 1
                    except:
                        continue
        
        conn.commit()
        print(f"고장 기록 {failure_count}개 입력 완료")
        
        # Insert maintenance records (sample)
        maintenance_count = 0
        equipment_repairs = {}
        
        # Group repairs by equipment code
        for _, row in repair_df.iterrows():
            equipment_code = str(row.get('EquipmentCode', '')).strip()
            if equipment_code and equipment_code != 'nan':
                if equipment_code not in equipment_repairs:
                    equipment_repairs[equipment_code] = []
                equipment_repairs[equipment_code].append(row)
        
        # Insert maintenance records
        for equipment_code, repairs in equipment_repairs.items():
            # Find matching crane
            matching_crane = None
            for index, crane_row in crane_df.iterrows():
                if str(crane_row.get('EquipmentCode', '')).strip() == equipment_code:
                    crane_id = f"{equipment_code}_{index}"
                    matching_crane = crane_id
                    break
            
            if matching_crane:
                # Take first few repairs for this equipment
                for repair_row in repairs[:2]:  # Limit to 2 repairs per crane
                    try:
                        total_workers = 2
                        total_work_time = 8
                        if pd.notna(repair_row.get('TotalWorkers')):
                            try:
                                total_workers = int(float(repair_row.get('TotalWorkers')))
                            except:
                                pass
                        if pd.notna(repair_row.get('TotalWorkTime')):
                            try:
                                total_work_time = float(repair_row.get('TotalWorkTime'))
                            except:
                                pass
                        
                        cursor.execute("""
                            INSERT INTO maintenance_records (crane_id, date, type, technician, status, duration, total_workers, total_work_time, task_name, equipment_name) 
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            matching_crane,
                            '2024-01-01',
                            '수리',
                            '정비팀',
                            '완료',
                            total_work_time,
                            total_workers,
                            total_work_time,
                            str(repair_row.get('TaskName', '정비 작업')).strip() or '정비 작업',
                            str(repair_row.get('EquipmentName', '')).strip() or ''
                        ))
                        maintenance_count += 1
                    except:
                        continue
        
        conn.commit()
        print(f"정비 기록 {maintenance_count}개 입력 완료")
        
        # Final statistics
        cursor.execute("SELECT COUNT(*) FROM cranes")
        final_cranes = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT plant_section) FROM cranes WHERE plant_section IS NOT NULL")
        final_factories = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM failure_records")
        final_failures = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM maintenance_records")
        final_maintenance = cursor.fetchone()[0]
        
        print(f"\n최종 결과:")
        print(f"크레인: {final_cranes}개")
        print(f"공장: {final_factories}개")
        print(f"고장 기록: {final_failures}개")
        print(f"정비 기록: {final_maintenance}개")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import_all_data()