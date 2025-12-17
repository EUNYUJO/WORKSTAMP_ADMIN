#!/bin/bash

# Next.js 서버 실행 스크립트 (블루-그린 배포 지원)
# 사용법: ./run.sh [start|stop|restart|status|start-blue|start-green|switch]

# PM2가 설치되어 있는지 확인
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2가 설치되어 있지 않습니다."
    echo "   다음 명령어로 설치하세요: npm install -g pm2"
    exit 1
fi

# 환경 변수에서 가져오거나 기본값 사용
APP_NAME="${DEPLOY_APP_NAME:-workstamp-admin}"
APP_DIR="${DEPLOY_APP_DIR:-/home/ec2-user/WORKSTAMP_ADMIN}"
BLUE_APP_NAME="${APP_NAME}-blue"
GREEN_APP_NAME="${APP_NAME}-green"
CURRENT_PORT_FILE="${APP_DIR}/current-port.txt"

# 기본 포트 설정
BLUE_PORT=3000
GREEN_PORT=3001

# Health Check 함수
check_health() {
    local port=$1
    local max_attempts=30
    local attempt=0
    
    echo "🏥 Health Check 시작 (포트: $port)..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "http://localhost:${port}/api/health" > /dev/null 2>&1; then
            echo "✅ Health Check 성공 (포트: $port)"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "   시도 $attempt/$max_attempts..."
        sleep 2
    done
    
    echo "❌ Health Check 실패 (포트: $port)"
    return 1
}

