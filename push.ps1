param(
  [string]$Message
)

if (-not $Message) {
  $Message = Read-Host "Commit message"
}

# OPCIONAL: si quieres comprobar que compila antes de subir
# npm run build

git add .
git commit -m "$Message"
git push