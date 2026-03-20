"""
Run this script once to train and save all ML models used at runtime.
Usage:
    cd backend
    python ml/train_models.py
"""
import sys
import os

# Ensure backend/ is on the path so relative imports inside ml/ work.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from ml.fraud_detector import train_isolation_forest

if __name__ == "__main__":
    print("=== Training AegiSync ML models ===")
    train_isolation_forest()
    print("=== Done ===")
