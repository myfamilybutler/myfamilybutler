interface EmailLoginResponse {
  success: boolean;
  error?: string;
  message?: string;
  status?: number;
}

/**
 * Shared client helper for requesting email magic-link login.
 * Keeps landing/login flows behaviorally consistent.
 */
export async function requestEmailLoginLink(email: string): Promise<EmailLoginResponse> {
  const response = await fetch('/api/auth/email-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const payload = (await response.json()) as EmailLoginResponse;

  if (!response.ok) {
    return {
      success: false,
      error: payload.error,
      status: response.status,
    };
  }

  return payload;
}
