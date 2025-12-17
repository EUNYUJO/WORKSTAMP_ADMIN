#!/bin/bash

# Nginx 업스트림 설정 업데이트 스크립트
# 사용법: ./update-nginx-upstream.sh

APP_DIR="${DEPLOY_APP_DIR:-/home/ec2-user/WORKSTAMP_ADMIN}"
CURRENT_PORT_FILE="${APP_DIR}/current-port.txt"
NGINX_CONF="/etc/nginx/conf.d/workstamp-admin.conf"

if [ ! -f "$CURRENT_PORT_FILE" ]; then
    echo "❌ 현재 포트 파일을 찾을 수 없습니다."
    exit 1
fi

CURRENT_PORT=$(cat $CURRENT_PORT_FILE)

if [ "$CURRENT_PORT" != "3000" ] && [ "$CURRENT_PORT" != "3001" ]; then
    echo "❌ 잘못된 포트 번호: $CURRENT_PORT"
    exit 1
fi

echo "🔄 Nginx 업스트림을 포트 $CURRENT_PORT로 업데이트 중..."

# Nginx 설정 파일 생성/업데이트
# 백엔드 API와 함께 사용하기 위해 location 경로로 분기
sudo tee $NGINX_CONF > /dev/null <<EOF
upstream workstamp_admin {
    server localhost:${CURRENT_PORT};
}

# 백엔드 API는 workstamp-api.conf에서 처리하므로
# 프론트엔드는 /api/ 경로를 제외한 모든 경로 처리
server {
    listen 80;
    server_name _;

    # /api/ 경로는 백엔드로 (workstamp-api.conf에서 처리)
    # 여기서는 프론트엔드만 처리

    location / {
        # /api/로 시작하는 경로는 백엔드로 전달하지 않음
        proxy_pass http://workstamp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

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

