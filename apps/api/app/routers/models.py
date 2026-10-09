from typing import Annotated

from fastapi import APIRouter, Depends

from app.providers.base import LLMProvider
from app.routers.deps import get_provider
from app.schemas import ModelList

router = APIRouter(prefix="/v1", tags=["models"])


@router.get("/models", response_model=ModelList)
async def list_models(provider: Annotated[LLMProvider, Depends(get_provider)]) -> ModelList:
    return ModelList(data=await provider.list_models())
