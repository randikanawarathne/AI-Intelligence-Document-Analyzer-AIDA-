# AIDA — AI Intelligence Document Analyzer Startup Script
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  AIDA — AI Intelligence Document Analyzer v2.0" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting FastAPI Server on http://localhost:8000 ..." -ForegroundColor Yellow

Start-Process "http://localhost:8000"
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
