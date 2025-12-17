# 프론트엔드 무중단 배포 가이드

## 사전 준비사항

### 1. 서버 설정
- Node.js 18+ 설치 (npm은 필요 없음)
- PM2 설치 확인 (`npm install -g pm2`)
- Nginx 설치 확인 (무중단 배포를 위해 필요)

#### Node.js 설치 (Amazon Linux 2)
```bash
# Node.js 18.x 설치
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Node.js 버전 확인
node -v
# v18.x.x 이상이어야 합니다

# PM2 설치
sudo npm install -g pm2
```

### 2. SSH 키 설정
```bash
chmod 400 your-key.pem
```

### 3. 서버 초기 설정 (최초 1회)
```bash
ssh -i your-key.pem ec2-user@3.39.247.194

# Node.js 설치 확인
node -v
npm -v

# PM2 설치
npm install -g pm2

# Nginx 설치 (Amazon Linux 2)
sudo amazon-linux-extras install nginx1 -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 배포 방법

### 자동 배포
```bash
# 배포 스크립트에 실행 권한 부여
chmod +x deploy.sh

# .env 파일 생성 (최초 1회)
cp .env.example .env

# .env 파일 편집
nano .env

# 배포 실행
./deploy.sh
```

### .env 파일 설정 예시
```bash
# 서버 정보
DEPLOY_SERVER_USER=ec2-user
DEPLOY_SERVER_HOST=3.39.247.194
DEPLOY_SSH_KEY=your-key.pem
DEPLOY_APP_DIR=/home/ec2-user/WORKSTAMP_ADMIN
DEPLOY_APP_NAME=workstamp-admin

# Next.js 환경 변수
NEXT_PUBLIC_API_ENDPOINT=http://3.39.247.194
NEXTAUTH_URL=http://3.39.247.194
NEXTAUTH_SECRET=your-secret-key
```

## 서버 관리

### 애플리케이션 제어
```bash
ssh -i your-key.pem ec2-user@3.39.247.194
cd /home/ec2-user/WORKSTAMP_ADMIN

# 시작
./run.sh start

# 종료
./run.sh stop

# 재시작
./run.sh restart

# 상태 확인
./run.sh status

# 블루-그린 전환 (무중단)
./run.sh switch
```

### 로그 확인
```bash
# PM2 로그 확인
pm2 logs workstamp-admin-blue
pm2 logs workstamp-admin-green

# 모든 로그 확인
pm2 logs
```

## 무중단 배포 원리

### 블루-그린 배포
1. **BLUE 포트 (3000)**: 현재 서비스 중인 인스턴스
2. **GREEN 포트 (3001)**: 새로 배포할 인스턴스

### 배포 프로세스
1. 새 버전을 GREEN 포트(3001)로 시작
2. Health Check로 정상 동작 확인
3. Nginx 업스트림을 GREEN 포트로 전환
4. 기존 BLUE 인스턴스 종료

### 장점
- 서비스 중단 없이 배포 가능
- 문제 발생 시 즉시 롤백 가능
- Health Check로 안정성 보장

## Nginx 설정

### 자동 설정
배포 스크립트가 자동으로 Nginx 설정을 업데이트합니다.

### 수동 설정
```bash
sudo nano /etc/nginx/conf.d/workstamp-admin.conf
```

설정 예시:
```nginx
upstream workstamp_admin {
    server localhost:3000;  # 또는 3001
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://workstamp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

설정 적용:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 문제 해결

### 서버 상태 확인 (권장)
```bash
# 서버에 접속
ssh -i your-key.pem ec2-user@3.39.247.194
cd /home/ec2-user/WORKSTAMP_ADMIN

# 상태 확인 스크립트 실행
./scripts/check-server.sh
```

### 포트 확인
```bash
sudo netstat -tlnp | grep 3000
sudo netstat -tlnp | grep 3001
```

### PM2 프로세스 확인
```bash
pm2 list
pm2 describe workstamp-admin-blue
pm2 describe workstamp-admin-green

# 로그 확인
pm2 logs workstamp-admin-blue
pm2 logs workstamp-admin-green
```

### Nginx 상태 확인
```bash
sudo systemctl status nginx
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 접속이 안 될 때 확인 사항

1. **PM2 프로세스가 실행 중인지 확인**
```bash
pm2 list
# 프로세스가 없으면
cd /home/ec2-user/WORKSTAMP_ADMIN
./run.sh start
```

2. **포트가 열려있는지 확인**
```bash
curl http://localhost:3000
curl http://localhost:3001
```

3. **Nginx가 실행 중인지 확인**
```bash
sudo systemctl status nginx
# 실행 중이 아니면
sudo systemctl start nginx
```

4. **AWS 보안 그룹 확인**
- EC2 콘솔에서 보안 그룹 확인
- 인바운드 규칙에 포트 80 (HTTP)이 열려있는지 확인
- 소스: 0.0.0.0/0 또는 특정 IP

5. **Nginx 설정 확인**
```bash
sudo cat /etc/nginx/conf.d/workstamp-admin.conf
# 설정이 없으면
cd /home/ec2-user/WORKSTAMP_ADMIN
./scripts/update-nginx-upstream.sh
```

### 로그 확인
```bash
# PM2 로그
pm2 logs

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Health Check 실패 시
```bash
# 수동으로 Health Check
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health

# 포트별로 직접 확인
curl http://localhost:3000
curl http://localhost:3001
```

## 환경 변수 설정

서버에서 환경 변수를 설정하려면:
```bash
ssh -i your-key.pem ec2-user@3.39.247.194
cd /home/ec2-user/WORKSTAMP_ADMIN

# .env 파일 편집
nano .env

# 또는 .env.production 파일 생성
nano .env.production
```

필요한 환경 변수:
- `NEXT_PUBLIC_API_ENDPOINT`: API 서버 주소
- `NEXTAUTH_URL`: 서비스 URL
- `NEXTAUTH_SECRET`: NextAuth 시크릿 키
- 기타 Next.js 환경 변수

## PM2 자동 시작 설정

서버 재부팅 시 자동으로 시작되도록 설정:
```bash
pm2 startup
pm2 save
```

## 보안 그룹 설정

AWS EC2 보안 그룹에서 다음 포트를 열어야 합니다:
- **80**: HTTP (Nginx)
- **443**: HTTPS (SSL 인증서 적용 시)
- **3000, 3001**: Next.js 앱 (내부용, 외부 접근 불필요)

## SSL 인증서 적용 (선택사항)

Let's Encrypt를 사용한 SSL 인증서 적용:
```bash
sudo yum install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

Nginx 설정 자동 업데이트 후 HTTPS로 접근 가능합니다.

