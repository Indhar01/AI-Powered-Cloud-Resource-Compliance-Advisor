# Celery Async Tasks

import os
import time
import json
from celery import Celery
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import sessionmaker, declarative_base
import time

# Environment Variables (Defaults for K8s)
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password123@postgres.infra:5432/postgres")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis.infra:6379/0")

app = Celery('tasks', broker=REDIS_URL)
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class TaskLog(Base):
    __tablename__ = "task_logs"
    id = Column(Integer, primary_key=True, index=True)
    resource_name = Column(String)
    environment = Column(String)
    compliance_score = Column(Integer)
    compliance_status = Column(String)
    suggestions = Column(Text)
    status = Column(String)

# Ensure tables exist
Base.metadata.create_all(bind=engine)

@app.task
def provision_resource(task_id):
    session = SessionLocal()
    task = session.query(TaskLog).filter(TaskLog.id == task_id).first()
    
    if task:
        print(f"[Worker] Processing Task {task_id}...")
        task.status = "PROCESSING"
        session.commit()

        # Simulate Terraform/Cloud Provisioning
        # time.sleep(10) 

        # print(f"[Worker] Task {task_id} Completed.")
        # task.status = "COMPLETED"
        # session.commit()

        end_time = time.time() + 15 
        while time.time() < end_time:
            _ = [x * x for x in range(10000)] # Burns CPU
        
        print(f"[Worker] Task {task_id} Completed.")
        task.status = "COMPLETED"
        session.commit()
    
    session.close()
    return "Done"