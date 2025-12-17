# 문제 해결 가이드

## Health Check 실패 문제

### 증상
- PM2가 앱을 시작하지만 Health Check가 실패함
- `npm start`를 사용하고 있음 (standalone 빌드가 없음)

### 원인
1. **Standalone 빌드가 생성되지 않음**: `next.config.js`에 `output: 'standalone'`이 설정되어 있어도 빌드가 제대로 되지 않았을 수 있음
2. **Standalone 빌드 경로 문제**: 서버에서 standalone 빌드를 찾지 못함
3. **환경 변수 문제**: `.env` 파일이 서버에 없거나 잘못 설정됨

### 해결 방법

#### 1. 서버에서 로그 확인
```bash
ssh -i your-key.pem ec2-user@3.39.247.194
cd /home/ec2-user/WORKSTAMP_ADMIN
pm2 logs workstamp-admin-blue
```

#### 2. Standalone 빌드 확인
```bash
# 서버에서 확인
ls -la /home/ec2-user/WORKSTAMP_ADMIN/.next/standalone/

# standalone 폴더가 없으면
ls -la /home/ec2-user/WORKSTAMP_ADMIN/.next/
```

#### 3. 로컬에서 빌드 확인
```bash
# 로컬에서 빌드 후 확인
npm run build
ls -la .next/standalone/
```

#### 4. Standalone 빌드가 없는 경우

**옵션 A: npm start 사용 (node_modules 필요)**
```bash
# 서버에서
cd /home/ec2-user/WORKSTAMP_ADMIN
npm install --production
```

**옵션 B: Standalone 빌드 재생성**
```bash
# 로컬에서
# next.config.js 확인
cat next.config.js

# 빌드
npm run build

# standalone 확인
ls -la .next/standalone/

# 다시 배포
./deploy.sh
```

#### 5. 환경 변수 확인
```bash
# 서버에서
cd /home/ec2-user/WORKSTAMP_ADMIN
cat .env

# 필수 환경 변수:
# - NEXT_PUBLIC_API_ENDPOINT
# - NEXTAUTH_URL
# - NEXTAUTH_SECRET
```

#### 6. 포트 확인
```bash
# 서버에서 포트 사용 확인
sudo netstat -tlnp | grep 3000
sudo netstat -tlnp | grep 3001

# 프로세스 확인
pm2 list
pm2 logs
```

### 일반적인 해결 순서

1. **서버 로그 확인**: `pm2 logs workstamp-admin-blue`
2. **Standalone 빌드 확인**: `ls -la .next/standalone/`
3. **환경 변수 확인**: `.env` 파일 확인
4. **포트 확인**: 다른 프로세스가 포트를 사용 중인지 확인
5. **재배포**: 문제 해결 후 다시 배포

### Standalone 빌드가 작동하지 않는 경우

임시로 `npm start`를 사용하려면:

1. **서버에서 node_modules 설치**:
```bash
cd /home/ec2-user/WORKSTAMP_ADMIN
npm install --production
```

2. **run.sh 수정** (이미 fallback 로직 포함):
   - standalone 빌드가 없으면 자동으로 `npm start` 사용

3. **재시작**:
```bash
cd /home/ec2-user/WORKSTAMP_ADMIN
./run.sh start
```

