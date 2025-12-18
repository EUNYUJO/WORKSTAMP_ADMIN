#!/bin/bash

# Nginx 업스트림 설정 업데이트 스크립트
# 사용법: ./update-nginx-upstream.sh
# workstamp.conf의 프론트엔드 upstream 파일을 업데이트합니다.

APP_DIR="${DEPLOY_APP_DIR:-/home/ec2-user/WORKSTAMP_ADMIN}"
CURRENT_PORT_FILE="${APP_DIR}/current-port.txt"
ADMIN_UPSTREAM_FILE="/etc/nginx/conf.d/upstreams/workstamp-admin-upstream.conf"

if [ ! -f "$CURRENT_PORT_FILE" ]; then
    echo "❌ 현재 포트 파일을 찾을 수 없습니다."
    exit 1
fi

CURRENT_PORT=$(cat $CURRENT_PORT_FILE)

if [ "$CURRENT_PORT" != "3000" ] && [ "$CURRENT_PORT" != "3001" ]; then
    echo "❌ 잘못된 포트 번호: $CURRENT_PORT"
    exit 1
fi

echo "🔄 Nginx 프론트엔드 업스트림을 포트 $CURRENT_PORT로 업데이트 중..."

# 업스트림 디렉토리 생성
sudo mkdir -p /etc/nginx/conf.d/upstreams

# 프론트엔드 upstream 파일 업데이트
echo "server localhost:${CURRENT_PORT};" | sudo tee $ADMIN_UPSTREAM_FILE > /dev/null
echo "✅ 프론트엔드 upstream 파일 업데이트 완료: $ADMIN_UPSTREAM_FILE"

# Nginx 설정 테스트
if sudo nginx -t; then
    echo "✅ Nginx 설정 검증 성공"
    # Nginx 재로드
    sudo systemctl reload nginx
    echo "✅ Nginx 재로드 완료"
else
    echo "❌ Nginx 설정 검증 실패"
    exit 1
fi

echo "✅ Nginx 업스트림 업데이트 완료 (포트: $CURRENT_PORT)"

