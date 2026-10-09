from typing import Generic, List, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


def paginate(query, page: int, page_size: int):
    """Applies offset/limit to a SQLAlchemy query and returns (items, total)."""
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def page_meta(total: int, page: int, page_size: int) -> dict:
    total_pages = max(1, (total + page_size - 1) // page_size)
    return {"total": total, "page": page, "page_size": page_size, "total_pages": total_pages}
