#!/bin/bash

# 백엔드 API와 프론트엔드를 함께 사용하는 통합 Nginx 설정
# 사용법: ./setup-nginx-combined.sh

set -e

ADMIN_APP_DIR="${DEPLOY_APP_DIR:-/home/ec2-user/WORKSTAMP_ADMIN}"
API_APP_DIR="${API_APP_DIR:-/home/ec2-user/WORKSTAMP_API}"
NGINX_CONF="/etc/nginx/conf.d/workstamp.conf"

echo "🔧 통합 Nginx 설정 생성 중..."

# 현재 활성 포트 확인
ADMIN_CURRENT_PORT=3000
if [ -f "${ADMIN_APP_DIR}/current-port.txt" ]; then
    ADMIN_CURRENT_PORT=$(cat ${ADMIN_APP_DIR}/current-port.txt)
    echo "   프론트엔드 포트 파일에서 읽음: $ADMIN_CURRENT_PORT"
else
    # 포트 파일이 없으면 실행 중인 프로세스 확인
    if pm2 describe workstamp-admin-blue > /dev/null 2>&1; then
        ADMIN_CURRENT_PORT=3000
        echo "   프론트엔드: BLUE(3000) 실행 중"
    elif pm2 describe workstamp-admin-green > /dev/null 2>&1; then
        ADMIN_CURRENT_PORT=3001
        echo "   프론트엔드: GREEN(3001) 실행 중"
    else
        echo "   프론트엔드: 기본값(3000) 사용"
    fi
fi

API_CURRENT_PORT=8081
if [ -f "${API_APP_DIR}/current-port.txt" ]; then
    API_CURRENT_PORT=$(cat ${API_APP_DIR}/current-port.txt)
    echo "   백엔드 API 포트 파일에서 읽음: $API_CURRENT_PORT"
else
    # 포트 파일이 없으면 실행 중인 프로세스 확인
    if lsof -ti :8081 > /dev/null 2>&1; then
        API_CURRENT_PORT=8081
        echo "   백엔드 API: 포트 8081 사용 중"
    elif lsof -ti :8082 > /dev/null 2>&1; then
        API_CURRENT_PORT=8082
        echo "   백엔드 API: 포트 8082 사용 중"
    else
        echo "   백엔드 API: 기본값(8081) 사용"
    fi
fi

echo "   최종 설정:"
echo "   - 프론트엔드 포트: $ADMIN_CURRENT_PORT"
echo "   - 백엔드 API 포트: $API_CURRENT_PORT"

# 통합 Nginx 설정 생성
sudo tee $NGINX_CONF > /dev/null <<EOF
# Workstamp 통합 설정 (백엔드 API + 프론트엔드)

# 백엔드 API 업스트림
upstream workstamp_api_backend {
    server localhost:${API_CURRENT_PORT};
}

# 프론트엔드 업스트림
upstream workstamp_admin {
    server localhost:${ADMIN_CURRENT_PORT};
}

