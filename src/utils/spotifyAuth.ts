// Spotify OAuth 2.0 with PKCE Authentication Helpers

const SCOPE = import.meta.env.scope || "";

function getClientId(): string {
  try {
    const override = localStorage.getItem("spotify_client_id");
    if (override) return override;
  } catch (err) {
    // ignore (e.g., non-browser env)
  }
  return import.meta.env.client_id || import.meta.env.client_id_fallback || "";
}

function normalizeScopes(scopeString: string): string {
  return Array.from(
    new Set(
      scopeString
        .split(/\s+/)
        .map(scope => scope.trim())
        .filter(Boolean)
    )
  ).join(" ");
}

// We will use 127.0.0.1 for local redirects per user instruction
const getRedirectUri = (): string => {
  const origin = window.location.origin;
  if (origin.includes("localhost")) {
    return origin.replace("localhost", "127.0.0.1") + "/";
  }
  return origin + "/";
};

// Storage Keys
const ACCESS_TOKEN_KEY = "spotify_access_token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const EXPIRES_AT_KEY = "spotify_token_expires";
const VERIFIER_KEY = "spotify_code_verifier";

// --- Cryptographic Helpers for PKCE ---

function dec2hex(dec: number): string {
  return dec.toString(16).padStart(2, "0");
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(56);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec2hex).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
}

function base64urlencode(a: ArrayBuffer): string {
  let str = "";
  const bytes = new Uint8Array(a);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(v: string): Promise<string> {
  const hashed = await sha256(v);
  return base64urlencode(hashed);
}

// --- Auth API Actions ---

export async function login(): Promise<void> {
  const verifier = generateCodeVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    scope: normalizeScopes(SCOPE),
    code_challenge_method: "S256",
    code_challenge: challenge,
    redirect_uri: redirectUri,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function logout(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  // Redirect back to base clean URL
  window.location.href = getRedirectUri();
}

let activeRefreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  activeRefreshPromise = (async () => {
    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: getClientId(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh access token");
      }

      const data = await response.json();
      const expiresAt = Date.now() + data.expires_in * 1000;

      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString());
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      }

      return data.access_token as string;
    } catch (err) {
      console.error("Token refresh failed:", err);
      logout();
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export async function getAccessToken(): Promise<string | null> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);

  if (!token || !expiresAt) {
    return null;
  }

  // If token is expired or expires in the next 30 seconds, refresh it
  if (Date.now() > Number(expiresAt) - 30 * 1000) {
    return await refreshAccessToken();
  }

  return token;
}

export function isAuthenticatedSync(): boolean {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
  if (!token || !expiresAt) return false;
  return Date.now() < Number(expiresAt);
}

export async function handleRedirectCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (!code) {
    return false;
  }

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    console.error("Code verifier not found in session storage.");
    return false;
  }

  try {
    const redirectUri = getRedirectUri();
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: getClientId(),
        code_verifier: verifier,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Token exchange failed: ${errText}`);
    }

    const data = await response.json();
    const expiresAt = Date.now() + data.expires_in * 1000;

    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString());
    sessionStorage.removeItem(VERIFIER_KEY);

    // Clean URL query parameters
    const newUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);

    return true;
  } catch (err) {
    console.error("Error during authentication callback:", err);
    return false;
  }
}
