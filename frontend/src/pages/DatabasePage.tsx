import React, { useState, useEffect } from 'react'
import { CircleStackIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

interface Column {
  name: string
  type: string
  not_null: boolean
}

interface Table {
  columns: Column[]
  row_count: number
}

interface DatabaseSchema {
  tables: Record<string, Table>
  sample_data: Record<string, any[]>
}

const DatabasePage: React.FC = () => {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  useEffect(() => {
    fetchSchema()
  }, [])

  const fetchSchema = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await axios.get(`${apiUrl}/api/database/schema`)
      setSchema(response.data.schema)

      // Select first table by default
      const tables = Object.keys(response.data.schema.tables)
      if (tables.length > 0) {
        setSelectedTable(tables[0])
      }
    } catch (error) {
      console.error('Error fetching schema:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-indigo-600 rounded-full mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading database schema...</p>
        </div>
      </div>
    )
  }

  if (!schema) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <CircleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading database</h3>
          <p className="mt-1 text-sm text-gray-500">
            Could not connect to the database or load schema information.
          </p>
        </div>
      </div>
    )
  }

  const tables = Object.keys(schema.tables)

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Database Schema</h1>
          <p className="mt-2 text-sm text-gray-700">
            Explore the database structure and sample data. This helps you understand what you can query.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tables List */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tables</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {tables.map((tableName) => (
                <li key={tableName}>
                  <button
                    onClick={() => setSelectedTable(tableName)}
                    className={`w-full text-left px-4 py-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                      selectedTable === tableName ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tableName}</p>
                        <p className="text-sm text-gray-500">
                          {schema.tables[tableName].row_count} rows, {schema.tables[tableName].columns.length} columns
                        </p>
                      </div>
                      <CircleStackIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Table Details */}
        <div className="lg:col-span-2">
          {selectedTable && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {selectedTable} ({schema.tables[selectedTable].row_count} rows)
              </h2>

              {/* Column Schema */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-900 mb-3">Columns</h3>
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Column Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Required
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {schema.tables[selectedTable].columns.map((column, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {column.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {column.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              column.not_null ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {column.not_null ? 'Required' : 'Optional'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sample Data */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">Sample Data</h3>
                {schema.sample_data[selectedTable] && schema.sample_data[selectedTable].length > 0 ? (
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {schema.tables[selectedTable].columns.map((column) => (
                              <th
                                key={column.name}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {column.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {schema.sample_data[selectedTable].map((row, index) => (
                            <tr key={index}>
                              {schema.tables[selectedTable].columns.map((column) => (
                                <td
                                  key={column.name}
                                  className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate"
                                  title={String(row[column.name] || '')}
                                >
                                  {String(row[column.name] || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6 text-center">
                      <p className="text-sm text-gray-500">No sample data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Query Examples */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Example Queries</h2>
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Basic Queries</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "How many employees are there?"</li>
                  <li>• "Show me all customers"</li>
                  <li>• "What assets are assigned to John?"</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Advanced Queries</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "Which department has the most employees?"</li>
                  <li>• "Top 5 customers by contract value"</li>
                  <li>• "Support tickets by priority"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DatabasePage