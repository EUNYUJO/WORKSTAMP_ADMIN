#!/bin/bash

# 프론트엔드 무중단 배포 스크립트
# 사용법: ./deploy.sh

set -e

# .env 파일 로드
if [ ! -f ".env" ]; then
  echo "❌ .env 파일을 찾을 수 없습니다."
  echo "   .env.example을 참고하여 .env 파일을 생성해주세요."
  exit 1
fi

# .env 파일에서 환경 변수 로드
set -a
source .env
set +a

# 필수 환경 변수 확인
if [ -z "$DEPLOY_SERVER_USER" ] || [ -z "$DEPLOY_SERVER_HOST" ] || [ -z "$DEPLOY_SSH_KEY" ] || [ -z "$DEPLOY_APP_DIR" ]; then
  echo "❌ .env 파일에 필수 배포 설정이 없습니다."
  echo "   다음 변수들이 필요합니다:"
  echo "   - DEPLOY_SERVER_USER"
  echo "   - DEPLOY_SERVER_HOST"
  echo "   - DEPLOY_SSH_KEY"
  echo "   - DEPLOY_APP_DIR"
  exit 1
fi

# 환경 변수 설정
SERVER_USER="${DEPLOY_SERVER_USER}"
SERVER_HOST="${DEPLOY_SERVER_HOST}"
SSH_KEY="${DEPLOY_SSH_KEY}"
APP_NAME="${DEPLOY_APP_NAME:-workstamp-admin}"
APP_DIR="${DEPLOY_APP_DIR}"

echo "🚀 프론트엔드 배포를 시작합니다..."

# 1. 빌드
echo "📦 Next.js 애플리케이션 빌드 중..."
npm install
npm run build

# 2. .next 디렉토리 확인
if [ ! -d ".next" ]; then
    echo "❌ 빌드 실패: .next 디렉토리를 찾을 수 없습니다."
    exit 1
fi

# 2-1. standalone 빌드 확인
if [ ! -d ".next/standalone" ]; then
    echo "⚠️  경고: standalone 빌드가 생성되지 않았습니다."
    echo "   next.config.js에 output: 'standalone'이 설정되어 있는지 확인하세요."
    echo "   일반 빌드로 진행합니다 (서버에서 npm install 필요)."
else
    echo "✅ Standalone 빌드 확인 완료"
fi

echo "✅ 빌드 완료"

# 3. 서버에 디렉토리 생성
echo "📁 서버 디렉토리 생성 중..."
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${APP_DIR}"

# 4. 파일 전송 (.next, public, package.json, node_modules 제외하고 필요한 파일만)
echo "📤 파일 전송 중..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '*.log' \
  -e "ssh -i ${SSH_KEY}" \
  ./ ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/

