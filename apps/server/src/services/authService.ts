import {
  createUser,
  findUserByEmail,
  findUserById,
} from "../repositories/usersRepository.js";
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors.js";
import {
  createAuthToken,
  hashPassword,
  verifyPassword,
} from "../utils/auth.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthUser = {
  id: number;
  email: string;
};

const toPublicAuthUser = (input: { id: number; email: string }): AuthUser => ({
  id: input.id,
  email: input.email,
});

const validateCredentials = (input: {
  email?: unknown;
  password?: unknown;
}) => {
  if (typeof input.email !== "string" || !input.email.trim()) {
    throw new ValidationError("email is required");
  }

  if (!EMAIL_REGEX.test(input.email.trim().toLowerCase())) {
    throw new ValidationError("email format is invalid");
  }

  if (typeof input.password !== "string" || !input.password.trim()) {
    throw new ValidationError("password is required");
  }

  if (input.password.length < 8) {
    throw new ValidationError("password must be at least 8 characters");
  }

  return {
    email: input.email.trim().toLowerCase(),
    password: input.password,
  };
};

export const signUpWithCredentials = async (input: {
  email?: unknown;
  password?: unknown;
}) => {
  const validated = validateCredentials(input);
  const existing = await findUserByEmail(validated.email);

  if (existing) {
    throw new ConflictError("An account already exists for this email");
  }

  const created = await createUser({
    email: validated.email,
    passwordHash: hashPassword(validated.password),
  });

  const user = toPublicAuthUser(created);

  return {
    user,
    token: createAuthToken(user),
  };
};

export const signInWithCredentials = async (input: {
  email?: unknown;
  password?: unknown;
}) => {
  const validated = validateCredentials(input);
  const user = await findUserByEmail(validated.email);

  if (!user || !verifyPassword(validated.password, user.passwordHash)) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const publicUser = toPublicAuthUser(user);

  return {
    user: publicUser,
    token: createAuthToken(publicUser),
  };
};

export const getAuthUserById = async (id: number) => {
  const user = await findUserById(id);

  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  return toPublicAuthUser(user);
};