# 특정 포트로 애플리케이션 시작
start_on_port() {
    local port=$1
    local app_name=$2
    local color=$3
    
    # 이미 실행 중인지 확인
    if pm2 describe ${app_name} > /dev/null 2>&1; then
        echo "⚠️  ${color} 인스턴스가 이미 실행 중입니다."
        return 1
    fi
    
    # 포트 사용 중인지 확인
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ 포트 $port가 이미 사용 중입니다."
        return 1
    fi
    
    echo "🚀 ${color} 인스턴스 시작 중... (포트: $port)"
    
    cd ${APP_DIR}
    
    # Node.js가 설치되어 있는지 확인
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js가 설치되어 있지 않습니다."
        echo "   다음 명령어로 설치하세요:"
        echo "   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -"
        echo "   sudo yum install -y nodejs"
        return 1
    fi
    
    # PM2로 앱 시작
    # standalone 빌드 확인 (Next.js는 프로젝트 이름으로 폴더를 만듦)
    echo "🔍 Standalone 빌드 확인 중..."
    
    # 여러 가능한 경로 확인
    STANDALONE_SERVER=""
    if [ -f "${APP_DIR}/.next/standalone/WORKSTAMP_ADMIN/server.js" ]; then
        STANDALONE_SERVER="${APP_DIR}/.next/standalone/WORKSTAMP_ADMIN/server.js"
    elif [ -f "${APP_DIR}/.next/standalone/server.js" ]; then
        STANDALONE_SERVER="${APP_DIR}/.next/standalone/server.js"
    elif [ -d "${APP_DIR}/.next/standalone" ]; then
        # standalone 폴더 내에서 server.js 찾기
        STANDALONE_SERVER=$(find ${APP_DIR}/.next/standalone -name "server.js" -type f | head -1)
    fi
    
    if [ -n "$STANDALONE_SERVER" ] && [ -f "$STANDALONE_SERVER" ]; then
        # standalone 빌드 사용
        echo "✅ Standalone 빌드 발견: $STANDALONE_SERVER"
        STANDALONE_DIR=$(dirname "$STANDALONE_SERVER")
        
        # 심볼릭 링크 확인 및 복구
        cd "$STANDALONE_DIR"
        
        # .next 디렉토리 생성
        if [ ! -d ".next" ]; then
            mkdir -p .next
        fi
        
        # .next/static 심볼릭 링크 확인 및 생성 (절대 경로 사용)
        if [ ! -e ".next/static" ] && [ -d "${APP_DIR}/.next/static" ]; then
            echo "🔗 .next/static 심볼릭 링크 생성 중..."
            rm -f .next/static
            ln -sf ${APP_DIR}/.next/static .next/static
            echo "   링크: .next/static -> ${APP_DIR}/.next/static"
        fi
        
        # public 심볼릭 링크 확인 및 생성 (절대 경로 사용)
        if [ ! -e "public" ] && [ -d "${APP_DIR}/public" ]; then
            echo "🔗 public 심볼릭 링크 생성 중..."
            rm -f public
            ln -sf ${APP_DIR}/public public
            echo "   링크: public -> ${APP_DIR}/public"
        fi
        
        # 심볼릭 링크 확인
        if [ -L ".next/static" ]; then
            echo "✅ .next/static 심볼릭 링크 확인됨"
        else
            echo "⚠️  .next/static 심볼릭 링크가 없습니다."
        fi
        
        if [ -L "public" ]; then
            echo "✅ public 심볼릭 링크 확인됨"
        else
            echo "⚠️  public 심볼릭 링크가 없습니다."
        fi
        
        PORT=${port} NODE_ENV=production pm2 start node --name ${app_name} -- server.js
        cd ${APP_DIR}
    else
        # 일반 빌드 사용 (npm start 필요)
        echo "⚠️  Standalone 빌드를 찾을 수 없습니다. npm start 사용"
        echo "   확인된 경로:"
        echo "   - ${APP_DIR}/.next/standalone/WORKSTAMP_ADMIN/server.js: $([ -f "${APP_DIR}/.next/standalone/WORKSTAMP_ADMIN/server.js" ] && echo '존재' || echo '없음')"
        echo "   - ${APP_DIR}/.next/standalone/server.js: $([ -f "${APP_DIR}/.next/standalone/server.js" ] && echo '존재' || echo '없음')"
        cd ${APP_DIR}
        PORT=${port} NODE_ENV=production pm2 start npm --name ${app_name} -- start
    fi
    
    # Health Check 대기
    sleep 5
    if check_health $port; then
        echo "✅ ${color} 인스턴스가 시작되었습니다. 포트: $port"
        echo "📋 로그 확인: pm2 logs ${app_name}"
        return 0
    else
        echo "❌ ${color} 인스턴스 시작 실패"
        pm2 delete ${app_name} 2>/dev/null || true
        return 1
    fi
}

start_blue() {
    start_on_port $BLUE_PORT $BLUE_APP_NAME "BLUE"
}

start_green() {
    start_on_port $GREEN_PORT $GREEN_APP_NAME "GREEN"
}

# 기존 프로세스를 감지하고 마이그레이션
migrate_existing_process() {
    # 포트 3000을 사용하는 프로세스 찾기
    local pid_3000=$(lsof -ti :$BLUE_PORT 2>/dev/null | head -1)
    local pid_3001=$(lsof -ti :$GREEN_PORT 2>/dev/null | head -1)
    
    if [ -n "$pid_3000" ] && ! pm2 describe ${BLUE_APP_NAME} > /dev/null 2>&1; then
        echo "⚠️  포트 $BLUE_PORT를 사용하는 기존 프로세스 발견 (PID: $pid_3000)"
        echo "   PM2로 마이그레이션하세요."
        return 0
    fi
    
    if [ -n "$pid_3001" ] && ! pm2 describe ${GREEN_APP_NAME} > /dev/null 2>&1; then
        echo "⚠️  포트 $GREEN_PORT를 사용하는 기존 프로세스 발견 (PID: $pid_3001)"
        echo "   PM2로 마이그레이션하세요."
        return 0
    fi
    
    return 1
}

