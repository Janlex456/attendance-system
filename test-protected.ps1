# First get the token
$loginBody = @{
    email = "admin@example.com"
    password = "password"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token

# Test protected endpoint - get teachers list
$headers = @{
    "Authorization" = "Bearer $token"
}

$teachersResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/teachers" -Method Get -Headers $headers
$teachersResponse | ConvertTo-Json
