#!/bin/bash

# 정적 파일 권한 수정 스크립트
# 사용법: ./fix-permissions.sh

APP_DIR="${DEPLOY_APP_DIR:-/home/ec2-user/WORKSTAMP_ADMIN}"

echo "🔧 정적 파일 권한 수정 중..."

# .next/static 디렉토리 권한 설정
if [ -d "${APP_DIR}/.next/static" ]; then
    echo "📁 .next/static 권한 설정 중..."
    chmod -R 755 ${APP_DIR}/.next/static
    find ${APP_DIR}/.next/static -type f -exec chmod 644 {} \;
    find ${APP_DIR}/.next/static -type d -exec chmod 755 {} \;
    echo "✅ .next/static 권한 설정 완료"
else
    echo "⚠️  .next/static 디렉토리를 찾을 수 없습니다."
fi

# public 디렉토리 권한 설정
if [ -d "${APP_DIR}/public" ]; then
    echo "📁 public 권한 설정 중..."
    chmod -R 755 ${APP_DIR}/public
    find ${APP_DIR}/public -type f -exec chmod 644 {} \;
    find ${APP_DIR}/public -type d -exec chmod 755 {} \;
    echo "✅ public 권한 설정 완료"
else
    echo "⚠️  public 디렉토리를 찾을 수 없습니다."
fi

# Nginx 사용자가 읽을 수 있도록 그룹 권한 확인
echo ""
echo "📋 현재 권한 확인:"
ls -ld ${APP_DIR}/.next/static 2>/dev/null || echo "  .next/static 없음"
ls -ld ${APP_DIR}/public 2>/dev/null || echo "  public 없음"

echo ""
echo "✅ 권한 수정 완료"

