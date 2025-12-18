import { encryptPassword } from "@/lib/crypto";
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

      const loginUrl = `${API_ENDPOINT}/api/v1/auth/login`;
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
    jwt({ token, user }) {
      if (user) {
        token.id = (user as Session["user"]).id;
        token.login = (user as Session["user"]).login;
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
      }
      return token;
    },
    session({ session, token }) {
      const extendedSession = session as Session & {
        accessToken?: string;
        refreshToken?: string;
      };
      extendedSession.user = { ...session.user, id: token.id as string, login: token.login as string };
      if (token.accessToken) {
        extendedSession.accessToken = token.accessToken;
      }
      if (token.refreshToken) {
        extendedSession.refreshToken = token.refreshToken;
      }
      return extendedSession;
    },
  },
});
