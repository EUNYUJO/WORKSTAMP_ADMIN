#!/bin/bash

# 서버 상태 확인 스크립트
# 사용법: ./check-server.sh

APP_DIR="${DEPLOY_APP_DIR:-/home/ec2-user/WORKSTAMP_ADMIN}"

echo "🔍 서버 상태 확인 중..."
echo ""

# 1. PM2 프로세스 확인
echo "📊 PM2 프로세스 상태:"
pm2 list
echo ""

# 2. 포트 확인
echo "🔌 포트 사용 상태:"
echo "포트 3000:"
sudo netstat -tlnp | grep 3000 || echo "  포트 3000 사용 중이지 않음"
echo ""
echo "포트 3001:"
sudo netstat -tlnp | grep 3001 || echo "  포트 3001 사용 중이지 않음"
echo ""

# 3. Health Check
echo "🏥 Health Check:"
if curl -f -s "http://localhost:3000/api/health" > /dev/null 2>&1; then
    echo "  ✅ 포트 3000: 정상"
else
    echo "  ❌ 포트 3000: 실패"
fi

if curl -f -s "http://localhost:3001/api/health" > /dev/null 2>&1; then
    echo "  ✅ 포트 3001: 정상"
else
    echo "  ❌ 포트 3001: 실패"
fi
echo ""

# 4. Nginx 상태
echo "🌐 Nginx 상태:"
if command -v nginx > /dev/null 2>&1; then
    sudo systemctl status nginx --no-pager | head -5
    echo ""
    echo "Nginx 설정 파일:"
    sudo nginx -t 2>&1
else
    echo "  ⚠️  Nginx가 설치되어 있지 않습니다."
fi
echo ""

# 5. PM2 로그 (최근 10줄)
echo "📋 PM2 로그 (최근 10줄):"
pm2 logs --lines 10 --nostream
echo ""

# 6. 현재 활성 포트 확인
if [ -f "${APP_DIR}/current-port.txt" ]; then
    CURRENT_PORT=$(cat ${APP_DIR}/current-port.txt)
    echo "📍 현재 활성 포트: $CURRENT_PORT"
else
    echo "📍 현재 활성 포트: 확인 불가 (current-port.txt 없음)"
fi

