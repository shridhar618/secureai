from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.message import Message
from app.models.user import User

messages_bp = Blueprint("messages", __name__)


def _get_json_payload():
    return request.get_json(silent=True) or {}


@messages_bp.route("/messages/<int:other_id>", methods=["GET"])
@jwt_required()
def get_conversation(other_id):
    current_id = int(get_jwt_identity())
    other_user = User.query.filter_by(id=other_id, is_active=True).first()
    if not other_user:
        return jsonify({"error": "User not found"}), 404

    msgs = (
        Message.query
        .filter(
            ((Message.sender_id == current_id) & (Message.receiver_id == other_id))
            | ((Message.sender_id == other_id) & (Message.receiver_id == current_id))
        )
        .order_by(Message.timestamp.asc())
        .limit(100)
        .all()
    )
    # Mark received as read
    for m in msgs:
        if m.receiver_id == current_id and not m.is_read:
            m.is_read = True
    db.session.commit()
    return jsonify({"messages": [m.to_dict() for m in msgs]}), 200


@messages_bp.route("/messages", methods=["POST"])
@jwt_required()
def send_message():
    current_id = int(get_jwt_identity())
    data = _get_json_payload()
    receiver_id = data.get("receiver_id")
    content = data.get("content", "").strip()

    if not receiver_id or not content:
        return jsonify({"error": "receiver_id and content required"}), 400

    try:
        receiver_id = int(receiver_id)
    except (TypeError, ValueError):
        return jsonify({"error": "receiver_id must be an integer"}), 400

    if receiver_id == current_id:
        return jsonify({"error": "Cannot send messages to yourself"}), 400

    receiver = User.query.filter_by(id=receiver_id, is_active=True).first()
    if not receiver:
        return jsonify({"error": "Receiver not found"}), 404

    msg = Message(sender_id=current_id, receiver_id=receiver_id, content=content)
    db.session.add(msg)
    db.session.commit()
    return jsonify({"message": msg.to_dict()}), 201


@messages_bp.route("/messages/unread", methods=["GET"])
@jwt_required()
def unread_count():
    current_id = int(get_jwt_identity())
    count = Message.query.filter_by(receiver_id=current_id, is_read=False).count()
    return jsonify({"unread": count}), 200
