from typing import Dict, Any, List
import json
from openai import OpenAI
import os
from dotenv import load_dotenv

from .database_service import DatabaseService
from .vector_service import VectorService

load_dotenv()

class LangGraphService:
    def __init__(self):
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY")
        )
        self.db_service = None
        self.vector_service = None

    def set_services(self, db_service: DatabaseService, vector_service: VectorService):
        """Set database and vector services"""
        self.db_service = db_service
        self.vector_service = vector_service

    async def process_query(self, query: str) -> Dict[str, Any]:
        """Process a query through workflow"""
        try:
            # Route the query
            route = self._route_query(query)

            # Process based on route
            if route == "sql":
                return await self._process_sql_query(query)
            elif route == "docs":
                return await self._process_document_query(query)
            else:  # web
                return await self._process_web_query(query)

        except Exception as e:
            return {
                "answer": f"Error processing query: {str(e)}",
                "sources": [],
                "sql_executed": None,
                "confidence": 0.3,
                "route": "error"
            }

    def _route_query(self, query: str) -> str:
        """Route query to appropriate service"""
        query_lower = query.lower()

        sql_keywords = ['how many', 'show me', 'count', 'list', 'employees', 'customers', 'tickets', 'assets', 'select', 'where', 'department', 'industry']
        if any(keyword in query_lower for keyword in sql_keywords):
            return "sql"

        doc_keywords = ['policy', 'process', 'how do i', 'what should', 'reimbursement', 'security', 'onboarding', 'device', 'laptop']
        if any(keyword in query_lower for keyword in doc_keywords):
            return "docs"

        return "web"

    async def _process_sql_query(self, query: str) -> Dict[str, Any]:
        """Process SQL query"""
        try:
            if not self.db_service:
                raise Exception("Database service not available")

            # Get database schema
            schema_info = await self.db_service.get_schema_info()

            # Generate SQL using LLM
            system_prompt = f"""Generate a SQLite query based on the user's question and database schema.

DATABASE SCHEMA:
{json.dumps(schema_info, indent=2)}

RULES:
1. Use only the tables and columns shown in the schema
2. Generate syntactically correct SQLite queries
3. Use appropriate JOINs when needed
4. Return only the SQL query, nothing else
5. Use proper column names (they use underscores, not spaces)

User question: {query}"""

            response = self.client.chat.completions.create(
                model="qwen/qwen2.5-vl-72b-instruct:free",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                temperature=0.1,
                max_tokens=500
            )

            sql_query = response.choices[0].message.content.strip()

            # Clean the SQL query
            if sql_query.startswith("```sql"):
                sql_query = sql_query[6:]
            if sql_query.endswith("```"):
                sql_query = sql_query[:-3]
            sql_query = sql_query.strip()

            # Execute the query
            results = await self.db_service.execute_query(sql_query)

            # Generate natural language answer
            answer_prompt = f"""Based on the SQL query results, provide a clear, natural language answer to the user's question.

User Question: {query}
SQL Query: {sql_query}
Results: {json.dumps(results[:10], indent=2)}

Provide a helpful, conversational answer."""

            answer_response = self.client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct:free",
                messages=[
                    {"role": "system", "content": answer_prompt}
                ],
                temperature=0.1,
                max_tokens=300
            )

            answer = answer_response.choices[0].message.content.strip()

            return {
                "answer": answer,
                "sources": [f"Database query: {sql_query}"],
                "sql_executed": sql_query,
                "confidence": 0.9,
                "route": "sql"
            }

        except Exception as e:
            return {
                "answer": f"SQL query failed: {str(e)}",
                "sources": [],
                "sql_executed": sql_query if 'sql_query' in locals() else None,
                "confidence": 0.3,
                "route": "sql"
            }

    async def _process_document_query(self, query: str) -> Dict[str, Any]:
        """Process document search query"""
        try:
            if not self.vector_service:
                return {
                    "answer": "Document search service not available",
                    "sources": [],
                    "confidence": 0.1,
                    "route": "docs"
                }

            # Search documents
            results = await self.vector_service.search_documents(query, top_k=5)

            if not results:
                return {
                    "answer": "No relevant documents found for your query.",
                    "sources": [],
                    "confidence": 0.2,
                    "route": "docs"
                }

            # Generate answer from document results
            context = "\n".join([f"Document: {r['document']}\nContent: {r['chunk'][:500]}..." for r in results[:3]])

            answer_prompt = f"""Based on the document search results, answer the user's question.

User Question: {query}

Document Context:
{context}

Provide a helpful answer based on the documents. If the documents don't contain enough information, say so."""

            response = self.client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct:free",
                messages=[
                    {"role": "system", "content": answer_prompt}
                ],
                temperature=0.1,
                max_tokens=400
            )

            answer = response.choices[0].message.content.strip()
            sources = [r['document'] for r in results[:3]]

            return {
                "answer": answer,
                "sources": sources,
                "confidence": 0.8,
                "route": "docs"
            }

        except Exception as e:
            return {
                "answer": f"Document search failed: {str(e)}",
                "sources": [],
                "confidence": 0.3,
                "route": "docs"
            }

    async def _process_web_query(self, query: str) -> Dict[str, Any]:
        """Process web search query"""
        return {
            "answer": f"Web search functionality is not implemented yet. Your query was: {query}",
            "sources": ["Web search (simulated)"],
            "confidence": 0.5,
            "route": "web"
        }