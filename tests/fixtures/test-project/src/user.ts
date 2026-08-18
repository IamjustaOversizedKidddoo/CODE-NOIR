import { queryDb } from './database';

export function findUser(username: string) {
  return queryDb(`SELECT * FROM users WHERE username = '${username}'`);
}

export function verifyPassword(user: any, pass: string) {
  return user.password === pass;
}
