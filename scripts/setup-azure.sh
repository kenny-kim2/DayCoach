#!/bin/bash
# DayCoach Azure 리소스 생성 + GitHub Secrets 자동 설정 스크립트
# 사용법: ./scripts/setup-azure.sh
# 전제조건: az login, gh auth login

set -e

# ─── 색상 ───────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ─── 사전 확인 ──────────────────────────────────────
command -v az  >/dev/null || error "Azure CLI가 설치되어 있지 않습니다. https://docs.microsoft.com/cli/azure/install-azure-cli"
command -v gh  >/dev/null || error "GitHub CLI가 설치되어 있지 않습니다. https://cli.github.com"
az account show >/dev/null 2>&1 || error "Azure에 로그인되어 있지 않습니다. 'az login'을 먼저 실행하세요."
gh auth status >/dev/null 2>&1  || error "GitHub에 로그인되어 있지 않습니다. 'gh auth login'을 먼저 실행하세요."

# Microsoft.Web provider 등록 (Static Web Apps 사용에 필요)
info "Azure 프로바이더 등록 확인 중..."
PROVIDER_STATE=$(az provider show --namespace Microsoft.Web --query "registrationState" -o tsv 2>/dev/null)
if [[ "$PROVIDER_STATE" != "Registered" ]]; then
  warn "Microsoft.Web 프로바이더를 등록하는 중... (최초 1회만 필요, 약 30초 소요)"
  az provider register --namespace Microsoft.Web --wait >/dev/null
  success "Microsoft.Web 프로바이더 등록 완료"
else
  success "Microsoft.Web 프로바이더 이미 등록됨"
fi

