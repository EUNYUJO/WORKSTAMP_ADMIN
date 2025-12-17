# EC2 서버 초기 설정 가이드

## 필수 설치 항목

### 1. Node.js 설치 (npm 버전 업그레이드 불필요)

```bash
# Amazon Linux 2에서 Node.js 18.x 설치
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Node.js 버전 확인
node -v
# v18.x.x 이상이면 충분합니다 (예: v18.20.8)

# npm 버전 확인 (업그레이드 불필요)
npm -v
# npm 10.x.x 이상이면 충분합니다
# ⚠️ npm 11.x는 Node.js 20+ 필요하므로 업그레이드하지 마세요!
```

**중요**: npm을 업그레이드할 필요가 없습니다. standalone 빌드를 사용하므로 서버에서 npm을 사용하지 않습니다.

### 2. PM2 설치

```bash
# PM2 전역 설치
sudo npm install -g pm2

# PM2 버전 확인
pm2 -v

# PM2 자동 시작 설정 (서버 재부팅 시 자동 실행)
pm2 startup
pm2 save
```

### 3. Nginx 설치 (무중단 배포용)

```bash
# Amazon Linux 2에서 Nginx 설치
sudo amazon-linux-extras install nginx1 -y

# Nginx 시작 및 자동 시작 설정
sudo systemctl enable nginx
sudo systemctl start nginx

# Nginx 상태 확인
sudo systemctl status nginx
```

## 설치 확인

```bash
# 모든 필수 도구 확인
node -v    # Node.js 버전
pm2 -v     # PM2 버전
nginx -v   # Nginx 버전
```

## 참고사항

- **npm 업그레이드 불필요**: Next.js standalone 빌드를 사용하므로 서버에서 npm을 사용하지 않습니다. 현재 npm 버전(10.x)으로 충분합니다.
- **Node.js 18.x로 충분**: Node.js 18.20.8 이상이면 문제없이 작동합니다.
- **npm install 불필요**: standalone 빌드에 모든 의존성이 포함되어 있어 서버에서 `npm install`이 필요 없습니다.
- **Node.js만 필요**: `npm start` 대신 `node .next/standalone/server.js`를 직접 실행합니다.
- **PM2는 필수**: 프로세스 관리 및 무중단 배포를 위해 필요합니다.

## 문제 해결

### npm 업그레이드 오류 발생 시
```
npm error engine Unsupported engine
npm error engine Not compatible with your version of node/npm
```

**해결 방법**: npm을 업그레이드하지 마세요! 현재 버전으로 충분합니다.
- Node.js 18.x는 npm 10.x와 함께 설치됩니다.
- npm 11.x는 Node.js 20+가 필요하지만, standalone 빌드에서는 npm을 사용하지 않으므로 업그레이드할 필요가 없습니다.

