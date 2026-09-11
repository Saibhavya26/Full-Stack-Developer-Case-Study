import { apiClient } from './client';
import { User } from '../types';

export async function loginRequest(email: string, password: string) {
  const { data } = await apiClient.post<{ token: string; user: User }>('/auth/login', {
    email,
    password,
  });
  return data;
}

export async function meRequest() {
  const { data } = await apiClient.get<{ user: User }>('/auth/me');
  return data.user;
}
