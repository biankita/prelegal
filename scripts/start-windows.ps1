$ErrorActionPreference = "Stop"

$ImageName = "prelegal:latest"
$ContainerName = "prelegal"
$Port = if ($env:PORT) { $env:PORT } else { "8000" }

Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Building Docker image $ImageName..."
docker build -t $ImageName .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$existing = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$" -Quiet
if ($existing) {
    Write-Host "Removing existing container $ContainerName..."
    docker rm -f $ContainerName | Out-Null
}

$EnvArgs = @()
if (Test-Path ".env") {
    $EnvArgs += @("--env-file", ".env")
}

Write-Host "Starting $ContainerName on http://localhost:$Port..."
docker run -d --name $ContainerName -p "${Port}:8000" @EnvArgs $ImageName
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Tail logs with: docker logs -f $ContainerName"
