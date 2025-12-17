#!/bin/bash

# Nginx server name 충돌 해결 스크립트
# 사용법: ./fix-nginx-conflict.sh

echo "🔧 Nginx 설정 충돌 해결 중..."

# 모든 활성 설정 파일 확인
echo "📋 현재 활성 Nginx 설정 파일:"
ls -la /etc/nginx/conf.d/*.conf 2>/dev/null | grep -v ".bak$" || echo "   없음"
echo ""

# 포트 80을 사용하는 server 블록 확인
echo "🔍 포트 80을 사용하는 server 블록 확인:"
sudo grep -r "listen 80" /etc/nginx/conf.d/*.conf 2>/dev/null | grep -v ".bak" || echo "   없음"
echo ""

# workstamp-api.conf 비활성화
if [ -f "/etc/nginx/conf.d/workstamp-api.conf" ]; then
    echo "⚠️  workstamp-api.conf를 비활성화합니다..."
    sudo mv /etc/nginx/conf.d/workstamp-api.conf /etc/nginx/conf.d/workstamp-api.conf.bak
    echo "✅ 비활성화 완료"
fi

# workstamp-admin.conf 비활성화
if [ -f "/etc/nginx/conf.d/workstamp-admin.conf" ]; then
    echo "⚠️  workstamp-admin.conf를 비활성화합니다..."
    sudo mv /etc/nginx/conf.d/workstamp-admin.conf /etc/nginx/conf.d/workstamp-admin.conf.bak
    echo "✅ 비활성화 완료"
fi

# workstamp.conf가 있는지 확인
if [ ! -f "/etc/nginx/conf.d/workstamp.conf" ]; then
    echo "❌ workstamp.conf가 없습니다."
    echo "   통합 Nginx 설정을 먼저 실행하세요:"
    echo "   cd /home/ec2-user/WORKSTAMP_ADMIN && ./setup-nginx-combined.sh"
    exit 1
fi

# Nginx 설정 테스트
echo ""
echo "🧪 Nginx 설정 검증 중..."
if sudo nginx -t; then
    echo "✅ Nginx 설정 검증 성공"
    
    # 경고 확인
    WARNINGS=$(sudo nginx -t 2>&1 | grep -i "warn" || true)
    if [ -n "$WARNINGS" ]; then
        echo "⚠️  경고 메시지:"
        echo "$WARNINGS"
    else
        echo "✅ 경고 없음"
    fi
    
    # Nginx 재로드
    echo ""
    echo "🔄 Nginx 재로드 중..."
    sudo systemctl reload nginx
    echo "✅ Nginx 재로드 완료"
else
    echo "❌ Nginx 설정 검증 실패"
    sudo nginx -t
    exit 1
fi

echo ""
echo "✅ 충돌 해결 완료!"

