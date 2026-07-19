// Static Mock Authentication Helpers for GitHub Pages / Demo Mode
import { toast } from "sonner";

export async function login(): Promise<void> {
  toast.info("Using static mock mode (no authentication needed)");
  return Promise.resolve();
}

export function logout(): void {
  toast.info("Cleared local preferences cache");
  try {
    localStorage.removeItem("spotify-manager-preferences");
    localStorage.removeItem("spotify_access_token");
  } catch (err) {
    // ignore
  }
  window.location.reload();
}

export async function refreshAccessToken(): Promise<string | null> {
  return Promise.resolve("mock-access-token");
}

export async function getAccessToken(): Promise<string | null> {
  return Promise.resolve("mock-access-token");
}

export function isAuthenticatedSync(): boolean {
  return true;
}

export async function handleRedirectCallback(): Promise<boolean> {
  return Promise.resolve(true);
}
