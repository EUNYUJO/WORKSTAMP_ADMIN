import CryptoJS from "crypto-js";

/**
 * 암호화 키 상수
 * 백엔드와 동일한 키를 사용해야 합니다.
 * 제공된 암호화 유틸리티 코드에서는 hrhrhr!!@00000000000000000000000를 사용합니다.
 */
const CRYPTO_AES_KEY = "hrhrhr!!@00000000000000000000000";

/**
 * 키에서 IV를 생성하는 헬퍼 함수
 * 같은 키와 데이터로 암호화하면 항상 같은 결과를 보장하기 위해 키 기반 IV 사용
 */
function generateIVFromKey(key: string): CryptoJS.lib.WordArray {
  // 키의 MD5 해시를 사용하여 IV 생성 (16바이트)
  const keyHash = CryptoJS.MD5(key);
  return CryptoJS.lib.WordArray.create(keyHash.words.slice(0, 4), 16);
}

/**
 * AES 암호화
 * 
 * 키 기반 IV를 사용하여 암호화합니다.
 * 같은 키와 데이터로 암호화하면 항상 같은 결과를 보장합니다.
 * 
 * @param data 암호화할 데이터
 * @param key 암호화 키 (기본값: CRYPTO_AES_KEY)
 * @returns 암호화된 Base64 문자열
 */
export function encryptAES(data: string, key: string = CRYPTO_AES_KEY): string {
  // 키에서 IV 생성 (같은 키면 항상 같은 IV)
  const iv = generateIVFromKey(key);
  const keyWordArray = CryptoJS.enc.Utf8.parse(key);

  const encrypted = CryptoJS.AES.encrypt(data, keyWordArray, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.toString();
}

/**
 * AES 복호화
 * 
 * @param encryptedData 암호화된 Base64 문자열
 * @param key 복호화 키 (기본값: CRYPTO_AES_KEY)
 * @returns 복호화된 원본 문자열
 */
export function decryptAES(encryptedData: string, key: string = CRYPTO_AES_KEY): string {
  try {
    // 암호화와 동일한 방식으로 IV 생성
    const iv = generateIVFromKey(key);
    const keyWordArray = CryptoJS.enc.Utf8.parse(key);

    const decrypted = CryptoJS.AES.decrypt(encryptedData, keyWordArray, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
      throw new Error("복호화 결과가 비어있습니다. 키나 암호화된 데이터를 확인해주세요.");
    }

    return decryptedText;
  } catch (error) {
    throw new Error(`복호화 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 비밀번호를 암호화합니다.
 * 백엔드에서 복호화할 수 있도록 AES 암호화를 사용합니다.
 */
export const encryptPassword = (password: string): string => {
  return encryptAES(password);
};

/**
 * HMAC-SHA256 해시 생성
 * 백엔드와 동일한 키를 사용해야 합니다.
 * @param data 해시할 데이터
 * @param key HMAC 키 (기본값: CRYPTO_AES_KEY)
 * @returns Hex 문자열로 변환된 해시값
 */
export function hmacSha256Hex(data: string, key: string = CRYPTO_AES_KEY): string {
  const hash = CryptoJS.HmacSHA256(data, key);
  return hash.toString(CryptoJS.enc.Hex);
}