# 5. standalone 빌드 전송 (전체 구조 포함)
if [ -d ".next/standalone" ]; then
    echo "📤 Standalone 빌드 전송 중..."
    rsync -avz --delete \
      -e "ssh -i ${SSH_KEY}" \
      .next/standalone/ ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/.next/standalone/
    
    # .next/static 폴더 전송 (정적 파일)
    echo "📤 정적 파일(.next/static) 전송 중..."
    rsync -avz --delete \
      -e "ssh -i ${SSH_KEY}" \
      .next/static/ ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/.next/static/
    
    # public 폴더 전송
    echo "📤 public 디렉토리 전송 중..."
    rsync -avz --delete \
      -e "ssh -i ${SSH_KEY}" \
      public/ ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/public/
    
    # 서버에서 정적 파일 확인 및 권한 설정
    echo "🔗 정적 파일 확인 및 권한 설정 중..."
    ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << EOF
        cd ${APP_DIR}
        
        # 상위 디렉토리 권한 확인 (nginx 접근을 위해)
        if [ -d ".next" ]; then
            chmod 755 .next 2>/dev/null || true
        fi
        
        # .next/static 디렉토리 확인 및 권한 설정
        echo "📁 .next/static 확인 중..."
        if [ -d ".next/static" ]; then
            echo "   디렉토리 존재 확인"
            ls -la .next/static | head -5
            # 디렉토리 권한: 755
            find .next/static -type d -exec chmod 755 {} \; 2>/dev/null || true
            # 파일 권한: 644
            find .next/static -type f -exec chmod 644 {} \; 2>/dev/null || true
            # 최상위 디렉토리 권한 확인
            chmod 755 .next/static 2>/dev/null || true
            echo "✅ .next/static 권한 설정 완료"
        else
            echo "❌ .next/static 디렉토리를 찾을 수 없습니다!"
            echo "   전체 .next 디렉토리 구조:"
            ls -la .next/ 2>/dev/null | head -10 || echo "   .next 디렉토리 없음"
        fi
        
        # public 디렉토리 확인 및 권한 설정
        echo "📁 public 확인 중..."
        if [ -d "public" ]; then
            # 디렉토리 권한: 755
            find public -type d -exec chmod 755 {} \; 2>/dev/null || true
            # 파일 권한: 644
            find public -type f -exec chmod 644 {} \; 2>/dev/null || true
            # 최상위 디렉토리 권한 확인
            chmod 755 public 2>/dev/null || true
            echo "✅ public 권한 설정 완료"
        else
            echo "❌ public 디렉토리를 찾을 수 없습니다!"
        fi
        
        # BUILD_ID 확인 (Next.js 정적 파일 경로에 필요)
        if [ -f ".next/BUILD_ID" ]; then
            BUILD_ID=\$(cat .next/BUILD_ID)
            echo "📋 BUILD_ID: \$BUILD_ID"
            echo "   정적 파일 경로 예시: /_next/static/\$BUILD_ID/chunks/..."
            
            # BUILD_ID 디렉토리 존재 확인
            if [ -d ".next/static/\$BUILD_ID" ]; then
                echo "   ✅ BUILD_ID 디렉토리 확인됨"
                ls .next/static/\$BUILD_ID | head -3
            else
                echo "   ⚠️  경고: BUILD_ID 디렉토리를 찾을 수 없습니다!"
                echo "   실제 .next/static 구조:"
                ls -la .next/static/ 2>/dev/null | head -5 || echo "     (디렉토리 없음)"
                echo "   💡 정적 파일이 제대로 전송되지 않았을 수 있습니다."
            fi
        fi
        
        # .next/standalone/WORKSTAMP_ADMIN 내부에서 심볼릭 링크 생성
        if [ -d ".next/standalone/WORKSTAMP_ADMIN" ]; then
            cd .next/standalone/WORKSTAMP_ADMIN
            # .next 디렉토리 생성
            if [ ! -d ".next" ]; then
                mkdir -p .next
            fi
            # .next/static 심볼릭 링크 생성 (절대 경로 사용)
            if [ ! -e ".next/static" ]; then
                rm -f .next/static
                ln -sf ${APP_DIR}/.next/static .next/static
                echo "✅ .next/static 심볼릭 링크 생성 완료"
            fi
            # public 심볼릭 링크 생성 (절대 경로 사용)
            if [ ! -e "public" ]; then
                rm -f public
                ln -sf ${APP_DIR}/public public
                echo "✅ public 심볼릭 링크 생성 완료"
            fi
            # 심볼릭 링크 확인
            echo "📋 심볼릭 링크 확인:"
            ls -la .next/static 2>/dev/null | head -3 || echo "  .next/static: 없음"
            ls -la public 2>/dev/null | head -3 || echo "  public: 없음"
        fi
EOF
else
    # 일반 빌드인 경우
    echo "📤 빌드 결과(.next) 전송 중..."
    rsync -avz --delete \
      -e "ssh -i ${SSH_KEY}" \
      .next/ ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/.next/
    
    echo "📤 public 디렉토리 전송 중..."
    rsync -avz --delete \
      -e "ssh -i ${SSH_KEY}" \
      public/ ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/public/
