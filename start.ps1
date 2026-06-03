# ============================================================
#  BTL SaaS - Lanzador Local
#  Los servidores corren en ventanas minimizadas (persistentes)
# ============================================================

Write-Host ""
Write-Host "  BIENVENIDO - BTL SaaS Canjes" -ForegroundColor Magenta
Write-Host ""

# -- Funcion para matar proceso por puerto ------------------
function Kill-Port {
    param([int]$Port)
    $proc = netstat -ano |
        Select-String ":$Port " |
        ForEach-Object { ($_ -split '\s+')[-1] } |
        Select-Object -First 1 |
        Where-Object { $_ -ne "0" -and $_ -ne "" }
    if ($proc) {
        Write-Host "        -> Matando proceso en puerto $Port (PID $proc)" -ForegroundColor Yellow
        Stop-Process -Id ([int]$proc) -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 800
    } else {
        Write-Host "        -> Puerto $Port libre." -ForegroundColor Green
    }
}

Write-Host "[ 1/4 ] Verificando puerto 4000 (Backend)..." -ForegroundColor Cyan
Kill-Port 4000

Write-Host "[ 2/4 ] Verificando puerto 5173 (Frontend)..." -ForegroundColor Cyan
Kill-Port 5173

Start-Sleep -Seconds 1

# -- 3. Backend en ventana minimizada (persiste sin Antigravity) --
Write-Host "[ 3/4 ] Iniciando Backend..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c cd /d f:\app-de-canjes\backend && npm run dev" `
    -WindowStyle Minimized

Start-Sleep -Seconds 5

# -- 4. Frontend en ventana minimizada -----------------------
Write-Host "[ 4/4 ] Iniciando Frontend..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c cd /d f:\app-de-canjes\frontend && npm run dev" `
    -WindowStyle Minimized

Start-Sleep -Seconds 4

# -- Verificar que el backend respondio ---------------------
Write-Host ""
try {
    $res = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"admin@purplebtl.com","password":"admin123"}' `
        -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  Backend: OK - Login verificado" -ForegroundColor Green
} catch {
    Write-Host "  Backend: aun iniciando, espera unos segundos..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  OK - Servidores levantados (ventanas minimizadas)." -ForegroundColor Green
Write-Host ""
Write-Host "  App:    http://localhost:5173" -ForegroundColor White
Write-Host "  API:    http://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "  Admin:  admin@purplebtl.com  /  admin123" -ForegroundColor DarkGray
Write-Host "  Staff:  josenarva@purplebtl.com  /  staff123" -ForegroundColor DarkGray
Write-Host ""
