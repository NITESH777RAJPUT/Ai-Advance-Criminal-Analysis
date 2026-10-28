import asyncio
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger("mongodb")


class InMemoryCollection:
    """Mock async collection for seamless fallback when MongoDB is not running."""

    def __init__(self, name: str):
        self.name = name
        self._docs: Dict[str, Dict[str, Any]] = {}

    async def insert_one(self, document: Dict[str, Any]):
        doc = dict(document)
        if "_id" not in doc:
            doc["_id"] = str(uuid.uuid4())
        doc_id = str(doc["_id"])
        self._docs[doc_id] = doc
        return type("InsertResult", (), {"inserted_id": doc["_id"]})()

    async def find_one(self, filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for doc in self._docs.values():
            match = True
            for k, v in filter_dict.items():
                if k == "_id":
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                return dict(doc)
        return None

    def find(self, filter_dict: Optional[Dict[str, Any]] = None, sort: Optional[List] = None):
        filter_dict = filter_dict or {}

        class Cursor:
            def __init__(self, docs: List[Dict[str, Any]], sort_crit: Optional[List]):
                self.docs = docs
                self.sort_crit = sort_crit
                self._limit = None

            def sort(self, key_or_list, direction=None):
                if isinstance(key_or_list, str):
                    reverse = direction == -1 if direction else False
                    self.docs = sorted(self.docs, key=lambda x: str(x.get(key_or_list, "")), reverse=reverse)
                elif isinstance(key_or_list, list):
                    for k, d in reversed(key_or_list):
                        self.docs = sorted(self.docs, key=lambda x: str(x.get(k, "")), reverse=(d == -1))
                return self

            def limit(self, n: int):
                self._limit = n
                return self

            async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
                res = list(self.docs)
                if self._limit:
                    res = res[:self._limit]
                elif length:
                    res = res[:length]
                return [dict(d) for d in res]

            def __aiter__(self):
                self._iter = iter(self.docs)
                return self

            async def __anext__(self):
                try:
                    return dict(next(self._iter))
                except StopIteration:
                    raise StopAsyncIteration

        matched = []
        for doc in self._docs.values():
            match = True
            for k, v in filter_dict.items():
                if k == "_id":
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                matched.append(doc)

        cursor = Cursor(matched, sort)
        if sort:
            cursor.sort(sort)
        return cursor

    async def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any], upsert: bool = False):
        doc = await self.find_one(filter_dict)
        if not doc:
            if upsert:
                new_doc = dict(filter_dict)
                if "$set" in update_dict:
                    new_doc.update(update_dict["$set"])
                await self.insert_one(new_doc)
                return type("UpdateResult", (), {"modified_count": 1, "upserted_id": new_doc.get("_id")})()
            return type("UpdateResult", (), {"modified_count": 0, "upserted_id": None})()

        doc_id = str(doc["_id"])
        target = self._docs[doc_id]
        if "$set" in update_dict:
            target.update(update_dict["$set"])
        return type("UpdateResult", (), {"modified_count": 1, "upserted_id": None})()

    async def count_documents(self, filter_dict: Optional[Dict[str, Any]] = None) -> int:
        if not filter_dict:
            return len(self._docs)
        count = 0
        for doc in self._docs.values():
            match = True
            for k, v in filter_dict.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                count += 1
        return count

    async def delete_one(self, filter_dict: Dict[str, Any]):
        doc = await self.find_one(filter_dict)
        if doc:
            del self._docs[str(doc["_id"])]
            return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()


class MongoDBClient:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.is_connected: bool = False
        self._mock_collections: Dict[str, InMemoryCollection] = {}

    async def connect(self):
        try:
            logger.info(f"Attempting connection to MongoDB at {settings.MONGODB_URI}...")
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000
            )
            # Test ping
            await asyncio.wait_for(self.client.admin.command('ping'), timeout=2.5)
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.is_connected = True
            logger.info("Successfully connected to live MongoDB!")
        except Exception as e:
            self.is_connected = False
            self.client = None
            self.db = None
            logger.warning(
                f"MongoDB live connection not available ({e}). "
                "Activating transparent in-memory document store fallback."
            )

    async def disconnect(self):
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("MongoDB connection closed.")

    def get_collection(self, collection_name: str):
        if self.is_connected and self.db is not None:
            return self.db[collection_name]
        if collection_name not in self._mock_collections:
            self._mock_collections[collection_name] = InMemoryCollection(collection_name)
        return self._mock_collections[collection_name]

    @property
    def users(self):
        return self.get_collection("users")

    @property
    def cases(self):
        return self.get_collection("cases")

    @property
    def uploads(self):
        return self.get_collection("uploads")

    @property
    def extractions(self):
        return self.get_collection("extractions")

    @property
    def alerts(self):
        return self.get_collection("alerts")

    @property
    def audit_logs(self):
        return self.get_collection("audit_logs")


mongo_client = MongoDBClient()

