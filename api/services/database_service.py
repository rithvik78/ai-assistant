import sqlite3
import pandas as pd
import os
from typing import Dict, List, Any

class DatabaseService:
    def __init__(self):
        self.db_path = "../data/company_data.db"
        self.csv_folder = "../data"

    async def initialize(self):
        """Initialize SQLite database from CSV files"""
        try:
            # Create database directory if it doesn't exist
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

            # Convert CSV files to SQLite tables
            await self._csv_to_sqlite()
        except Exception as e:
            print(f"Error initializing database: {e}")
            raise

    async def _csv_to_sqlite(self):
        """Convert all CSV files to SQLite tables"""
        conn = sqlite3.connect(self.db_path)

        csv_files = {
            'company_assets': 'company_assets.csv',
            'customers': 'customers.csv',
            'employees': 'employees.csv',
            'support_tickets': 'support_tickets.csv'
        }

        for table_name, csv_file in csv_files.items():
            csv_path = os.path.join(self.csv_folder, csv_file)
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                # Clean column names (remove spaces, special chars)
                df.columns = [col.replace(' ', '_').replace('-', '_').lower() for col in df.columns]
                df.to_sql(table_name, conn, if_exists='replace', index=False)

        conn.close()

    async def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Execute SQL query and return results"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # Enable column access by name
            cursor = conn.cursor()

            cursor.execute(query)
            rows = cursor.fetchall()

            # Convert to list of dictionaries
            results = [dict(row) for row in rows]
            conn.close()

            return results
        except Exception as e:
            print(f"Error executing query: {e}")
            raise

    async def get_schema_info(self) -> Dict[str, Any]:
        """Get database schema information including tables, columns, and sample data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            schema_info = {
                "tables": {},
                "sample_data": {}
            }

            # Get all table names
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]

            for table in tables:
                # Get column information
                cursor.execute(f"PRAGMA table_info({table})")
                columns = cursor.fetchall()
                schema_info["tables"][table] = {
                    "columns": [{"name": col[1], "type": col[2], "not_null": bool(col[3])} for col in columns]
                }

                # Get sample data (first 3 rows)
                cursor.execute(f"SELECT * FROM {table} LIMIT 3")
                sample_rows = cursor.fetchall()
                column_names = [col[1] for col in columns]

                schema_info["sample_data"][table] = [
                    dict(zip(column_names, row)) for row in sample_rows
                ]

                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                row_count = cursor.fetchone()[0]
                schema_info["tables"][table]["row_count"] = row_count

            conn.close()
            return schema_info

        except Exception as e:
            print(f"Error getting schema info: {e}")
            raise

    async def get_table_names(self) -> List[str]:
        """Get list of all table names"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]
            conn.close()
            return tables
        except Exception as e:
            print(f"Error getting table names: {e}")
            raise

    async def get_sample_queries(self) -> List[str]:
        """Generate sample queries based on actual data structure"""
        schema = await self.get_schema_info()
        sample_queries = []

        # Generate queries based on actual table structure
        for table_name, table_info in schema["tables"].items():
            columns = [col["name"] for col in table_info["columns"]]
            row_count = table_info["row_count"]

            # Basic count query
            sample_queries.append(f"SELECT COUNT(*) FROM {table_name}")

            # Select all with limit
            sample_queries.append(f"SELECT * FROM {table_name} LIMIT 5")

            # Queries based on specific table content
            if table_name == "employees":
                sample_queries.extend([
                    "SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department",
                    "SELECT * FROM employees WHERE status = 'Active'",
                    "SELECT name, role, department FROM employees WHERE location = 'San Francisco'"
                ])
            elif table_name == "support_tickets":
                sample_queries.extend([
                    "SELECT status, COUNT(*) as ticket_count FROM support_tickets GROUP BY status",
                    "SELECT * FROM support_tickets WHERE priority = 'High'",
                    "SELECT category, AVG(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as resolution_rate FROM support_tickets GROUP BY category"
                ])
            elif table_name == "customers":
                sample_queries.extend([
                    "SELECT industry, COUNT(*) as customer_count FROM customers GROUP BY industry",
                    "SELECT * FROM customers WHERE status = 'Active' ORDER BY contract_value DESC",
                    "SELECT account_manager, SUM(contract_value) as total_value FROM customers GROUP BY account_manager"
                ])
            elif table_name == "company_assets":
                sample_queries.extend([
                    "SELECT type, COUNT(*) as asset_count FROM company_assets GROUP BY type",
                    "SELECT * FROM company_assets WHERE status = 'Active' AND cost > 1000",
                    "SELECT assigned_to, COUNT(*) as assets_assigned FROM company_assets GROUP BY assigned_to"
                ])

        return sample_queries