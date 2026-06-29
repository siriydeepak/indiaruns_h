@echo off
echo =====================================================================
echo    Launching WeHire - Intelligent Candidate Discovery Platform
echo =====================================================================
echo.

echo [1/2] Launching Backend FastAPI Service on http://127.0.0.1:8080...
start "WeHire Backend (FastAPI)" cmd /k "cd backend && python -m uvicorn app.main:app --port 8080 --host 127.0.0.1"

echo [2/2] Launching Frontend Recruiter Dashboard on http://localhost:5173...
start "WeHire Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo Platform Boot Sequence Completed.
echo ---------------------------------------------------------------------
echo - Recruiter Dashboard:  http://localhost:5173
echo - Swagger API Schemas:  http://localhost:8080/docs
echo ---------------------------------------------------------------------
echo Close the respective cmd windows to terminate the services.
echo.
pause
