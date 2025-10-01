import faiss
import numpy as np
import os
import json
import uuid
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from fastapi import UploadFile
import PyPDF2
import docx
from io import BytesIO

class VectorService:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.index = None
        self.document_store = {}
        self.documents_metadata = {}
        self.documents_folder = "../documents"
        self.index_file = "../data/faiss_index.bin"
        self.metadata_file = "../data/documents_metadata.json"

    async def initialize(self):
        """Initialize FAISS index and load existing documents"""
        try:
            # Create data directory
            os.makedirs("../data", exist_ok=True)

            # Load existing index if available
            if os.path.exists(self.index_file) and os.path.exists(self.metadata_file):
                await self._load_existing_index()
            else:
                # Create new index
                embedding_dim = 384  # all-MiniLM-L6-v2 dimension
                self.index = faiss.IndexFlatIP(embedding_dim)  # Inner product for cosine similarity

            # Index documents from documents folder
            await self._index_documents_folder()

        except Exception as e:
            print(f"Error initializing vector service: {e}")
            raise

    async def _load_existing_index(self):
        """Load existing FAISS index and metadata"""
        self.index = faiss.read_index(self.index_file)
        with open(self.metadata_file, 'r') as f:
            self.documents_metadata = json.load(f)

    async def _save_index(self):
        """Save FAISS index and metadata to disk"""
        faiss.write_index(self.index, self.index_file)
        with open(self.metadata_file, 'w') as f:
            json.dump(self.documents_metadata, f, indent=2)

    async def _index_documents_folder(self):
        """Index all documents in the documents folder"""
        if not os.path.exists(self.documents_folder):
            print("Documents folder not found")
            return

        documents_to_process = []

        for root, dirs, files in os.walk(self.documents_folder):
            for file in files:
                if file.endswith(('.pdf', '.txt', '.md', '.docx')):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, self.documents_folder)

                    # Check if already indexed
                    if relative_path not in self.documents_metadata:
                        documents_to_process.append((file_path, relative_path))


        for file_path, relative_path in documents_to_process:
            try:
                await self._process_and_index_file(file_path, relative_path)
            except Exception as e:
                print(f"Error processing {file_path}: {e}")

        # Save index after processing all documents
        await self._save_index()

    async def _process_and_index_file(self, file_path: str, relative_path: str):
        """Process and index a single file"""
        try:
            # Extract text based on file type
            text_content = await self._extract_text_from_file(file_path)
            if not text_content:
                return

            # Chunk the document
            chunks = self._chunk_text(text_content, chunk_size=512, overlap=50)

            # Generate embeddings
            embeddings = self.model.encode(chunks)

            # Initialize index if needed
            if self.index is None:
                self.index = faiss.IndexFlatIP(embeddings.shape[1])

            # Add to FAISS index
            self.index.add(embeddings.astype(np.float32))

            # Store metadata
            doc_id = str(uuid.uuid4())
            self.documents_metadata[relative_path] = {
                "id": doc_id,
                "file_path": file_path,
                "relative_path": relative_path,
                "chunk_count": len(chunks),
                "chunks": chunks,
                "start_index": self.index.ntotal - len(chunks)
            }


        except Exception as e:
            print(f"Error processing file {file_path}: {e}")
            raise

    async def _extract_text_from_file(self, file_path: str) -> str:
        """Extract text from various file formats"""
        try:
            if file_path.endswith('.pdf'):
                return await self._extract_pdf_text(file_path)
            elif file_path.endswith('.docx'):
                return await self._extract_docx_text(file_path)
            elif file_path.endswith(('.txt', '.md')):
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                return ""
        except Exception as e:
            print(f"Error extracting text from {file_path}: {e}")
            return ""

    async def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF file"""
        text = ""
        try:
            with open(file_path, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error reading PDF {file_path}: {e}")
        return text

    async def _extract_docx_text(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            print(f"Error reading DOCX {file_path}: {e}")
            return ""

    def _chunk_text(self, text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []

        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)

        return chunks

    async def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search documents using vector similarity"""
        try:
            if self.index is None or self.index.ntotal == 0:
                return []

            # Generate query embedding
            query_embedding = self.model.encode([query])

            # Search FAISS index
            scores, indices = self.index.search(query_embedding.astype(np.float32), top_k)

            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1:  # No more results
                    break

                # Find which document this chunk belongs to
                chunk_info = self._find_chunk_document(idx)
                if chunk_info:
                    results.append({
                        "document": chunk_info["relative_path"],
                        "chunk": chunk_info["chunk_text"],
                        "score": float(score),
                        "chunk_index": int(idx)
                    })

            return results

        except Exception as e:
            print(f"Error searching documents: {e}")
            return []

    def _find_chunk_document(self, chunk_index: int) -> Dict[str, Any]:
        """Find which document a chunk belongs to"""
        for relative_path, metadata in self.documents_metadata.items():
            start_idx = metadata["start_index"]
            end_idx = start_idx + metadata["chunk_count"]

            if start_idx <= chunk_index < end_idx:
                local_chunk_idx = chunk_index - start_idx
                return {
                    "relative_path": relative_path,
                    "chunk_text": metadata["chunks"][local_chunk_idx],
                    "document_id": metadata["id"]
                }
        return None

    async def upload_document(self, file: UploadFile) -> Dict[str, Any]:
        """Upload and index a new document"""
        try:
            # Save uploaded file
            file_path = f"uploads/{file.filename}"
            os.makedirs("uploads", exist_ok=True)

            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)

            # Process and index the file
            await self._process_and_index_file(file_path, file.filename)
            await self._save_index()

            return {"status": "success", "file_path": file_path}

        except Exception as e:
            print(f"Error uploading document: {e}")
            raise

    async def list_documents(self) -> List[Dict[str, Any]]:
        """List all indexed documents"""
        documents = []
        for relative_path, metadata in self.documents_metadata.items():
            documents.append({
                "id": metadata["id"],
                "name": relative_path,
                "chunk_count": metadata["chunk_count"]
            })
        return documents

    async def delete_document(self, doc_id: str):
        """Delete a document from the index"""
        # Note: This is a simplified implementation
        # In production, you'd want to rebuild the index without the deleted document
        for relative_path, metadata in list(self.documents_metadata.items()):
            if metadata["id"] == doc_id:
                del self.documents_metadata[relative_path]
                await self._save_index()
                return
        raise ValueError(f"Document {doc_id} not found")