start() {
    # 기존 프로세스 마이그레이션 시도
    migrate_existing_process
    
    # PM2 프로세스 상태 확인 (우선순위 1)
    local blue_running=false
    local green_running=false
    
    if pm2 describe ${BLUE_APP_NAME} > /dev/null 2>&1; then
        local blue_status=$(pm2 jlist 2>/dev/null | grep -o "\"name\":\"${BLUE_APP_NAME}\"[^}]*\"status\":\"[^\"]*\"" | grep -o "\"status\":\"[^\"]*\"" | cut -d'"' -f4)
        if [ "$blue_status" = "online" ]; then
            blue_running=true
        fi
    fi
    
    if pm2 describe ${GREEN_APP_NAME} > /dev/null 2>&1; then
        local green_status=$(pm2 jlist 2>/dev/null | grep -o "\"name\":\"${GREEN_APP_NAME}\"[^}]*\"status\":\"[^\"]*\"" | grep -o "\"status\":\"[^\"]*\"" | cut -d'"' -f4)
        if [ "$green_status" = "online" ]; then
            green_running=true
        fi
    fi
    
    # 현재 실행 중인 포트 확인
    if [ "$blue_running" = true ] && [ "$green_running" = false ]; then
        # BLUE만 실행 중 -> GREEN 시작
        echo "현재 BLUE($BLUE_PORT)가 실행 중입니다. GREEN($GREEN_PORT)을 시작합니다."
        echo $BLUE_PORT > $CURRENT_PORT_FILE
        start_green
    elif [ "$green_running" = true ] && [ "$blue_running" = false ]; then
        # GREEN만 실행 중 -> BLUE 시작
        echo "현재 GREEN($GREEN_PORT)가 실행 중입니다. BLUE($BLUE_PORT)를 시작합니다."
        echo $GREEN_PORT > $CURRENT_PORT_FILE
        start_blue
    elif [ "$blue_running" = true ] && [ "$green_running" = true ]; then
        # 둘 다 실행 중 -> current-port.txt 확인
        if [ -f "$CURRENT_PORT_FILE" ]; then
            local current_port=$(cat $CURRENT_PORT_FILE)
            if [ "$current_port" = "$BLUE_PORT" ]; then
                echo "현재 BLUE($BLUE_PORT)가 활성입니다. GREEN($GREEN_PORT)을 시작합니다."
                start_green
            else
                echo "현재 GREEN($GREEN_PORT)가 활성입니다. BLUE($BLUE_PORT)를 시작합니다."
                start_blue
            fi
        else
            # 둘 다 실행 중인데 포트 파일이 없으면 BLUE를 활성으로 간주
            echo "⚠️  BLUE와 GREEN이 모두 실행 중입니다. BLUE를 활성으로 간주하고 GREEN을 시작합니다."
            echo $BLUE_PORT > $CURRENT_PORT_FILE
            start_green
        fi
    else
        # 둘 다 실행 중이 아님 -> 포트 파일 또는 포트 사용 확인
        if [ -f "$CURRENT_PORT_FILE" ]; then
            local current_port=$(cat $CURRENT_PORT_FILE)
            if [ "$current_port" = "$BLUE_PORT" ]; then
                echo "포트 파일에 따르면 BLUE($BLUE_PORT)가 활성입니다. GREEN($GREEN_PORT)을 시작합니다."
                start_green
            else
                echo "포트 파일에 따르면 GREEN($GREEN_PORT)가 활성입니다. BLUE($BLUE_PORT)를 시작합니다."
                start_blue
            fi
        else
            # 포트를 사용하는 기존 프로세스가 있는지 확인
            local pid_3000=$(lsof -ti :$BLUE_PORT 2>/dev/null | head -1)
            local pid_3001=$(lsof -ti :$GREEN_PORT 2>/dev/null | head -1)
            
            if [ -n "$pid_3000" ]; then
                echo "⚠️  포트 $BLUE_PORT가 이미 사용 중입니다."
                echo $BLUE_PORT > $CURRENT_PORT_FILE
                echo "현재 BLUE($BLUE_PORT)가 실행 중입니다. GREEN($GREEN_PORT)을 시작합니다."
                start_green
            elif [ -n "$pid_3001" ]; then
                echo "⚠️  포트 $GREEN_PORT가 이미 사용 중입니다."
                echo $GREEN_PORT > $CURRENT_PORT_FILE
                echo "현재 GREEN($GREEN_PORT)가 실행 중입니다. BLUE($BLUE_PORT)를 시작합니다."
                start_blue
            else
                # 처음 시작하는 경우 BLUE로 시작
                echo "처음 시작합니다. BLUE($BLUE_PORT)를 시작합니다."
                start_blue && echo $BLUE_PORT > $CURRENT_PORT_FILE
            fi
        fi
    fi
}

