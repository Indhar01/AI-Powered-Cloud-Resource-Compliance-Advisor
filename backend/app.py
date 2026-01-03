# Flask/FastAPI Application Entry Point

import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from pydantic import BaseModel, ValidationError
from typing import Dict, List
from tasks import provision_resource, TaskLog, SessionLocal
from compliance import ComplianceAdvisor

app = Flask(__name__)
CORS(app)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "local-dev-secret")
jwt = JWTManager(app)
advisor = ComplianceAdvisor()

# Pydantic Models
class SecurityGroup(BaseModel):
    allowed_cidrs: List[str]

class ResourceRequest(BaseModel):
    resource_name: str
    environment: str
    instance_type: str
    encrypted: bool
    tags: Dict[str, str]
    security_group: SecurityGroup

class LoginSchema(BaseModel):
    username: str
    password: str

@app.route('/login', methods=['POST'])
def login():
    try:
        creds = LoginSchema(**request.json)
        # Mock Auth Check
        if creds.username == "admin" and creds.password == "password123":
            token = create_access_token(identity=creds.username)
            return jsonify(access_token=token), 200
        return jsonify({"msg": "Bad credentials"}), 401
    except ValidationError as e:
        return jsonify(e.errors()), 400

@app.route('/submit-resource', methods=['POST'])
@jwt_required()
def submit_resource():
    print("🚀 CI/CD DEPLOYMENT SUCCESSFUL! Processing request..")
    try:
        req_data = ResourceRequest(**request.json)
    except ValidationError as e:
        return jsonify(e.errors()), 422

    # Run Compliance Check
    audit = advisor.evaluate(req_data.dict())

    # Save to DB
    session = SessionLocal()
    new_task = TaskLog(
        resource_name=req_data.resource_name,
        environment=req_data.environment,
        compliance_score=audit["compliance_score"],
        compliance_status=audit["status"],
        suggestions=json.dumps(audit["suggestions"]),
        status="QUEUED"
    )
    session.add(new_task)
    session.commit()
    session.refresh(new_task)
    task_id = new_task.id
    session.close()

    # Trigger Worker
    provision_resource.delay(task_id)

    return jsonify({"task_id": task_id, "compliance": audit}), 201

@app.route('/tasks', methods=['GET'])
def get_tasks():
    session = SessionLocal()
    tasks = session.query(TaskLog).order_by(TaskLog.id.desc()).limit(10).all()
    session.close()
    
    result = []
    for t in tasks:
        result.append({
            "id": t.id,
            "resource": t.resource_name,
            "score": t.compliance_score,
            "status": t.status,
            "suggestions": json.loads(t.suggestions) if t.suggestions else []
        })
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)