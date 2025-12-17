#!/bin/bash

# 정적 파일 문제 해결 스크립트
# 사용법: ./fix-static-files.sh

APP_DIR="${DEPLOY_APP_DIR:-/home/ec2-user/WORKSTAMP_ADMIN}"

echo "🔧 정적 파일 문제 해결 중..."
echo ""

# 1. 디렉토리 확인
echo "1️⃣ 디렉토리 확인:"
echo ".next/static:"
ls -la ${APP_DIR}/.next/static 2>/dev/null | head -5 || echo "  없음"
echo ""
echo "public:"
ls -la ${APP_DIR}/public 2>/dev/null | head -5 || echo "  없음"
echo ""

# 2. BUILD_ID 확인
if [ -f "${APP_DIR}/.next/BUILD_ID" ]; then
    BUILD_ID=$(cat ${APP_DIR}/.next/BUILD_ID)
    echo "2️⃣ BUILD_ID: $BUILD_ID"
    echo "   예상 경로: /_next/static/$BUILD_ID/chunks/..."
    echo ""
    
    # 실제 파일 확인
    if [ -d "${APP_DIR}/.next/static/$BUILD_ID" ]; then
        echo "   ✅ BUILD_ID 디렉토리 존재"
        ls ${APP_DIR}/.next/static/$BUILD_ID | head -3
    else
        echo "   ❌ BUILD_ID 디렉토리 없음"
        echo "   실제 .next/static 구조:"
        ls -la ${APP_DIR}/.next/static/ 2>/dev/null | head -10 || echo "     (디렉토리 없음)"
        echo ""
        echo "   💡 가능한 원인:"
        echo "      1. 빌드가 제대로 전송되지 않았을 수 있습니다"
        echo "      2. BUILD_ID가 변경되었지만 정적 파일은 이전 BUILD_ID로 남아있을 수 있습니다"
        echo "      3. .next/static 디렉토리 구조가 예상과 다를 수 있습니다"
        echo ""
        echo "   🔍 실제 파일 확인:"
        find ${APP_DIR}/.next/static -type f -name "*.js" 2>/dev/null | head -3 || echo "     .js 파일 없음"
        find ${APP_DIR}/.next/static -type d -maxdepth 1 2>/dev/null | tail -5 || echo "     디렉토리 없음"
    fi
else
    echo "2️⃣ BUILD_ID 파일 없음"
fi
echo ""

# 3. 권한 수정
echo "3️⃣ 권한 수정 중..."

# 상위 디렉토리 권한 확인 (nginx 접근을 위해)
if [ -d "${APP_DIR}/.next" ]; then
    chmod 755 ${APP_DIR}/.next 2>/dev/null || true
fi

if [ -d "${APP_DIR}/.next/static" ]; then
    # 디렉토리 권한: 755
    find ${APP_DIR}/.next/static -type d -exec chmod 755 {} \; 2>/dev/null || true
    # 파일 권한: 644
    find ${APP_DIR}/.next/static -type f -exec chmod 644 {} \; 2>/dev/null || true
    # 최상위 디렉토리 권한 확인
    chmod 755 ${APP_DIR}/.next/static 2>/dev/null || true
    echo "✅ .next/static 권한 수정 완료"
    
    # nginx 사용자 접근 테스트
    if sudo -u nginx test -r ${APP_DIR}/.next/static 2>/dev/null; then
        echo "   ✅ nginx 사용자 접근 가능"
    else
        echo "   ⚠️  nginx 사용자 접근 불가 - SELinux 또는 추가 권한 설정 필요"
        echo "   💡 해결 방법: sudo chcon -R -t httpd_sys_content_t ${APP_DIR}/.next/static (SELinux 사용 시)"
    fi
fi

if [ -d "${APP_DIR}/public" ]; then
    # 디렉토리 권한: 755
    find ${APP_DIR}/public -type d -exec chmod 755 {} \; 2>/dev/null || true
    # 파일 권한: 644
    find ${APP_DIR}/public -type f -exec chmod 644 {} \; 2>/dev/null || true
    # 최상위 디렉토리 권한 확인
    chmod 755 ${APP_DIR}/public 2>/dev/null || true
    echo "✅ public 권한 수정 완료"
