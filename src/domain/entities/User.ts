export type Role = 'USER' | 'ADMIN'

export interface User {
  id: string
  email: string
  name: string
  password: string
  role: Role
  createdAt: Date
  updatedAt: Date
}

export type PublicUser = Omit<User, 'password'>
