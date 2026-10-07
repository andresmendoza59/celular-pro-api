import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { AppError } from '../../src/domain/AppError'

const TEST_JWT_SECRET = 'secreto-de-prueba-de-la-suite'
process.env.JWT_SECRET = TEST_JWT_SECRET

const { mockAdmin } = vi.hoisted(() => ({
  mockAdmin: {
    getStats: vi.fn(),
    listUsers: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    changeRole: vi.fn(),
  },
}))

vi.mock('../../src/infrastructure/repositories/AdminRepository', () => ({
  AdminRepository: vi.fn(function () { return mockAdmin }),
}))
vi.mock('../../src/infrastructure/repositories/UserRepository', () => ({
  UserRepository: vi.fn(function () { return {} }),
}))
vi.mock('../../src/infrastructure/repositories/OrderRepository', () => ({
  OrderRepository: vi.fn(function () { return {} }),
}))
vi.mock('../../src/infrastructure/repositories/PhoneRepository', () => ({
  PhoneRepository: vi.fn(function () { return {} }),
}))

import app from '../../src/app'

const ID_ADMIN = '11111111-1111-1111-1111-111111111111'
const ID_VICTIMA = '22222222-2222-2222-2222-222222222222'
const ID_INEXISTENTE = '00000000-0000-0000-0000-000000000000'

const RUTA = (id: string) => `/api/v1/admin/users/${id}/role`

function tokenDe(persona: { id: string; role: 'USER' | 'ADMIN' }): string {
  return jwt.sign(persona, TEST_JWT_SECRET, { expiresIn: '1h' })
}

function tokenConFirmaInvalida(): string {
  return jwt.sign({ id: ID_INEXISTENTE, role: 'ADMIN' }, 'secreto-equivocado')
}

function usuarioConRol(role: 'USER' | 'ADMIN' = 'ADMIN') {
  const ahora = new Date()
  return {
    id: ID_VICTIMA,
    email: 'victima@correo.com',
    name: 'Víctima de prueba',
    role,
    banned: false,
    banReason: null,
    bannedAt: null,
    createdAt: ahora,
    updatedAt: ahora,
    _count: { orders: 0 },
  }
}

beforeEach(() => {
  Object.values(mockAdmin).forEach((mock) => mock.mockReset())
})

describe('PUT /api/v1/admin/users/:id/role — cambiar rol', () => {
  it('Camino 1: sin cabecera Bearer → 401 Token requerido', async () => {
    const res = await request(app)
      .put(RUTA(ID_VICTIMA))
      .send({ role: 'ADMIN' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
    expect(mockAdmin.changeRole).not.toHaveBeenCalled()
  })

  it('Camino 2: firma inválida → 401 Token inválido o expirado', async () => {
    const res = await request(app)
      .put(RUTA(ID_VICTIMA))
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)
      .send({ role: 'ADMIN' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido o expirado')
    expect(mockAdmin.changeRole).not.toHaveBeenCalled()
  })

  it('Camino 3: rol USER → 403 Acceso restringido', async () => {
    const token = tokenDe({ id: ID_ADMIN, role: 'USER' })

    const res = await request(app)
      .put(RUTA(ID_VICTIMA))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso restringido a administradores')
    expect(mockAdmin.changeRole).not.toHaveBeenCalled()
  })

  it('Camino 4: rol inválido en el body → 400 Datos inválidos', async () => {
    const token = tokenDe({ id: ID_ADMIN, role: 'ADMIN' })

    const res = await request(app)
      .put(RUTA(ID_VICTIMA))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'SUPERUSER' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
    expect(mockAdmin.changeRole).not.toHaveBeenCalled()
  })

  it('Camino 5: un admin no cambia su propio rol (RN) → 400', async () => {
    const token = tokenDe({ id: ID_ADMIN, role: 'ADMIN' })

    const res = await request(app)
      .put(RUTA(ID_ADMIN))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'USER' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('No puedes cambiar tu propio rol')
    expect(mockAdmin.changeRole).not.toHaveBeenCalled()
  })

  it('Camino 6: el usuario no existe → 404 Usuario no encontrado', async () => {
    const token = tokenDe({ id: ID_ADMIN, role: 'ADMIN' })
    mockAdmin.changeRole.mockRejectedValue(
      new AppError('Usuario no encontrado', 404),
    )

    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' })

    expect(mockAdmin.changeRole).toHaveBeenCalledWith(ID_INEXISTENTE, 'ADMIN')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Usuario no encontrado')
  })

  it('Camino 7: cambio correcto → 200 con el usuario actualizado', async () => {
    const token = tokenDe({ id: ID_ADMIN, role: 'ADMIN' })
    mockAdmin.changeRole.mockResolvedValue(usuarioConRol('ADMIN'))

    const res = await request(app)
      .put(RUTA(ID_VICTIMA))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' })

    expect(mockAdmin.changeRole).toHaveBeenCalledWith(ID_VICTIMA, 'ADMIN')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      id: ID_VICTIMA,
      role: 'ADMIN',
    })
    expect(res.body.data).not.toHaveProperty('password')
  })
})