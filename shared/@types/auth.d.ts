export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in: number; // seconds
  scope?: string;
};

export type AuthState = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt: number; // ms epoch
};
