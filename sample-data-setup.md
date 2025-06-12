# Sample Google Sheets Setup

## Crane Data Sheet Structure
| crane_id | status | location | model | last_maintenance_date | next_maintenance_date | is_urgent |
|----------|--------|----------|--------|----------------------|----------------------|-----------|
| CR-001 | operating | Warehouse A | Liebherr LTM 1030 | 2024-05-15 | 2024-06-15 | false |
| CR-002 | maintenance | Dock B | Manitowoc 18000 | 2024-05-20 | 2024-06-10 | false |
| CR-003 | operating | Yard C | Terex RT780 | 2024-05-10 | 2024-06-05 | true |
| CR-004 | urgent | Storage D | Liebherr LTM 1055 | 2024-04-30 | 2024-05-30 | true |
| CR-005 | operating | Port E | Grove GMK4100L | 2024-05-18 | 2024-06-18 | false |

## Maintenance Records Sheet Structure
| crane_id | date | type | technician | status | notes | duration | cost |
|----------|------|------|------------|--------|-------|----------|------|
| CR-001 | 2024-05-15 | routine | John Smith | completed | Regular inspection and lubrication | 4 | 25000 |
| CR-002 | 2024-05-20 | repair | Mike Johnson | in_progress | Hydraulic system repair | 8 | 75000 |
| CR-003 | 2024-05-10 | preventive | Sarah Wilson | completed | Brake system check | 2 | 15000 |
| CR-004 | 2024-04-30 | emergency | Tom Brown | completed | Emergency cable replacement | 12 | 120000 |
| CR-005 | 2024-05-18 | inspection | Lisa Davis | completed | Safety inspection | 3 | 18000 |

## Google Sheets CSV Export URLs
To use with real Google Sheets:
1. Create a Google Sheet with the above structure
2. Make it publicly viewable
3. Get the CSV export URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv&gid=SHEET_ID`
4. Use these URLs in the dashboard configuration

Example URLs (replace with your actual spreadsheet):
- Cranes: `https://docs.google.com/spreadsheets/d/1abc123/export?format=csv&gid=0`
- Maintenance: `https://docs.google.com/spreadsheets/d/1abc123/export?format=csv&gid=1234567890`