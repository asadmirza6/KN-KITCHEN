/**
 * User interface matching backend User model.
 * Represents administrator accounts.
 */

export interface User {
  id: number
  name: string
  email: string
  role: string // ADMIN or STAFF
  // password_hash is never sent to frontend
  created_at: string // ISO 8601 datetime string
}

/**
 * DTO for user signup request
 */
export interface SignupRequest {
  name: string
  email: string
  password: string
}

/**
 * DTO for user login request
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * DTO for login response
 */
export interface LoginResponse {
  token: string
  user: User
}