fi

# 7. .env 파일 전송 (서버에 이미 있으면 스킵)
echo "📤 환경 변수 파일 확인 중..."
if [ -f ".env.production" ]; then
  scp -i ${SSH_KEY} .env.production ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/.env
  echo "✅ .env.production 파일 전송 완료"
else
  echo "⚠️  .env.production 파일이 없습니다. 서버의 기존 .env 파일을 사용합니다."
fi

# 8. 실행 스크립트 전송
echo "📤 실행 스크립트 전송 중..."
scp -i ${SSH_KEY} scripts/run.sh ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/

# 9. Nginx 스크립트 전송
if [ -f "scripts/update-nginx-upstream.sh" ]; then
    echo "📤 Nginx 업스트림 업데이트 스크립트 전송 중..."
    ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "sudo rm -f ${APP_DIR}/update-nginx-upstream.sh 2>/dev/null || true"
    scp -i ${SSH_KEY} scripts/update-nginx-upstream.sh ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/
fi

if [ -f "scripts/setup-nginx-combined.sh" ]; then
    echo "📤 통합 Nginx 설정 스크립트 전송 중..."
    scp -i ${SSH_KEY} scripts/setup-nginx-combined.sh ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/
    ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "chmod +x ${APP_DIR}/setup-nginx-combined.sh"
fi

if [ -f "scripts/fix-static-files.sh" ]; then
    echo "📤 정적 파일 진단 스크립트 전송 중..."
    scp -i ${SSH_KEY} scripts/fix-static-files.sh ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/scripts/
    ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "chmod +x ${APP_DIR}/scripts/fix-static-files.sh"
fi

# 10. 실행 권한 부여
echo "🔐 실행 권한 부여 중..."
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "chmod +x ${APP_DIR}/run.sh"
if [ -f "scripts/update-nginx-upstream.sh" ]; then
    ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "chmod +x ${APP_DIR}/update-nginx-upstream.sh"
fi

# 11. 파일 권한 수정 (403 에러 방지)
echo "🔧 정적 파일 권한 수정 중..."
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << EOF
    cd ${APP_DIR}
    
    # 상위 디렉토리 권한 확인 (nginx 접근을 위해)
    if [ -d ".next" ]; then
        chmod 755 .next 2>/dev/null || true
    fi
    
    # .next/static 디렉토리 권한 설정
    if [ -d ".next/static" ]; then
        # 디렉토리 권한: 755
        find .next/static -type d -exec chmod 755 {} \; 2>/dev/null || true
        # 파일 권한: 644
        find .next/static -type f -exec chmod 644 {} \; 2>/dev/null || true
        # 최상위 디렉토리 권한 확인
        chmod 755 .next/static 2>/dev/null || true
        echo "✅ .next/static 권한 설정 완료"
    fi
    
    # public 디렉토리 권한 설정
    if [ -d "public" ]; then
        # 디렉토리 권한: 755
        find public -type d -exec chmod 755 {} \; 2>/dev/null || true
        # 파일 권한: 644
        find public -type f -exec chmod 644 {} \; 2>/dev/null || true
        # 최상위 디렉토리 권한 확인
        chmod 755 public 2>/dev/null || true
        echo "✅ public 권한 설정 완료"
    fi
EOF

# 12. 통합 Nginx 설정 (백엔드와 함께 사용하는 경우)
if [ -f "scripts/setup-nginx-combined.sh" ]; then
    echo "🔧 통합 Nginx 설정 적용 중..."
    ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << EOF
        cd ${APP_DIR}
        if [ -f "./setup-nginx-combined.sh" ]; then
            export DEPLOY_APP_DIR=${APP_DIR}
            export API_APP_DIR=\${API_APP_DIR:-/home/ec2-user/WORKSTAMP_API}
            bash ./setup-nginx-combined.sh
        else
            echo "⚠️  setup-nginx-combined.sh를 찾을 수 없습니다."
        fi
EOF
fi