# ─── 설정 ────────────────────────────────────────────
REPO="kenny-kim2/DayCoach"
RESOURCE_GROUP="${RESOURCE_GROUP:-daycoach-rg}"
LOCATION="${LOCATION:-koreacentral}"
# Static Web Apps는 koreacentral 미지원 → eastasia 사용
SWA_LOCATION="${SWA_LOCATION:-eastasia}"
BACKEND_APP_NAME="${BACKEND_APP_NAME:-daycoach-api}"
FRONTEND_APP_NAME="${FRONTEND_APP_NAME:-daycoach-frontend}"
APP_SERVICE_PLAN="${APP_SERVICE_PLAN:-daycoach-plan}"

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  DayCoach Azure 배포 설정 스크립트     ${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "  리소스 그룹  : ${YELLOW}$RESOURCE_GROUP${NC}"
echo -e "  위치         : ${YELLOW}$LOCATION${NC} (App Service) / ${YELLOW}$SWA_LOCATION${NC} (Static Web Apps)"
echo -e "  백엔드 앱    : ${YELLOW}$BACKEND_APP_NAME${NC}"
echo -e "  프론트엔드   : ${YELLOW}$FRONTEND_APP_NAME${NC}"
echo ""
read -p "계속 진행하시겠습니까? (y/N) " -n 1 -r; echo
[[ $REPLY =~ ^[Yy]$ ]] || exit 0

# ─── 환경변수 입력 ───────────────────────────────────
echo ""
info "Azure OpenAI 환경변수를 입력하세요."
read -rsp "  AZURE_OPENAI_API_KEY: "     AZURE_OPENAI_API_KEY;     echo
read -rp  "  AZURE_OPENAI_ENDPOINT: "   AZURE_OPENAI_ENDPOINT;    echo
read -rp  "  AZURE_OPENAI_DEPLOYMENT (기본: gpt-4o): " AZURE_OPENAI_DEPLOYMENT
AZURE_OPENAI_DEPLOYMENT="${AZURE_OPENAI_DEPLOYMENT:-gpt-4o}"

# ─── 1. 리소스 그룹 ──────────────────────────────────
info "리소스 그룹 확인 중..."
if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" >/dev/null
  success "리소스 그룹 생성됨: $RESOURCE_GROUP"
else
  success "기존 리소스 그룹 사용: $RESOURCE_GROUP"
fi

# ─── 2. App Service Plan ─────────────────────────────
info "App Service Plan 확인 중..."
if ! az appservice plan show --name "$APP_SERVICE_PLAN" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az appservice plan create \
    --name "$APP_SERVICE_PLAN" \
    --resource-group "$RESOURCE_GROUP" \
    --sku B1 \
    --is-linux >/dev/null
  success "App Service Plan 생성됨: $APP_SERVICE_PLAN (B1 Linux)"
else
  success "기존 App Service Plan 사용: $APP_SERVICE_PLAN"
fi

# ─── 3. Backend Web App ───────────────────────────────
info "백엔드 Web App 확인 중..."
if ! az webapp show --name "$BACKEND_APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az webapp create \
    --name "$BACKEND_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$APP_SERVICE_PLAN" \
    --runtime "NODE:20-lts" >/dev/null
  success "백엔드 Web App 생성됨: $BACKEND_APP_NAME"
else
  success "기존 백엔드 Web App 사용: $BACKEND_APP_NAME"
fi

# 환경변수 설정
info "백엔드 환경변수 설정 중..."
az webapp config appsettings set \
  --name "$BACKEND_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
    AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
    AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
    PORT="3001" \
    NODE_ENV="production" >/dev/null
success "백엔드 환경변수 설정 완료"

# Publish Profile → GitHub Secret
info "백엔드 Publish Profile 가져오는 중..."
PUBLISH_PROFILE=$(az webapp deployment list-publishing-profiles \
  --name "$BACKEND_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --xml)
gh secret set AZURE_BACKEND_PUBLISH_PROFILE \
  --repo "$REPO" \
  --body "$PUBLISH_PROFILE"
gh secret set AZURE_BACKEND_APP_NAME \
  --repo "$REPO" \
  --body "$BACKEND_APP_NAME"
success "GitHub Secret 설정됨: AZURE_BACKEND_PUBLISH_PROFILE, AZURE_BACKEND_APP_NAME"

# ─── 4. Static Web App (Frontend) ────────────────────
info "프론트엔드 Static Web App 확인 중..."
if ! az staticwebapp show --name "$FRONTEND_APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az staticwebapp create \
    --name "$FRONTEND_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$SWA_LOCATION" \
    --source "https://github.com/$REPO" \
    --branch main \
    --app-location frontend \
    --output-location .next \
    --login-with-github >/dev/null
  success "Static Web App 생성됨: $FRONTEND_APP_NAME"
else
  success "기존 Static Web App 사용: $FRONTEND_APP_NAME"
fi

# Static Web Apps 토큰 → GitHub Secret
info "Static Web Apps 토큰 가져오는 중..."
SWA_TOKEN=$(az staticwebapp secrets list \
  --name "$FRONTEND_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" -o tsv)

BACKEND_URL="https://${BACKEND_APP_NAME}.azurewebsites.net"
FRONTEND_URL=$(az staticwebapp show \
  --name "$FRONTEND_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "defaultHostname" -o tsv)

gh secret set AZURE_STATIC_WEB_APPS_TOKEN --repo "$REPO" --body "$SWA_TOKEN"
gh secret set NEXT_PUBLIC_API_URL --repo "$REPO" --body "$BACKEND_URL"
success "GitHub Secrets 설정됨: AZURE_STATIC_WEB_APPS_TOKEN, NEXT_PUBLIC_API_URL"

# CORS 설정 (백엔드에 프론트엔드 URL 허용)
info "백엔드 CORS 설정 중..."
az webapp config appsettings set \
  --name "$BACKEND_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings CORS_ORIGIN="https://$FRONTEND_URL" >/dev/null
success "CORS 설정 완료"

# ─── 완료 ────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ 배포 설정 완료!                     ${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 프론트엔드 : ${YELLOW}https://$FRONTEND_URL${NC}"
echo -e "  🔧 백엔드 API : ${YELLOW}$BACKEND_URL${NC}"
echo ""
echo -e "  GitHub Secrets 설정됨:"
echo -e "    ✓ AZURE_BACKEND_PUBLISH_PROFILE"
echo -e "    ✓ AZURE_BACKEND_APP_NAME"
echo -e "    ✓ AZURE_STATIC_WEB_APPS_TOKEN"
echo -e "    ✓ NEXT_PUBLIC_API_URL"
echo ""
echo -e "  다음 단계:"
echo -e "    1. ${YELLOW}git push origin main${NC} → GitHub Actions 자동 배포 시작"
echo -e "    2. GitHub Actions 탭에서 진행 상황 확인"
echo -e "    3. 배포 완료 후 위 URL로 접속 확인"
echo ""
echo -e "  배포 정보 저장 위치: ${YELLOW}./deployment-info.md${NC}"

# deployment-info.md 생성
cat > deployment-info.md << EOF
# DayCoach 배포 정보

> 생성일: $(date '+%Y-%m-%d %H:%M:%S')

## 배포 URL
- **프론트엔드**: https://$FRONTEND_URL
- **백엔드 API**: $BACKEND_URL

## Azure 리소스
| 리소스 | 이름 |
|---|---|
| 리소스 그룹 | $RESOURCE_GROUP |
| App Service Plan | $APP_SERVICE_PLAN |
| 백엔드 Web App | $BACKEND_APP_NAME |
| 프론트엔드 Static Web App | $FRONTEND_APP_NAME |

## GitHub Secrets (설정 완료)
- \`AZURE_BACKEND_PUBLISH_PROFILE\`
- \`AZURE_BACKEND_APP_NAME\`
- \`AZURE_STATIC_WEB_APPS_TOKEN\`
- \`NEXT_PUBLIC_API_URL\`

## 재배포 방법
\`\`\`bash
git push origin main   # 자동 배포 트리거
\`\`\`

또는 GitHub Actions 탭에서 수동 실행 (workflow_dispatch)
EOF

success "deployment-info.md 저장 완료"
