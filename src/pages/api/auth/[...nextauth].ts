import { encryptPassword } from "@/lib/crypto";
import { parseJwt, isTokenExpired } from "@/lib/jwt-utils";
import NextAuth, { Session } from "next-auth";
import { OAuthUserConfig } from "next-auth/providers";
import CredentialsProvider, { CredentialsConfig } from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";


const credentialsProviderOption: CredentialsConfig<{}> = {
  type: "credentials",
  id: "login-credentials",
  name: "login-credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials: Record<string, unknown> | undefined) {
    if (!credentials?.email || !credentials?.password) {
      console.error("Missing credentials");
      return null;
    }

    try {
      const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://3.39.247.194";
      const plainPassword = credentials.password as string;
      const encryptedPassword = encryptPassword(plainPassword);

      console.log("=== Password Encryption Check ===");
      console.log("Original password:", plainPassword);
      console.log("Encrypted password:", encryptedPassword);
      console.log("Is encrypted?", encryptedPassword !== plainPassword);
      console.log("Encrypted length:", encryptedPassword.length);
      console.log("================================");

      console.log("Login attempt:", {
        email: credentials.email,
        passwordLength: plainPassword.length,
        encryptedPassword: encryptedPassword.substring(0, 50) + "...",
        encryptedPasswordLength: encryptedPassword.length
      });

      const requestBody = {
        email: credentials.email,
        password: encryptedPassword,
      };

      const loginUrl = `${API_ENDPOINT}/api/v1/auth/admin/login`;
      console.log("Request URL:", loginUrl);
      console.log("Request body:", { ...requestBody, password: encryptedPassword.substring(0, 30) + "..." });

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // 응답 텍스트 먼저 확인
      const responseText = await response.text();
      console.log("Login response text:", responseText);
      console.log("Login response status:", response.status);
      console.log("Login response headers:", Object.fromEntries(response.headers.entries()));

      // 에러 응답 처리
      if (!response.ok) {
        // 403 Forbidden은 보통 CORS나 권한 문제
        if (response.status === 403) {
          console.error("403 Forbidden - CORS 또는 권한 문제일 수 있습니다");
          console.error("Request URL:", `${API_ENDPOINT}/login`);
          console.error("Response headers:", Object.fromEntries(response.headers.entries()));



          throw new Error("서버 접근이 거부되었습니다. 이메일 또는 비밀번호를 확인해주세요.");
        }

        // 401 Unauthorized는 인증 실패
        if (response.status === 401) {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        // 응답 본문이 있는 경우 파싱 시도
        if (responseText) {
          let errorResult;
          try {
            errorResult = JSON.parse(responseText);
            console.error("Login failed:", errorResult.message || "Unknown error");
            throw new Error(errorResult.message || "로그인에 실패했습니다");
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
          }
        }

        // 응답 본문이 없는 경우 상태 코드에 따른 메시지
        throw new Error(`서버 오류가 발생했습니다 (${response.status})`);
      }

      if (!responseText) {
        throw new Error("서버로부터 응답을 받지 못했습니다");
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Response text:", responseText);
        throw new Error(`서버 응답을 파싱할 수 없습니다: ${responseText.substring(0, 100)}`);
      }

      console.log("Login response:", { status: response.status, code: result.code, message: result.message });

      if ((result.code === "200" || result.code === 200) && result.data) {
        console.log("Login success");
        return {
          id: credentials.email as string,
          login: credentials.email as string,
          name: credentials.email as string,
          email: credentials.email as string,
          image: "",
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
        };
      }

      console.error("Invalid response format:", result);
      throw new Error(result.message || "로그인에 실패했습니다");
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;
    }
  },
};

const googleProviderOption: OAuthUserConfig<{}> = {
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  profile: (profile: any) => ({ ...profile, id: profile.sub, login: profile.email, image: profile.picture }),
};

const githubProviderOption: OAuthUserConfig<{}> = {
  clientId: process.env.GITHUB_CLIENT_ID || "",
  clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  profile: (profile: any) => ({ ...profile, image: profile.avatar_url }),
};




/**
 * 토큰 갱신을 위한 헬퍼 함수
 */
async function refreshAccessToken(token: any) {
  try {
    const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://3.39.247.194";
    const url = `${API_ENDPOINT}/api/v1/auth/refresh`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    const { data } = refreshedTokens;

    // 새로 발급받은 액세스 토큰의 만료 시간 파싱
    const decoded = parseJwt(data.accessToken);
    const exp = decoded?.exp ? decoded.exp * 1000 : Date.now() + 60 * 60 * 1000; // fallback 1 hour

    return {
      ...token,
      accessToken: data.accessToken,
      accessTokenExpires: exp,
      refreshToken: token.refreshToken, // 리프레시 토큰은 재사용 (API가 새로 주지 않음)
    };
  } catch (error) {
    console.error("RefreshAccessTokenError", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export default NextAuth({
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=1",
    error: "/login",
  },
  providers: [
    CredentialsProvider(credentialsProviderOption),
    GoogleProvider(googleProviderOption),
    GithubProvider(githubProviderOption),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // 1. 초기 로그인 시
      if (user && account) {
        const accessToken = (user as any).accessToken;
        const decoded = parseJwt(accessToken);
        // 토큰 만료 시간 (ms)
        const exp = decoded?.exp ? decoded.exp * 1000 : Date.now() + 60 * 60 * 1000;

        return {
          ...token,
          accessToken: accessToken,
          refreshToken: (user as any).refreshToken,
          accessTokenExpires: exp,
          id: (user as any).id,
          login: (user as any).login,
        };
      }

      // 2. 토큰이 아직 유효한 경우 그대로 반환 (1분 버퍼)
      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number) - 60 * 1000) {
        return token;
      }

      // 3. 토큰이 만료된 경우 갱신 시도
      console.log("Access token expired, refreshing...");
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      const extendedSession = session as Session & {
        accessToken?: string;
        refreshToken?: string;
        error?: string;
      };

      extendedSession.user = {
        ...session.user,
        id: token.id as string,
        login: token.login as string
      };

      extendedSession.accessToken = token.accessToken as string;
      extendedSession.refreshToken = token.refreshToken as string;
      extendedSession.error = token.error as string;

      return extendedSession;
    },
  },
});
