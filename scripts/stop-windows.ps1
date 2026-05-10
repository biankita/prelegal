$ErrorActionPreference = "Stop"

$ContainerName = "prelegal"

$existing = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$" -Quiet
if ($existing) {
    Write-Host "Stopping and removing $ContainerName..."
    docker rm -f $ContainerName | Out-Null
    Write-Host "Stopped."
} else {
    Write-Host "No container named $ContainerName is running."
}
