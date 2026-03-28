from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.models.audit_log import AuditLog

logs_bp = Blueprint("logs", __name__)


def _require_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    return user if user and user.role == "admin" else None


def _parse_positive_int(value, default, *, minimum=1, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    if parsed < minimum:
        return default
    if maximum is not None and parsed > maximum:
        return maximum
    return parsed


@logs_bp.route("/logs", methods=["GET"])
@jwt_required()
def get_logs():
    user = _require_admin()
    if not user:
        return jsonify({"error": "Admin access required"}), 403

    # Query params
    filter_user = request.args.get("username")
    filter_status = request.args.get("status")
    page = _parse_positive_int(request.args.get("page"), 1)
    per_page = _parse_positive_int(request.args.get("per_page"), 50, maximum=100)

    query = AuditLog.query.order_by(AuditLog.timestamp.desc())
    if filter_user:
        query = query.filter(AuditLog.username.ilike(f"%{filter_user}%"))
    if filter_status:
        query = query.filter(AuditLog.status == filter_status)

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "logs": [log.to_dict() for log in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page,
    }), 200


@logs_bp.route("/logs/stats", methods=["GET"])
@jwt_required()
def get_stats():
    user = _require_admin()
    if not user:
        return jsonify({"error": "Admin access required"}), 403

    from app import db
    from sqlalchemy import func

    total = AuditLog.query.count()
    blocked = AuditLog.query.filter_by(status="blocked").count()
    filtered = AuditLog.query.filter_by(status="filtered").count()
    allowed = AuditLog.query.filter_by(status="allowed").count()

    # Per-user stats
    user_stats = (
        db.session.query(AuditLog.username, func.count(AuditLog.id).label("count"))
        .group_by(AuditLog.username)
        .all()
    )

    return jsonify({
        "total": total,
        "blocked": blocked,
        "filtered": filtered,
        "allowed": allowed,
        "by_user": [{"username": u, "count": c} for u, c in user_stats],
    }), 200
