from app.config import Settings
from app.providers.base import LLMProvider
from app.providers.mock.provider import MockProvider


def build_provider(settings: Settings) -> LLMProvider:
    """Pick the provider from LLM_PROVIDER. Real providers are imported lazily."""
    if settings.llm_provider == "openai":
        from app.providers.openai_provider import OpenAIProvider

        return OpenAIProvider(settings)
    if settings.llm_provider == "anthropic":
        from app.providers.anthropic_provider import AnthropicProvider

        return AnthropicProvider(settings)
    return MockProvider(settings)