stop() {
    local stopped=false
    
    # BLUE 종료
    if pm2 describe ${BLUE_APP_NAME} > /dev/null 2>&1; then
        echo "🛑 BLUE 인스턴스 종료 중..."
        pm2 delete ${BLUE_APP_NAME}
        stopped=true
    fi
    
    # GREEN 종료
    if pm2 describe ${GREEN_APP_NAME} > /dev/null 2>&1; then
        echo "🛑 GREEN 인스턴스 종료 중..."
        pm2 delete ${GREEN_APP_NAME}
        stopped=true
    fi
    
    if [ "$stopped" = true ]; then
        rm -f $CURRENT_PORT_FILE
        echo "✅ 모든 인스턴스가 종료되었습니다."
    else
        echo "⚠️  실행 중인 인스턴스가 없습니다."
    fi
}

stop_blue() {
    if pm2 describe ${BLUE_APP_NAME} > /dev/null 2>&1; then
        echo "🛑 BLUE 인스턴스 종료 중..."
        pm2 delete ${BLUE_APP_NAME}
        echo "✅ BLUE 인스턴스가 종료되었습니다."
    fi
}

stop_green() {
    if pm2 describe ${GREEN_APP_NAME} > /dev/null 2>&1; then
        echo "🛑 GREEN 인스턴스 종료 중..."
        pm2 delete ${GREEN_APP_NAME}
        echo "✅ GREEN 인스턴스가 종료되었습니다."
    fi
}

restart() {
    echo "🔄 애플리케이션 재시작 중..."
    stop
    sleep 2
    start
}

switch() {
    echo "🔄 블루-그린 전환 시작..."
    
    if [ ! -f "$CURRENT_PORT_FILE" ]; then
        echo "❌ 현재 실행 중인 인스턴스를 찾을 수 없습니다."
        return 1
    fi
    
    local current_port=$(cat $CURRENT_PORT_FILE)
    local new_port
    local new_app_name
    local old_app_name
    
    if [ "$current_port" = "$BLUE_PORT" ]; then
        new_port=$GREEN_PORT
        new_app_name=$GREEN_APP_NAME
        old_app_name=$BLUE_APP_NAME
        echo "BLUE($BLUE_PORT) → GREEN($GREEN_PORT) 전환"
    else
        new_port=$BLUE_PORT
        new_app_name=$BLUE_APP_NAME
        old_app_name=$GREEN_APP_NAME
        echo "GREEN($GREEN_PORT) → BLUE($BLUE_PORT) 전환"
    fi
    
    # 새 인스턴스가 실행 중인지 확인
    if ! pm2 describe ${new_app_name} > /dev/null 2>&1; then
        echo "❌ 새 인스턴스($new_port)가 실행 중이지 않습니다. 먼저 start를 실행하세요."
        return 1
    fi
    
    # Health Check
    if ! check_health $new_port; then
        echo "❌ 새 인스턴스($new_port)의 Health Check 실패. 전환을 취소합니다."
        return 1
    fi
    
    # 기존 인스턴스 종료
    if pm2 describe ${old_app_name} > /dev/null 2>&1; then
        echo "🛑 기존 인스턴스($current_port) 종료 중..."
        pm2 delete ${old_app_name}
    fi
    
    # 현재 포트 업데이트
    echo $new_port > $CURRENT_PORT_FILE
    
    # Nginx 업스트림 설정 업데이트 (nginx가 설치되어 있는 경우)
    if command -v nginx > /dev/null 2>&1; then
        if [ -f "${APP_DIR}/update-nginx-upstream.sh" ]; then
            echo "🔄 Nginx 설정 업데이트 중..."
            DEPLOY_APP_DIR="${APP_DIR}" bash "${APP_DIR}/update-nginx-upstream.sh"
        else
            echo "⚠️  경고: update-nginx-upstream.sh 스크립트를 찾을 수 없습니다."
            echo "   Nginx 설정을 수동으로 업데이트해주세요."
        fi
    else
        echo "⚠️  경고: Nginx가 설치되어 있지 않습니다."
        echo "   블루-그린 배포를 사용하려면 Nginx를 설치하고 설정해주세요."
    fi
    
    echo "✅ 전환 완료! 현재 포트: $new_port"
}

