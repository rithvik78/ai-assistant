import React, { useState } from 'react'
import { BeakerIcon, PlayIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

interface TestQuery {
  id: string
  query: string
  expected_route: string
  category: string
}

interface TestResult {
  id: string
  query: string
  expected_route: string
  actual_route: string
  passed: boolean
  confidence: number
  execution_time: number
  category: string
}

interface TestResults {
  total_tests: number
  passed: number
  failed: number
  success_rate: number
  average_confidence: number
  test_details: TestResult[]
  results_by_category: Record<string, { total: number; passed: number }>
  results_by_route: Record<string, { total: number; passed: number }>
}

const TestPage: React.FC = () => {
  const [testQueries, setTestQueries] = useState<TestQuery[]>([])
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const generateTestQueries = async () => {
    setIsGenerating(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await axios.get(`${apiUrl}/api/test/generate-queries`)
      setTestQueries(response.data.test_queries)
    } catch (error) {
      console.error('Error generating test queries:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await axios.post(`${apiUrl}/api/test/run-all`)
      setTestResults(response.data.test_results)
    } catch (error) {
      console.error('Error running tests:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getRouteColor = (route: string) => {
    switch (route) {
      case 'sql': return 'bg-blue-100 text-blue-800'
      case 'docs': return 'bg-green-100 text-green-800'
      case 'web': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = [
      'bg-red-100 text-red-800',
      'bg-yellow-100 text-yellow-800',
      'bg-green-100 text-green-800',
      'bg-blue-100 text-blue-800',
      'bg-indigo-100 text-indigo-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800'
    ]
    return colors[category.length % colors.length]
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Test Runner</h1>
          <p className="mt-2 text-sm text-gray-700">
            Generate and run tests based on actual database content and documents to verify routing accuracy.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={generateTestQueries}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            ) : (
              <BeakerIcon className="h-4 w-4 mr-2" />
            )}
            Generate Test Queries
          </button>

          {testQueries.length > 0 && (
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <PlayIcon className="h-4 w-4 mr-2" />
              )}
              Run All Tests
            </button>
          )}
        </div>

        {/* Test Results Summary */}
        {testResults && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results Summary</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 px-4 py-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">Total Tests</p>
                  <p className="text-2xl font-bold text-gray-900">{testResults.total_tests}</p>
                </div>
                <div className="bg-green-50 px-4 py-3 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Passed</p>
                  <p className="text-2xl font-bold text-green-900">{testResults.passed}</p>
                </div>
                <div className="bg-red-50 px-4 py-3 rounded-lg">
                  <p className="text-sm font-medium text-red-600">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{testResults.failed}</p>
                </div>
                <div className="bg-blue-50 px-4 py-3 rounded-lg">
                  <p className="text-sm font-medium text-blue-600">Success Rate</p>
                  <p className="text-2xl font-bold text-blue-900">{(testResults.success_rate * 100).toFixed(1)}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Results by Route */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Results by Route</h3>
                  <div className="space-y-2">
                    {Object.entries(testResults.results_by_route).map(([route, stats]) => (
                      <div key={route} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRouteColor(route)}`}>
                          {route.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600">
                          {stats.passed}/{stats.total} ({((stats.passed / stats.total) * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Results by Category */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Results by Category</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(testResults.results_by_category).map(([category, stats]) => (
                      <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                          {category}
                        </span>
                        <span className="text-sm text-gray-600">
                          {stats.passed}/{stats.total} ({((stats.passed / stats.total) * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generated Test Queries */}
        {testQueries.length > 0 && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Generated Test Queries ({testQueries.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {testQueries.map((test) => (
                  <div key={test.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{test.query}</p>
                        <div className="mt-2 flex space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRouteColor(test.expected_route)}`}>
                            {test.expected_route.toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(test.category)}`}>
                            {test.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Detailed Test Results */}
        {testResults && testResults.test_details.length > 0 && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Detailed Test Results</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {testResults.test_details.map((result) => (
                  <div key={result.id} className={`border rounded-lg p-4 ${result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{result.query}</p>
                        <div className="mt-2 flex items-center space-x-4">
                          <div className="flex space-x-2">
                            <span className="text-xs text-gray-600">Expected:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRouteColor(result.expected_route)}`}>
                              {result.expected_route.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <span className="text-xs text-gray-600">Actual:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRouteColor(result.actual_route)}`}>
                              {result.actual_route.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Confidence: {(result.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <div className={`ml-4 px-2 py-1 rounded text-xs font-medium ${result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {result.passed ? 'PASS' : 'FAIL'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Initial State */}
        {testQueries.length === 0 && !testResults && (
          <div className="text-center py-12">
            <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tests generated yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Click "Generate Test Queries" to create tests based on your actual data.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TestPage