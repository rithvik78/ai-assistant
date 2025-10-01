from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import sqlite3
import pandas as pd
from typing import List, Optional
import json
from dotenv import load_dotenv

from services.database_service import DatabaseService
from services.vector_service import VectorService
from services.langgraph_service import LangGraphService
from services.test_service import TestService

load_dotenv()

app = FastAPI(title="RAG + SQL Agent System", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
db_service = DatabaseService()
vector_service = VectorService()
langgraph_service = LangGraphService()
test_service = TestService(db_service, vector_service)

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
    sql_executed: Optional[str] = None
    confidence: float
    route: str

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await db_service.initialize()
    await vector_service.initialize()
    langgraph_service.set_services(db_service, vector_service)

@app.post("/api/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest):
    """Main query endpoint that routes to SQL, documents, or web search"""
    try:
        result = await langgraph_service.process_query(request.query)
        return QueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and index a document"""
    try:
        result = await vector_service.upload_document(file)
        return {"status": "success", "message": f"Document {file.filename} uploaded and indexed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
async def list_documents():
    """List all indexed documents"""
    try:
        documents = await vector_service.list_documents()
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document from the index"""
    try:
        await vector_service.delete_document(doc_id)
        return {"status": "success", "message": f"Document {doc_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "RAG + SQL Agent System is running"}

@app.get("/api/database/schema")
async def get_database_schema():
    """Get database schema and sample data"""
    try:
        schema = await db_service.get_schema_info()
        return {"schema": schema}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/test/generate-queries")
async def generate_test_queries():
    """Generate test queries based on actual database content"""
    try:
        queries = await test_service.generate_test_queries()
        return {"test_queries": queries}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/test/run-all")
async def run_all_tests():
    """Run all generated tests"""
    try:
        results = await test_service.run_all_tests()
        return {"test_results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)