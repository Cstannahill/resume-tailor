import type { User, UserCredential } from '@prisma/client';

export type UserRecord = User;
export type UserCredentialRecord = UserCredential;

export interface CreateUserInput {
  email: string;
  displayName?: string | null;
}
