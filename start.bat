@echo off
echo ========================================================
echo   AIDA — AI Intelligence Document Analyzer v2.0
echo ========================================================
echo.
echo Starting FastAPI Server and Web HUD on http://localhost:8000 ...
echo.

start "" "http://localhost:8000"
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
