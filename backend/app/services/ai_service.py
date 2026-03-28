"""
Modular AI service layer.
Supports OpenAI (GPT) and Google Gemini.
Falls back to a mock response if no API key is set (demo mode).
"""

import os
import logging

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are SecureAI, an enterprise assistant. "
    "Be helpful, professional, and concise. "
    "Never refuse reasonable workplace questions."
)


def get_ai_response(messages: list[dict]) -> str:
    """
    Dispatch to the configured AI provider.
    `messages` is a list of {role, content} dicts (OpenAI format).
    """
    provider = os.getenv("AI_PROVIDER", "gemini").lower()

    if provider == "openai":
        return _openai_response(messages)
    elif provider == "gemini":
        return _gemini_response(messages)
    else:
        return _mock_response(messages)


# ---------------------------------------------------------------------------
# OpenAI
# ---------------------------------------------------------------------------

def _openai_response(messages: list[dict]) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key.startswith("your-"):
        return _mock_response(messages)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=full_messages,
            max_tokens=800,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        return _fallback_error(str(e))


# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------

def _gemini_response(messages: list[dict]) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key.startswith("your-"):
        return _mock_response(messages)

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )
        # Convert to Gemini format
        history = []
        last_user_msg = ""
        for m in messages:
            if m["role"] == "user":
                last_user_msg = m["content"]
                history.append({"role": "user", "parts": [m["content"]]})
            elif m["role"] == "assistant":
                history.append({"role": "model", "parts": [m["content"]]})

        chat = model.start_chat(history=history[:-1] if history else [])
        response = chat.send_message(last_user_msg)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini error: {e}")
        return _fallback_error(str(e))


# ---------------------------------------------------------------------------
# Mock (demo / no API key)
# ---------------------------------------------------------------------------

_MOCK_ANSWERS = {
    "hello": "Hello! I'm SecureAI, your enterprise AI assistant. How can I help you today?",
    "help": "I can assist with HR policies, technical questions, workplace guidelines, and general enterprise queries. What do you need?",
    "policy": "Our company policies cover code of conduct, data security, leave management, and compliance. Which area would you like to explore?",
    "leave": "Employees are entitled to 20 days of annual leave, 10 days of sick leave, and flexible work-from-home options per quarter.",
    "onboarding": "The onboarding process includes IT setup (Day 1), HR orientation (Day 1–2), department training (Week 1), and a 30-day review.",
    "security": "Our security framework includes Zero Trust architecture, multi-factor authentication, data encryption at rest and in transit, and regular audits.",
    "performance": "Performance reviews are conducted bi-annually. Goals are set in Q1, mid-year check-in in Q2, and full review in Q4.",
}

def _mock_response(messages: list[dict]) -> str:
    query = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            query = m.get("content", "").lower()
            break

    for key, answer in _MOCK_ANSWERS.items():
        if key in query:
            return answer

    return (
        "I'm SecureAI running in demo mode (no API key configured). "
        "I can answer questions about HR policies, onboarding, security, leave, and performance. "
        f"You asked: \"{query[:100]}\" — please configure an AI provider in .env for full responses."
    )


def _fallback_error(err: str) -> str:
    return (
        "I encountered an issue connecting to the AI provider. "
        "Please check your API key configuration. "
        f"Technical detail: {err[:120]}"
    )