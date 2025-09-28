#!/bin/bash

# Private Judge 배포 스크립트
# Usage: ./scripts/deploy.sh [environment]
# Environment: development, staging, production (default: production)

set -e  # 에러 발생 시 스크립트 중단

ENVIRONMENT=${1:-production}
PROJECT_NAME="private-judge"

echo "🚀 Private Judge 배포 시작 - Environment: $ENVIRONMENT"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 필수 도구 확인
check_dependencies() {
    log_info "필수 도구 확인 중..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js가 설치되어 있지 않습니다."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm이 설치되어 있지 않습니다."
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI가 설치되어 있지 않습니다. 설치 중..."
        npm install -g vercel
    fi
    
    if ! command -v supabase &> /dev/null; then
        log_warning "Supabase CLI가 설치되어 있지 않습니다. 설치 중..."
        npm install -g supabase
    fi
    
    log_success "모든 필수 도구가 준비되었습니다."
}

# 환경 변수 확인
check_environment() {
    log_info "환경 변수 확인 중..."
    
    required_vars=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE"
        "OPENAI_API_KEY"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "다음 환경 변수가 설정되지 않았습니다:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_info ".env.local 파일을 확인하거나 환경 변수를 설정해주세요."
        exit 1
    fi
    
    log_success "모든 환경 변수가 설정되었습니다."
}

# 코드 품질 검사
run_quality_checks() {
    log_info "코드 품질 검사 실행 중..."
    
    # 린터 실행
    log_info "ESLint 실행 중..."
    npm run lint
    
    # 타입 체크
    log_info "TypeScript 타입 체크 실행 중..."
    npx tsc --noEmit
    
    # 테스트 실행
    log_info "테스트 실행 중..."
    npm run test -- --passWithNoTests
    
    log_success "모든 품질 검사를 통과했습니다."
}

# 빌드 테스트
test_build() {
    log_info "프로덕션 빌드 테스트 중..."
    
    npm run build
    
    if [[ $? -eq 0 ]]; then
        log_success "빌드가 성공적으로 완료되었습니다."
    else
        log_error "빌드에 실패했습니다."
        exit 1
    fi
}

# Supabase 마이그레이션 확인
check_database() {
    log_info "데이터베이스 상태 확인 중..."
    
    # 마이그레이션 상태 확인
    if supabase db diff --schema public > /dev/null 2>&1; then
        log_info "데이터베이스 스키마가 최신 상태입니다."
    else
        log_warning "데이터베이스 스키마에 변경사항이 있을 수 있습니다."
        log_info "마이그레이션을 확인해주세요: supabase db diff"
    fi
    
    # 연결 테스트
    if curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY" | grep -q "200\|401"; then
        log_success "Supabase 연결이 정상입니다."
    else
        log_error "Supabase에 연결할 수 없습니다."
        exit 1
    fi
}

# Vercel 배포
deploy_to_vercel() {
    log_info "Vercel에 배포 중..."
    
    # 환경별 배포 설정
    case $ENVIRONMENT in
        "development")
            vercel --prod=false
            ;;
        "staging")
            vercel --prod=false --target=preview
            ;;
        "production")
            vercel --prod
            ;;
        *)
            log_error "지원하지 않는 환경입니다: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    if [[ $? -eq 0 ]]; then
        log_success "Vercel 배포가 완료되었습니다."
    else
        log_error "Vercel 배포에 실패했습니다."
        exit 1
    fi
}

# 배포 후 검증
verify_deployment() {
    log_info "배포 검증 중..."
    
    # Health check 엔드포인트 확인
    if [[ $ENVIRONMENT == "production" ]]; then
        HEALTH_URL="https://private-judge.vercel.app/api/health"
    else
        # 배포 URL을 동적으로 가져와야 함 (실제 구현에서는 Vercel CLI 출력 파싱)
        HEALTH_URL="https://private-judge-preview.vercel.app/api/health"
    fi
    
    log_info "Health check 확인 중: $HEALTH_URL"
    
    # 최대 5번 재시도
    for i in {1..5}; do
        if curl -s -f "$HEALTH_URL" > /dev/null; then
            log_success "배포된 애플리케이션이 정상적으로 작동합니다."
            
            # Health check 상세 정보 출력
            health_response=$(curl -s "$HEALTH_URL")
            echo "Health Check 결과:"
            echo "$health_response" | jq '.' 2>/dev/null || echo "$health_response"
            break
        else
            log_warning "Health check 실패 ($i/5). 30초 후 재시도..."
            sleep 30
        fi
        
        if [[ $i -eq 5 ]]; then
            log_error "배포 검증에 실패했습니다."
            exit 1
        fi
    done
}

# 배포 완료 알림
deployment_summary() {
    log_success "🎉 배포가 성공적으로 완료되었습니다!"
    
    echo ""
    echo "📋 배포 정보:"
    echo "  - 환경: $ENVIRONMENT"
    echo "  - 프로젝트: $PROJECT_NAME"
    echo "  - 시간: $(date)"
    
    if [[ $ENVIRONMENT == "production" ]]; then
        echo "  - URL: https://private-judge.vercel.app"
        echo "  - Health Check: https://private-judge.vercel.app/api/health"
    fi
    
    echo ""
    echo "🔗 유용한 링크:"
    echo "  - Vercel 대시보드: https://vercel.com/dashboard"
    echo "  - Supabase 대시보드: https://supabase.com/dashboard"
    echo "  - 프로젝트 저장소: https://github.com/your-org/private-judge"
    
    echo ""
    log_info "배포 스크립트가 완료되었습니다."
}

# 메인 실행 함수
main() {
    echo "========================================"
    echo "🏛️  Private Judge 배포 스크립트"
    echo "========================================"
    
    check_dependencies
    check_environment
    run_quality_checks
    test_build
    check_database
    deploy_to_vercel
    verify_deployment
    deployment_summary
}

# 스크립트 실행
main "$@"
