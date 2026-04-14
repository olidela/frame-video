#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILURES=0

pass() {
  printf '[OK] %s\n' "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1"
  FAILURES=$((FAILURES + 1))
}

check_file() {
  local path="$1"
  local label="$2"

  if [[ -f "$ROOT_DIR/$path" ]]; then
    pass "$label"
  else
    fail "$label"
  fi
}

check_contains() {
  local path="$1"
  local pattern="$2"
  local label="$3"

  if grep -Fq "$pattern" "$ROOT_DIR/$path"; then
    pass "$label"
  else
    fail "$label"
  fi
}

echo "Premise check for frame-video"
echo

if [[ -d "$ROOT_DIR/.git" ]]; then
  pass "Repositório Git inicializado na raiz"
else
  fail "Repositório Git inicializado na raiz"
fi

if git -C "$ROOT_DIR" remote get-url origin >/dev/null 2>&1; then
  ORIGIN_URL="$(git -C "$ROOT_DIR" remote get-url origin)"
  if [[ "$ORIGIN_URL" == git@github.com:* ]]; then
    pass "Remoto origin configurado em SSH"
  elif [[ "${GITHUB_ACTIONS:-}" == "true" && "$ORIGIN_URL" == https://github.com/* ]]; then
    pass "Remoto origin configurado em modo compatível com CI"
  else
    fail "Remoto origin configurado em SSH"
  fi
else
  fail "Remoto origin configurado em SSH"
fi

if TRACKED_IGNORED="$(git -C "$ROOT_DIR" ls-files -ci --exclude-standard)" && [[ -z "$TRACKED_IGNORED" ]]; then
  pass "Nenhum arquivo ignorado está rastreado pelo Git"
else
  fail "Nenhum arquivo ignorado está rastreado pelo Git"
fi

check_file ".gitignore" ".gitignore presente"
check_file "README.md" "README presente"
check_file "premissas/premise-check-config.md" "Configuração de premissas presente"
check_file "premissas/premise-compliance-report.md" "Relatório de compliance presente"
check_file "premissas/premissas-consolidadas.md" "Premissas consolidadas presentes"
check_file "premissas/data-relevance-framework.md" "Framework de relevância de dados presente"
check_file ".github/workflows/ci.yml" "Workflow de CI presente"
check_file ".github/workflows/pages.yml" "Workflow de deploy do GitHub Pages presente"

if [[ -f "$ROOT_DIR/.gitignore" ]]; then
  check_contains ".gitignore" "__pycache__/" ".gitignore cobre cache Python"
  check_contains ".gitignore" "*.zip" ".gitignore cobre artefatos ZIP locais"
  check_contains ".gitignore" ".env" ".gitignore cobre arquivos de ambiente"
  check_contains ".gitignore" ".codex" ".gitignore cobre artefatos locais do Codex"
  check_contains ".gitignore" "premissas/.git-repository-backup/" ".gitignore cobre backup de Git embutido"
fi

if [[ -f "$ROOT_DIR/README.md" ]]; then
  check_contains "README.md" "## Premissas e compliance" "README documenta premissas e compliance"
fi

if [[ -f "$ROOT_DIR/premissas/premise-check-config.md" ]]; then
  if grep -Fq "PENDENTE" "$ROOT_DIR/premissas/premise-check-config.md"; then
    fail "Há pendências explícitas em premise-check-config.md"
  else
    pass "Sem pendências explícitas em premise-check-config.md"
  fi
fi

echo
if [[ "$FAILURES" -gt 0 ]]; then
  echo "Resultado: NÃO CONFORME ($FAILURES falha(s))"
  exit 1
fi

echo "Resultado: CONFORME"
