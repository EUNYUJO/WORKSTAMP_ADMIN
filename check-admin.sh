#!/bin/bash

# 관리자 페이지 상태 확인 스크립트
# 사용법: ./check-admin.sh

# .env 파일 로드
if [ ! -f ".env" ]; then
  echo "❌ .env 파일을 찾을 수 없습니다."
  exit 1
fi

set -a
source .env
set +a

# 필수 환경 변수 확인
if [ -z "$DEPLOY_SERVER_USER" ] || [ -z "$DEPLOY_SERVER_HOST" ] || [ -z "$DEPLOY_SSH_KEY" ] || [ -z "$DEPLOY_APP_DIR" ]; then
  echo "❌ .env 파일에 필수 배포 설정이 없습니다."
  exit 1
fi

SERVER_USER="${DEPLOY_SERVER_USER}"
SERVER_HOST="${DEPLOY_SERVER_HOST}"
SSH_KEY="${DEPLOY_SSH_KEY}"
APP_DIR="${DEPLOY_APP_DIR}"

echo "🔍 관리자 페이지 상태 확인 중..."
echo ""

# 1. PM2 프로세스 상태 확인
echo "📊 PM2 프로세스 상태:"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "pm2 list" || echo "❌ PM2 명령어 실행 실패"
echo ""

# 2. 애플리케이션 상태 확인
echo "📊 애플리케이션 상태:"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "cd ${APP_DIR} && DEPLOY_APP_NAME=workstamp-admin DEPLOY_APP_DIR=${APP_DIR} ./run.sh status" || echo "❌ 상태 확인 실패"
echo ""

# 3. 포트 사용 확인
echo "📊 포트 사용 상태:"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "lsof -i :3000 -i :3001 | head -10" || echo "❌ 포트 확인 실패"
echo ""

# 4. Health Check
echo "🏥 Health Check:"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "curl -f -s http://localhost:3000/api/health && echo ' ✅ 포트 3000 정상' || echo ' ❌ 포트 3000 실패'"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "curl -f -s http://localhost:3001/api/health && echo ' ✅ 포트 3001 정상' || echo ' ❌ 포트 3001 실패'"
echo ""

# 5. Nginx 상태 확인
echo "📊 Nginx 상태:"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "sudo systemctl status nginx --no-pager | head -10" || echo "❌ Nginx 상태 확인 실패"
echo ""

# 6. Nginx 설정 확인
echo "📊 Nginx 설정 파일:"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "sudo cat /etc/nginx/conf.d/workstamp-admin.conf 2>/dev/null || echo '❌ workstamp-admin.conf 파일 없음'"
echo ""

# 7. Nginx 설정 테스트
echo "📊 Nginx 설정 테스트:"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "sudo nginx -t" || echo "❌ Nginx 설정 오류"
echo ""

# 8. 현재 포트 확인
echo "📊 현재 활성 포트:"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "cat ${APP_DIR}/current-port.txt 2>/dev/null || echo '❌ current-port.txt 파일 없음'"
echo ""

# 9. PM2 로그 확인 (최근 20줄)
echo "📊 PM2 로그 (최근 20줄):"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "pm2 logs workstamp-admin-blue --lines 20 --nostream 2>/dev/null || echo '❌ BLUE 로그 없음'"
echo ""
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "pm2 logs workstamp-admin-green --lines 20 --nostream 2>/dev/null || echo '❌ GREEN 로그 없음'"
echo ""

# 10. 디렉토리 확인
echo "📊 애플리케이션 디렉토리:"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "ls -la ${APP_DIR} | head -10"
echo ""

echo "✅ 확인 완료"