server {
    listen 80;
    server_name _;

    # 로그 설정
    access_log /var/log/nginx/workstamp-access.log;
    error_log /var/log/nginx/workstamp-error.log;

    # 클라이언트 최대 바디 크기
    client_max_body_size 10M;

    # Next.js API 경로 (NextAuth 등) - 백엔드 API보다 우선
    location /api/auth/ {
        proxy_pass http://workstamp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 백엔드 API 경로 (/api/로 시작하는 나머지 요청)
    location /api/ {
        proxy_pass http://workstamp_api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health Check 엔드포인트 (백엔드)
    location /actuator/health {
        proxy_pass http://workstamp_api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # 정적 파일 직접 서빙 (Next.js static 파일)
    # Next.js는 두 가지 형식으로 요청:
    # 1. /_next/static/chunks/... (BUILD_ID 없이 직접 - 실제 서버에 존재)
    # 2. /_next/static/{BUILD_ID}/... (BUILD_ID 포함 - 불일치 가능)
    # alias를 사용하여 /_next/static/ 경로를 .next/static/로 매핑
    location /_next/static/ {
        alias ${ADMIN_APP_DIR}/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        # alias와 try_files를 함께 사용하면 경로가 중복되므로
        # 파일이 없으면 자동으로 404를 반환하고, Next.js가 처리하도록 함
    }
    
    # 정적 파일을 찾지 못한 경우 Next.js 서버로 프록시
    location @nextjs_static_fallback {
        proxy_pass http://workstamp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # public 폴더 정적 파일
    location ~ ^/(favicon.ico|site.webmanifest|.*\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot))$ {
        root ${ADMIN_APP_DIR};
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files \$uri =404;
        allow all;
    }

    # 프론트엔드 (나머지 모든 경로)
    location / {
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

# 기존 개별 설정 파일 비활성화 (충돌 방지)
echo "🔍 기존 Nginx 설정 파일 확인 중..."

# workstamp-api.conf 비활성화
if [ -f "/etc/nginx/conf.d/workstamp-api.conf" ]; then
    echo "⚠️  기존 workstamp-api.conf를 비활성화합니다..."
    sudo mv /etc/nginx/conf.d/workstamp-api.conf /etc/nginx/conf.d/workstamp-api.conf.bak 2>/dev/null || true
fi

# workstamp-admin.conf 비활성화
if [ -f "/etc/nginx/conf.d/workstamp-admin.conf" ]; then
    echo "⚠️  기존 workstamp-admin.conf를 비활성화합니다..."
    sudo mv /etc/nginx/conf.d/workstamp-admin.conf /etc/nginx/conf.d/workstamp-admin.conf.bak 2>/dev/null || true
fi

# .bak 파일들도 확인 (이미 비활성화된 경우)
if [ -f "/etc/nginx/conf.d/workstamp-api.conf.bak" ]; then
    echo "   workstamp-api.conf.bak 발견 (이미 비활성화됨)"
fi

if [ -f "/etc/nginx/conf.d/workstamp-admin.conf.bak" ]; then
    echo "   workstamp-admin.conf.bak 발견 (이미 비활성화됨)"
fi

# 기존 workstamp.conf가 있으면 백업
if [ -f "$NGINX_CONF" ] && [ ! -f "${NGINX_CONF}.bak" ]; then
    echo "📋 기존 workstamp.conf를 백업합니다..."
    sudo cp $NGINX_CONF ${NGINX_CONF}.bak
fi

# 파일 권한 재확인 및 수정
echo ""
echo "🔧 정적 파일 권한 재확인 중..."

# nginx 사용자가 파일에 접근할 수 있도록 상위 디렉토리 권한도 확인
if [ -d "${ADMIN_APP_DIR}" ]; then
    # .next 디렉토리까지 접근 가능하도록 설정
    chmod 755 ${ADMIN_APP_DIR} 2>/dev/null || true
    if [ -d "${ADMIN_APP_DIR}/.next" ]; then
        chmod 755 ${ADMIN_APP_DIR}/.next 2>/dev/null || true
    fi
fi

if [ -d "${ADMIN_APP_DIR}/.next/static" ]; then
    # 디렉토리 권한: 755 (모두 읽기/실행 가능)
    find ${ADMIN_APP_DIR}/.next/static -type d -exec chmod 755 {} \; 2>/dev/null || true
    # 파일 권한: 644 (모두 읽기 가능)
    find ${ADMIN_APP_DIR}/.next/static -type f -exec chmod 644 {} \; 2>/dev/null || true
    # 최상위 디렉토리 권한 확인
    chmod 755 ${ADMIN_APP_DIR}/.next/static 2>/dev/null || true
    echo "✅ .next/static 권한 설정 완료"
    
    # nginx 사용자가 읽을 수 있는지 테스트
    if sudo -u nginx test -r ${ADMIN_APP_DIR}/.next/static 2>/dev/null; then
        echo "   ✅ nginx 사용자 접근 가능 확인"
    else
        echo "   ⚠️  nginx 사용자 접근 불가 - SELinux 또는 추가 권한 설정 필요"
    fi
fi

if [ -d "${ADMIN_APP_DIR}/public" ]; then
    # 디렉토리 권한: 755
    find ${ADMIN_APP_DIR}/public -type d -exec chmod 755 {} \; 2>/dev/null || true
    # 파일 권한: 644
    find ${ADMIN_APP_DIR}/public -type f -exec chmod 644 {} \; 2>/dev/null || true
    # 최상위 디렉토리 권한 확인
    chmod 755 ${ADMIN_APP_DIR}/public 2>/dev/null || true
    echo "✅ public 권한 설정 완료"
fi

# Nginx 설정 테스트
echo ""
echo "🧪 Nginx 설정 검증 중..."
if sudo nginx -t 2>&1 | grep -q "test is successful"; then
    echo "✅ Nginx 설정 검증 성공"
    
    # 경고 메시지 확인 (충돌이 있는지)
    if sudo nginx -t 2>&1 | grep -q "conflicting server name"; then
        echo "⚠️  경고: server name 충돌이 감지되었습니다."
        echo "   기존 설정 파일이 완전히 비활성화되지 않았을 수 있습니다."
        echo "   확인: ls -la /etc/nginx/conf.d/*.conf"
    fi
    
    # Nginx 재로드
    echo "🔄 Nginx 재로드 중..."
    sudo systemctl reload nginx
    echo "✅ Nginx 재로드 완료"
    echo ""
    echo "📋 설정 요약:"
    echo "   - 백엔드 API: /api/* → localhost:${API_CURRENT_PORT}"
    echo "   - 프론트엔드: /* → localhost:${ADMIN_CURRENT_PORT}"
    echo "   - 정적 파일: /_next/static/* → 직접 서빙"
else
    echo "❌ Nginx 설정 검증 실패"
    echo "에러 메시지:"
    sudo nginx -t 2>&1
    exit 1
fi

echo ""
echo "✅ 통합 Nginx 설정 완료"
echo ""
echo "📝 활성 설정 파일:"
echo "   - /etc/nginx/conf.d/workstamp.conf (통합 설정)"
echo ""
echo "📝 비활성화된 설정 파일:"
ls -la /etc/nginx/conf.d/*.bak 2>/dev/null | awk '{print "   - " $9}' || echo "   없음"

