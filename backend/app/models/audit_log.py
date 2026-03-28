from app import db
from datetime import datetime


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    username = db.Column(db.String(80), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    user_query = db.Column("query", db.Text, nullable=False)
    ai_response = db.Column(db.Text, nullable=True)
    filtered_response = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False)  # allowed / blocked / filtered
    risk_score = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.username,
            "role": self.role,
            "query": self.user_query,
            "ai_response": self.ai_response,
            "filtered_response": self.filtered_response,
            "status": self.status,
            "risk_score": self.risk_score,
            "timestamp": self.timestamp.isoformat(),
        }
