# Check if Docker is running
Write-Host "Checking if Docker is running..." -ForegroundColor Cyan
& docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker is not running. Please start Docker Desktop and try again."
    Exit 1
}

# 1. Start Docker containers (Zookeeper & Kafka)
Write-Host "Starting Kafka & Zookeeper via Docker..." -ForegroundColor Cyan
docker-compose up -d zookeeper kafka

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start Docker services."
    Exit 1
}

# Helper function to detect python virtual env and build start command
function Get-PythonCommand {
    param ($baseScript)
    if (Test-Path "venv\Scripts\activate.ps1") {
        return "venv\Scripts\activate.ps1; $baseScript"
    } elseif (Test-Path ".venv\Scripts\activate.ps1") {
        return ".venv\Scripts\activate.ps1; $baseScript"
    } else {
        return $baseScript
    }
}

# 2. Start Backend Server in a new window
Write-Host "Launching Backend Server (Uvicorn)..." -ForegroundColor Cyan
$backendCmd = Get-PythonCommand "uvicorn main:app --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; $backendCmd"

# 3. Start Kafka Worker in a new window
Write-Host "Launching Kafka Ingestion Worker..." -ForegroundColor Cyan
$workerCmd = Get-PythonCommand "python -m workers.ingestion_worker"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; $workerCmd"

# 4. Start Frontend Dev Server in a new window
Write-Host "Launching Frontend Dev Server (Next.js)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "All services started! Check the newly opened PowerShell windows for logs." -ForegroundColor Green
Write-Host "Frontend is running at: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend API is running at: http://localhost:8000" -ForegroundColor Green
