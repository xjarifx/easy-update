export type AuthUser = {
  id: number;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