status() {
    echo "📊 인스턴스 상태:"
    echo ""
    
    local blue_running=false
    local green_running=false
    
    if pm2 describe ${BLUE_APP_NAME} > /dev/null 2>&1; then
        local status=$(pm2 jlist | jq -r ".[] | select(.name==\"${BLUE_APP_NAME}\") | .pm2_env.status")
        if [ "$status" = "online" ]; then
            echo "✅ BLUE: 실행 중 (포트: $BLUE_PORT)"
            blue_running=true
        else
            echo "⚠️  BLUE: 상태: $status"
        fi
    else
        echo "❌ BLUE: 실행 중이지 않음"
    fi
    
    if pm2 describe ${GREEN_APP_NAME} > /dev/null 2>&1; then
        local status=$(pm2 jlist | jq -r ".[] | select(.name==\"${GREEN_APP_NAME}\") | .pm2_env.status")
        if [ "$status" = "online" ]; then
            echo "✅ GREEN: 실행 중 (포트: $GREEN_PORT)"
            green_running=true
        else
            echo "⚠️  GREEN: 상태: $status"
        fi
    else
        echo "❌ GREEN: 실행 중이지 않음"
    fi
    
    if [ -f "$CURRENT_PORT_FILE" ]; then
        local current_port=$(cat $CURRENT_PORT_FILE)
        echo ""
        echo "현재 활성 포트: $current_port"
    fi
    
    if [ "$blue_running" = true ] || [ "$green_running" = true ]; then
        return 0
    else
        return 1
    fi
}

case "$1" in
    start)
        start
        ;;
    start-blue)
        start_blue
        ;;
    start-green)
        start_green
        ;;
    stop)
        stop
        ;;
    stop-blue)
        stop_blue
        ;;
    stop-green)
        stop_green
        ;;
    restart)
        restart
        ;;
    switch)
        switch
        ;;
    status)
        status
        ;;
    *)
        echo "사용법: $0 {start|start-blue|start-green|stop|stop-blue|stop-green|restart|switch|status}"
        echo ""
        echo "명령어 설명:"
        echo "  start       - 현재 활성 포트의 반대 포트로 새 인스턴스 시작"
        echo "  start-blue  - BLUE(3000) 포트로 인스턴스 시작"
        echo "  start-green - GREEN(3001) 포트로 인스턴스 시작"
        echo "  stop        - 모든 인스턴스 종료"
        echo "  stop-blue   - BLUE 인스턴스만 종료"
        echo "  stop-green  - GREEN 인스턴스만 종료"
        echo "  restart     - 모든 인스턴스 재시작 (중단 발생)"
        echo "  switch      - 블루-그린 전환 (무중단)"
        echo "  status      - 현재 상태 확인"
        exit 1
        ;;
esac

exit 0

