import { findUser, verifyPassword } from './user';

export function authenticateUser(username: string, pass: string) {
  const user = findUser(username);
  if (!user) return false;
  return verifyPassword(user, pass);
}
