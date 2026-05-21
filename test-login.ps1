$body = @{
    email = "admin@example.com"
    password = "password"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json