# 13. 무중단 배포 (블루-그린)
echo "🔄 무중단 배포 시작..."
echo "📊 현재 상태 확인 중..."
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "cd ${APP_DIR} && DEPLOY_APP_NAME=${APP_NAME} DEPLOY_APP_DIR=${APP_DIR} ./run.sh status"

echo "🚀 새 인스턴스 시작 중 (반대 포트로)..."
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "cd ${APP_DIR} && DEPLOY_APP_NAME=${APP_NAME} DEPLOY_APP_DIR=${APP_DIR} ./run.sh start"

echo "⏳ Health Check 대기 중 (약 30초)..."
sleep 30

echo "🔄 블루-그린 전환 중..."
if ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "cd ${APP_DIR} && DEPLOY_APP_NAME=${APP_NAME} DEPLOY_APP_DIR=${APP_DIR} ./run.sh switch"; then
    echo "✅ 무중단 배포 완료!"
    echo "📊 최종 상태:"
    ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "cd ${APP_DIR} && DEPLOY_APP_NAME=${APP_NAME} DEPLOY_APP_DIR=${APP_DIR} ./run.sh status"
    
    # 통합 Nginx 설정 업데이트 (포트 변경 반영)
    if [ -f "scripts/setup-nginx-combined.sh" ]; then
        echo "🔄 통합 Nginx 설정 업데이트 중 (포트 변경 반영)..."
        ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << EOF
            cd ${APP_DIR}
            export DEPLOY_APP_DIR=${APP_DIR}
            export API_APP_DIR=\${API_APP_DIR:-/home/ec2-user/WORKSTAMP_API}
            bash ./setup-nginx-combined.sh
EOF
    fi
    
    # 파일 권한 최종 확인 및 정적 파일 진단
    echo "🔧 파일 권한 최종 확인 및 정적 파일 진단 중..."
    ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << EOF
        cd ${APP_DIR}
        
        # 상위 디렉토리 권한 확인 (nginx 접근을 위해)
        if [ -d ".next" ]; then
            chmod 755 .next 2>/dev/null || true
        fi
        
        # 권한 수정
        if [ -d ".next/static" ]; then
            # 디렉토리 권한: 755
            find .next/static -type d -exec chmod 755 {} \; 2>/dev/null || true
            # 파일 권한: 644
            find .next/static -type f -exec chmod 644 {} \; 2>/dev/null || true
            # 최상위 디렉토리 권한 확인
            chmod 755 .next/static 2>/dev/null || true
            echo "✅ .next/static 권한 수정 완료"
        fi
        if [ -d "public" ]; then
            # 디렉토리 권한: 755
            find public -type d -exec chmod 755 {} \; 2>/dev/null || true
            # 파일 권한: 644
            find public -type f -exec chmod 644 {} \; 2>/dev/null || true
            # 최상위 디렉토리 권한 확인
            chmod 755 public 2>/dev/null || true
            echo "✅ public 권한 수정 완료"
        fi
        
        # 정적 파일 진단
        if [ -f "./scripts/fix-static-files.sh" ]; then
            bash ./scripts/fix-static-files.sh
        fi
        
        # Nginx 재로드
        echo "🔄 Nginx 재로드 중..."
        sudo nginx -t && sudo systemctl reload nginx
        echo "✅ Nginx 재로드 완료"
EOF
else
    echo "❌ 전환 실패. 기존 인스턴스가 계속 실행됩니다."
    echo "📊 현재 상태:"
    ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "cd ${APP_DIR} && DEPLOY_APP_NAME=${APP_NAME} DEPLOY_APP_DIR=${APP_DIR} ./run.sh status"
    exit 1
fi

echo "🌐 서버 주소:"
echo "   - Nginx를 통한 접속 (권장): http://${SERVER_HOST}"
echo "   - 직접 포트 접속: http://${SERVER_HOST}:3000 또는 http://${SERVER_HOST}:3001"
echo ""
echo "✅ 배포 완료!"

