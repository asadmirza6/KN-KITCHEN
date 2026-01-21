/**
 * Authentication service for user signup, login, and logout.
 * Handles JWT token storage and authentication state.
 */

import axios from '@/lib/axios'
import type { SignupRequest, LoginRequest, LoginResponse, User } from '@/types/User'


/**
 * Sign up a new admin user
 */
export async function signup(data: SignupRequest): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>('/auth/signup', data)

  // Store token in localStorage
  if (response.data.token) {
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('user', JSON.stringify(response.data.user))
  }

  return response.data
}


/**
 * Login with email and password
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>('/auth/login', data)

  // Store token and user in localStorage
  if (response.data.token) {
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('user', JSON.stringify(response.data.user))
  }

  return response.data
}


/**
 * Logout current user
 * Removes token from localStorage and calls logout endpoint
 */
export async function logout(): Promise<void> {
  try {
    // Call backend logout endpoint (optional, for logging purposes)
    await axios.post('/auth/logout')
  } catch (error) {
    // Ignore errors - we're logging out anyway
    console.error('Logout error:', error)
  } finally {
    // Remove token and user from localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}


/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('token')
}


/**
 * Get current user from localStorage
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null

  const userJson = localStorage.getItem('user')
  if (!userJson) return null

  try {
    return JSON.parse(userJson) as User
  } catch {
    return null
  }
}


/**
 * Get authentication token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}
