from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import Settings
from app.errors import register_error_handlers
from app.logging import configure_logging
from app.middleware import RequestIdMiddleware
from app.providers.factory import build_provider
from app.rate_limit import RateLimiter
from app.routers import chat, health, models
from app.schemas import ChatCompletionChunk


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings.log_level, json=settings.log_json)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        yield

    app = FastAPI(
        title="Pocket Chat API",
        version=__version__,
        description="OpenAI-style chat completions with SSE streaming. Mock provider by default.",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.provider = build_provider(settings)
    app.state.rate_limiter = RateLimiter(settings.rate_limit)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "Retry-After"],
    )
    app.add_middleware(RequestIdMiddleware)
    register_error_handlers(app)

    app.include_router(health.router)
    app.include_router(models.router)
    app.include_router(chat.router)

    def openapi() -> dict[str, Any]:
        if app.openapi_schema:
            return app.openapi_schema
        from fastapi.openapi.utils import get_openapi

        schema = get_openapi(
            title=app.title, version=app.version, description=app.description, routes=app.routes
        )
        # The stream's event payload isn't a response_model, so register it explicitly.
        chunk_schema = ChatCompletionChunk.model_json_schema(
            ref_template="#/components/schemas/{model}"
        )
        components = schema.setdefault("components", {}).setdefault("schemas", {})
        components.update(chunk_schema.pop("$defs", {}))
        components["ChatCompletionChunk"] = chunk_schema
        app.openapi_schema = schema
        return schema

    app.openapi = openapi  # type: ignore[method-assign]
    return app


app = create_app()
