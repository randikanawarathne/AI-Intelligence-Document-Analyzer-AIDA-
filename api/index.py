"""
Vercel Serverless Entrypoint for AIDA FastAPI Backend
"""

import sys
import os
from pathlib import Path

# Ensure backend package is in python path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(root_dir / "backend"))

from backend.main import app

# Vercel looks for 'app' handler
handler = app
