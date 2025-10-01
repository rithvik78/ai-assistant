import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ChatPage from './pages/ChatPage'
import DocumentsPage from './pages/DocumentsPage'
import DatabasePage from './pages/DatabasePage'
import TestPage from './pages/TestPage'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/database" element={<DatabasePage />} />
          <Route path="/test" element={<TestPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App