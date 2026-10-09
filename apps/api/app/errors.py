from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.providers.base import ProviderError
from app.rate_limit import RateLimitExceededError
from app.schemas import ErrorDetail, ErrorResponse


def _error(
    status: int,
    message: str,
    type_: str,
    code: str | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(error=ErrorDetail(message=message, type=type_, code=code))
    return JSONResponse(body.model_dump(), status_code=status, headers=headers)


def register_error_handlers(app: FastAPI) -> None:
    """Every error leaves the API in one OpenAI-style envelope: {"error": {message, type, code}}."""

    @app.exception_handler(ProviderError)
    async def provider_error(_: Request, exc: ProviderError) -> JSONResponse:
        headers = (
            {"Retry-After": str(exc.retry_after)}
            if isinstance(exc, RateLimitExceededError)
            else None
        )
        return _error(exc.status_code, exc.message, exc.type, exc.code, headers)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        loc = ".".join(str(p) for p in first.get("loc", ()) if p != "body")
        return _error(
            422,
            f"{loc}: {first.get('msg', 'Invalid request')}".strip(": "),
            "invalid_request_error",
        )

    @app.exception_handler(HTTPException)
    async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
        type_ = "not_found" if exc.status_code == 404 else "http_error"
        return _error(exc.status_code, str(exc.detail), type_)
