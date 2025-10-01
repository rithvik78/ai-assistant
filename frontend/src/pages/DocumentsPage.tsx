import React, { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { DocumentTextIcon, TrashIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

interface Document {
  id: string
  name: string
  chunk_count: number
}

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    onDrop: handleFileDrop
  })

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/documents')
      setDocuments(response.data.documents)
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  async function handleFileDrop(acceptedFiles: File[]) {
    setIsLoading(true)
    setUploadStatus(null)

    for (const file of acceptedFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        await axios.post('/api/documents/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        setUploadStatus(`Successfully uploaded ${file.name}`)
        await fetchDocuments()
      } catch (error) {
        console.error('Error uploading file:', error)
        setUploadStatus(`Error uploading ${file.name}`)
      }
    }

    setIsLoading(false)
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await axios.delete(`/api/documents/${docId}`)
      await fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage the documents indexed for search. Upload PDF, TXT, MD, or DOCX files.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {isDragActive
                ? 'Drop the files here...'
                : 'Drag and drop files here, or click to select files'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports PDF, TXT, MD, and DOCX files
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center px-4 py-2 text-sm text-gray-700">
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-indigo-600 rounded-full mr-2" />
              Uploading and indexing document...
            </div>
          </div>
        )}

        {uploadStatus && (
          <div className={`mt-4 p-4 rounded-md ${uploadStatus.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {uploadStatus}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Indexed Documents</h2>

        {documents.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload some documents to get started.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-6 w-6 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-500">{doc.chunk_count} chunks indexed</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="ml-4 bg-white text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-gray-100"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentsPage