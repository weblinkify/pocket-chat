from typing import Annotated

from fastapi import APIRouter, Depends

from app import __version__
from app.providers.base import LLMProvider
from app.routers.deps import get_provider
from app.schemas import Health

router = APIRouter(tags=["health"])


@router.get("/health", response_model=Health)
async def health(provider: Annotated[LLMProvider, Depends(get_provider)]) -> Health:
    return Health(provider=provider.name, version=__version__)
