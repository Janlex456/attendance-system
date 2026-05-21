# Test health endpoint
$health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
$health | ConvertTo-Json

# Test login again to verify persistence
$loginBody = @{
    email = "admin@example.com"
    password = "password"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
Write-Host "`nAdmin Login Result:" -ForegroundColor Green
$loginResponse.user | ConvertTo-Json