fi
echo ""

# 4. Nginx 설정 확인
echo "4️⃣ Nginx 설정 확인:"
if [ -f "/etc/nginx/conf.d/workstamp.conf" ]; then
    echo "통합 설정 파일:"
    sudo grep -A 10 "_next/static" /etc/nginx/conf.d/workstamp.conf || echo "  설정 없음"
    
    # nginx 설정 검증
    echo ""
    echo "Nginx 설정 검증:"
    if sudo nginx -t 2>&1 | grep -q "test is successful"; then
        echo "   ✅ Nginx 설정 유효"
    else
        echo "   ❌ Nginx 설정 오류:"
        sudo nginx -t 2>&1 | grep -i error || true
    fi
else
    echo "  workstamp.conf 없음"
fi
echo ""

# 5. 테스트 파일 접근
echo "5️⃣ 정적 파일 접근 테스트:"
if [ -f "${APP_DIR}/.next/BUILD_ID" ]; then
    BUILD_ID=$(cat ${APP_DIR}/.next/BUILD_ID)
    echo "   BUILD_ID: $BUILD_ID"
    
    # BUILD_ID 디렉토리에서 테스트 파일 찾기
    if [ -d "${APP_DIR}/.next/static/$BUILD_ID" ]; then
        TEST_FILE=$(find ${APP_DIR}/.next/static/$BUILD_ID -name "*.js" -type f | head -1)
        if [ -n "$TEST_FILE" ]; then
            # BUILD_ID 이후의 경로만 추출
            RELATIVE_PATH=$(echo $TEST_FILE | sed "s|${APP_DIR}/.next/static/||")
            echo "   테스트 파일: $RELATIVE_PATH"
            echo "   접근 테스트:"
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/_next/static/$RELATIVE_PATH" 2>/dev/null)
            if [ "$HTTP_CODE" = "200" ]; then
                echo "   ✅ HTTP $HTTP_CODE - 정적 파일 접근 성공"
            elif [ "$HTTP_CODE" = "403" ]; then
                echo "   ❌ HTTP $HTTP_CODE - 권한 오류 (403 Forbidden)"
            elif [ "$HTTP_CODE" = "404" ]; then
                echo "   ❌ HTTP $HTTP_CODE - 파일을 찾을 수 없음 (404 Not Found)"
                echo "   💡 확인 사항:"
                echo "      - 파일 존재 여부: ls -la ${APP_DIR}/.next/static/$RELATIVE_PATH"
                echo "      - nginx alias 경로: ${ADMIN_APP_DIR}/.next/static/"
                echo "      - 실제 파일 경로와 nginx 설정이 일치하는지 확인"
            else
                echo "   ⚠️  HTTP $HTTP_CODE - 예상치 못한 응답"
            fi
        else
            echo "   ⚠️  테스트할 .js 파일을 찾을 수 없습니다."
        fi
    else
        echo "   ❌ BUILD_ID 디렉토리를 찾을 수 없습니다: ${APP_DIR}/.next/static/$BUILD_ID"
        echo ""
        echo "   🔧 해결 방법:"
        echo "      1. 로컬에서 다시 빌드하고 배포:"
        echo "         npm run build"
        echo "         ./deploy.sh"
        echo ""
        echo "      2. 또는 서버에서 직접 확인:"
        echo "         ls -la ${APP_DIR}/.next/static/"
        echo "         cat ${APP_DIR}/.next/BUILD_ID"
        echo ""
        echo "      3. BUILD_ID와 실제 디렉토리가 불일치하는 경우,"
        echo "         정적 파일을 다시 전송하거나 Next.js 서버가 직접 서빙하도록 설정"
    fi
else
    echo "   ⚠️  BUILD_ID 파일이 없어 테스트를 건너뜁니다."
fi
echo ""

echo "✅ 진단 완료"

