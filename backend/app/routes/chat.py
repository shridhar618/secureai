from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.services.ai_service import get_ai_response
from app.services.governance import apply_governance

chat_bp = Blueprint("chat", __name__)

# In-memory conversation histories keyed by user_id
_histories: dict[int, list[dict]] = {}


@chat_bp.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    query = data.get("message", "").strip()
    if not query:
        return jsonify({"error": "Message is required"}), 400

    # Build conversation history
    if user_id not in _histories:
        _histories[user_id] = []
    _histories[user_id].append({"role": "user", "content": query})

    # Get AI response
    raw_response = get_ai_response(_histories[user_id])

    # Apply governance layer
    result = apply_governance(raw_response, query, user.role)

    # Append assistant response to history (raw, not filtered)
    _histories[user_id].append({"role": "assistant", "content": raw_response})

    # Keep history manageable
    if len(_histories[user_id]) > 20:
        _histories[user_id] = _histories[user_id][-20:]

    # Audit log
    log = AuditLog(
        user_id=user.id,
        username=user.username,
        role=user.role,
        query=query,
        ai_response=raw_response,
        filtered_response=result.filtered_response,
        status=result.status,
        risk_score=result.risk_score,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        "response": result.filtered_response,
        "status": result.status,
        "risk_score": result.risk_score,
        "role": user.role,
    }), 200


@chat_bp.route("/chat/clear", methods=["POST"])
@jwt_required()
def clear_history():
    user_id = int(get_jwt_identity())
    _histories.pop(user_id, None)
    return jsonify({"message": "Chat history cleared"}), 200