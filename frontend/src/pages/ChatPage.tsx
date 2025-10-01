import React, { useState, useRef, useEffect } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  sources?: string[]
  sqlExecuted?: string
  confidence?: number
  route?: string
  timestamp: Date
}

interface QueryResponse {
  answer: string
  sources: string[]
  sql_executed?: string
  confidence: number
  route: string
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await axios.post<QueryResponse>(`${apiUrl}/api/query`, {
        query: inputValue
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.answer,
        sources: response.data.sources,
        sqlExecuted: response.data.sql_executed,
        confidence: response.data.confidence,
        route: response.data.route,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const getRouteColor = (route?: string) => {
    switch (route) {
      case 'sql': return 'bg-blue-100 text-blue-800'
      case 'docs': return 'bg-green-100 text-green-800'
      case 'web': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRouteLabel = (route?: string) => {
    switch (route) {
      case 'sql': return 'SQL Agent'
      case 'docs': return 'Documents'
      case 'web': return 'Web Search'
      default: return 'Unknown'
    }
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-100 text-gray-800'
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 lg:px-6">
        <div className="max-w-6xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Welcome to AI Assistant
              </h2>
              <p className="text-gray-600 mb-8">
                Ask questions about company data, policies, or current information. I'll route your query to the right source.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div className="p-6 border border-blue-200 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="flex items-center mb-3">
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">SQL Agent</span>
                  </div>
                  <h3 className="font-semibold text-blue-900 mb-2">Database Queries</h3>
                  <p className="text-sm text-blue-700">Ask about employees, customers, assets, or support tickets</p>
                </div>
                <div className="p-6 border border-green-200 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
                  <div className="flex items-center mb-3">
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">Documents</span>
                  </div>
                  <h3 className="font-semibold text-green-900 mb-2">Policy Search</h3>
                  <p className="text-sm text-green-700">Questions about policies, procedures, and guidelines</p>
                </div>
                <div className="p-6 border border-purple-200 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
                  <div className="flex items-center mb-3">
                    <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium">Web Search</span>
                  </div>
                  <h3 className="font-semibold text-purple-900 mb-2">External Info</h3>
                  <p className="text-sm text-purple-700">Current events and external information</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-4xl w-full ${message.type === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200'} rounded-lg px-4 py-3 shadow-sm`}>
                    <div className="text-sm mb-2 leading-relaxed">
                      {message.type === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          {message.content.split('\n').map((line, idx) => {
                            if (line.match(/^\d+\.\s/)) {
                              return <div key={idx} className="my-2 font-medium">{line}</div>
                            }
                            if (line.startsWith('**') && line.endsWith('**')) {
                              return <div key={idx} className="font-semibold my-1">{line.slice(2, -2)}</div>
                            }
                            if (line.trim() === '') {
                              return <div key={idx} className="h-2"></div>
                            }
                            return <div key={idx} className="my-1">{line}</div>
                          })}
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>

                    {message.type === 'assistant' && (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {message.route && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRouteColor(message.route)}`}>
                              {getRouteLabel(message.route)}
                            </span>
                          )}
                          {message.confidence !== undefined && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(message.confidence)}`}>
                              Confidence: {(message.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>

                        {message.sqlExecuted && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 mb-1">SQL Query:</p>
                            <pre className="text-xs bg-gray-100 p-2 rounded text-gray-800 overflow-x-auto">
                              {message.sqlExecuted}
                            </pre>
                          </div>
                        )}

                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 mb-1">Sources:</p>
                            <ul className="text-xs space-y-1">
                              {message.sources.map((source, index) => (
                                <li key={index} className="text-gray-700">• {source}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-gray-400 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white px-2 py-4 sm:px-4 lg:px-6">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question about company data, policies, or current information..."
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border transition-all"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <PaperAirplaneIcon className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChatPage