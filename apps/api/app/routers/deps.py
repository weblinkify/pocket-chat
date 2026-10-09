from fastapi import Request

from app.providers.base import LLMProvider


def get_provider(request: Request) -> LLMProvider:
    provider: LLMProvider = request.app.state.provider
    return provider
