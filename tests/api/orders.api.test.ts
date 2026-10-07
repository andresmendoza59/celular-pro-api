import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { AppError } from '../../src/domain/AppError'

const TEST_JWT_SECRET = 'secreto-de-prueba-de-la-suite'
process.env.JWT_SECRET = TEST_JWT_SECRET

const { mockAdmin, mockOrder, mockPhone } = vi.hoisted(() => ({
  mockAdmin: {
    getStats: vi.fn(),
    listUsers: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    changeRole: vi.fn(),
  },
  mockOrder: {
    create: vi.fn(),
    findById: vi.fn(),
    findByUser: vi.fn(),
    findAll: vi.fn(),
    updateStatus: vi.fn(),
  },
  mockPhone: {
    findBySlug: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../src/infrastructure/repositories/AdminRepository', () => ({
  AdminRepository: vi.fn(function () { return mockAdmin }),
}))
vi.mock('../../src/infrastructure/repositories/UserRepository', () => ({
  UserRepository: vi.fn(function () { return {} }),
}))
vi.mock('../../src/infrastructure/repositories/OrderRepository', () => ({
  OrderRepository: vi.fn(function () { return mockOrder }),
}))
vi.mock('../../src/infrastructure/repositories/PhoneRepository', () => ({
  PhoneRepository: vi.fn(function () { return mockPhone }),
}))

import app from '../../src/app'

const ID_USER = '33333333-3333-3333-3333-333333333333'
const ID_ORDER = '44444444-4444-4444-4444-444444444444'
const PHONE_ID_1 = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
const PHONE_ID_2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

function tokenDe(persona: { id: string; role: 'USER' | 'ADMIN' }): string {
  return jwt.sign(persona, TEST_JWT_SECRET, { expiresIn: '1h' })
}

function bodyPedidoValido(overrides: Record<string, unknown> = {}) {
  return {
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '+57 300 123 4567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
    items: [
      { phoneId: PHONE_ID_1, qty: 2 },
      { phoneId: PHONE_ID_2, qty: 1, colorId: 'c1', colorName: 'Negro' },
    ],
    ...overrides,
  }
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  const ahora = new Date()
  return {
    id: ID_ORDER,
    orderRef: 'CP-A1B2C3',
    userId: ID_USER,
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '+57 300 123 4567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
    subtotal: 1_020_000,
    shipping: 0,
    total: 1_020_000,
    status: 'PENDING',
    items: [
      {
        id: 1,
        phoneId: PHONE_ID_1,
        name: 'iPhone 15',
        heroImage: null,
        price: 380_000,
        qty: 2,
        colorId: null,
        colorName: null,
      },
      {
        id: 2,
        phoneId: PHONE_ID_2,
        name: 'Galaxy S23',
        heroImage: null,
        price: 260_000,
        qty: 1,
        colorId: 'c1',
        colorName: 'Negro',
      },
    ],
    createdAt: ahora,
    updatedAt: ahora,
    ...overrides,
  }
}

function paginado(data: unknown[], total = data.length, page = 1, limit = 20) {
  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

beforeEach(() => {
  Object.values(mockOrder).forEach((mock) => mock.mockReset())
})

describe('POST /api/v1/orders — crear pedido', () => {
  it('sin token → 401 Token requerido', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send(bodyPedidoValido())

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
    expect(mockOrder.create).not.toHaveBeenCalled()
  })

  it('firma inválida → 401 Token inválido o expirado', async () => {
    const token = jwt.sign(
      { id: ID_USER, role: 'USER' },
      'secreto-equivocado',
    )

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedidoValido())

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido o expirado')
    expect(mockOrder.create).not.toHaveBeenCalled()
  })

  it('body inválido (email malformado) → 400 Datos inválidos', async () => {
    const token = tokenDe({ id: ID_USER, role: 'USER' })

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedidoValido({ email: 'no-es-un-email' }))

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
    expect(mockOrder.create).not.toHaveBeenCalled()
  })

  it('body inválido (items vacíos) → 400 Datos inválidos', async () => {
    const token = tokenDe({ id: ID_USER, role: 'USER' })

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedidoValido({ items: [] }))

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
    expect(mockOrder.create).not.toHaveBeenCalled()
  })

  it('pedido correcto → 201 con el pedido creado ligado al usuario', async () => {
    const token = tokenDe({ id: ID_USER, role: 'USER' })
    const pedido = makeOrder()
    mockOrder.create.mockResolvedValue(pedido)

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedidoValido())

    expect(mockOrder.create).toHaveBeenCalledWith({
      ...bodyPedidoValido(),
      userId: ID_USER,
    })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      id: ID_ORDER,
      orderRef: 'CP-A1B2C3',
      status: 'PENDING',
    })
  })

  it('regla de negocio del repositorio (stock) → 400 propagado', async () => {
    const token = tokenDe({ id: ID_USER, role: 'USER' })
    mockOrder.create.mockRejectedValue(
      new AppError('Stock insuficiente para "iPhone 15"', 400),
    )

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedidoValido())

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Stock insuficiente para "iPhone 15"')
  })
})

describe('GET /api/v1/orders/my — mis pedidos', () => {
  it('sin token → 401 Token requerido', async () => {
    const res = await request(app).get('/api/v1/orders/my')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
    expect(mockOrder.findByUser).not.toHaveBeenCalled()
  })

  it('usuario autenticado → 200 con sus pedidos', async () => {
    const token = tokenDe({ id: ID_USER, role: 'USER' })
    const pedidos = [makeOrder(), { ...makeOrder(), id: '55555555-5555-5555-5555-555555555555' }]
    mockOrder.findByUser.mockResolvedValue(pedidos)

    const res = await request(app)
      .get('/api/v1/orders/my')
      .set('Authorization', `Bearer ${token}`)

    expect(mockOrder.findByUser).toHaveBeenCalledWith(ID_USER)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[0]).toMatchObject({ id: ID_ORDER })
  })
})

describe('GET /api/v1/orders/ — listar pedidos (admin)', () => {
  it('sin token → 401 Token requerido', async () => {
    const res = await request(app).get('/api/v1/orders/')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
    expect(mockOrder.findAll).not.toHaveBeenCalled()
  })

  it('rol USER → 403 Acceso restringido', async () => {
    const token = tokenDe({ id: ID_USER, role: 'USER' })

    const res = await request(app)
      .get('/api/v1/orders/')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso restringido a administradores')
    expect(mockOrder.findAll).not.toHaveBeenCalled()
  })

  it('rol ADMIN → 200 con paginación por defecto (1, 20)', async () => {
    const token = tokenDe({ id: ID_USER, role: 'ADMIN' })
    mockOrder.findAll.mockResolvedValue(paginado([makeOrder()]))

    const res = await request(app)
      .get('/api/v1/orders/')
      .set('Authorization', `Bearer ${token}`)

    expect(mockOrder.findAll).toHaveBeenCalledWith(1, 20)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.meta).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 })
  })

  it('rol ADMIN con page/limit en query → se pasan al repositorio', async () => {
    const token = tokenDe({ id: ID_USER, role: 'ADMIN' })
    mockOrder.findAll.mockResolvedValue(
      paginado([], 25, 2, 5),
    )

    const res = await request(app)
      .get('/api/v1/orders/?page=2&limit=5')
      .set('Authorization', `Bearer ${token}`)

    expect(mockOrder.findAll).toHaveBeenCalledWith(2, 5)
    expect(res.status).toBe(200)
    expect(res.body.meta).toMatchObject({ total: 25, page: 2, limit: 5, totalPages: 5 })
  })
})

describe('PUT /api/v1/orders/:id/status — actualizar estado (admin)', () => {
  it('sin token → 401 Token requerido', async () => {
    const res = await request(app)
      .put(`/api/v1/orders/${ID_ORDER}/status`)
      .send({ status: 'SHIPPED' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
    expect(mockOrder.updateStatus).not.toHaveBeenCalled()
  })

  it('rol USER → 403 Acceso restringido', async () => {
    const token = tokenDe({ id: ID_USER, role: 'USER' })

    const res = await request(app)
      .put(`/api/v1/orders/${ID_ORDER}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SHIPPED' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso restringido a administradores')
    expect(mockOrder.updateStatus).not.toHaveBeenCalled()
  })

  it('estado inválido → 400 Datos inválidos', async () => {
    const token = tokenDe({ id: ID_USER, role: 'ADMIN' })

    const res = await request(app)
      .put(`/api/v1/orders/${ID_ORDER}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INVENTADO' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
    expect(mockOrder.updateStatus).not.toHaveBeenCalled()
  })

  it('pedido inexistente → 404 Orden no encontrada', async () => {
    const token = tokenDe({ id: ID_USER, role: 'ADMIN' })
    mockOrder.findById.mockResolvedValue(null)

    const res = await request(app)
      .put(`/api/v1/orders/${ID_ORDER}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SHIPPED' })

    expect(mockOrder.findById).toHaveBeenCalledWith(ID_ORDER)
    expect(mockOrder.updateStatus).not.toHaveBeenCalled()
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Orden no encontrada')
  })

  it('cambio correcto → 200 con el estado actualizado', async () => {
    const token = tokenDe({ id: ID_USER, role: 'ADMIN' })
    mockOrder.findById.mockResolvedValue(makeOrder())
    mockOrder.updateStatus.mockResolvedValue(
      makeOrder({ status: 'SHIPPED' }),
    )

    const res = await request(app)
      .put(`/api/v1/orders/${ID_ORDER}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SHIPPED' })

    expect(mockOrder.findById).toHaveBeenCalledWith(ID_ORDER)
    expect(mockOrder.updateStatus).toHaveBeenCalledWith(ID_ORDER, 'SHIPPED')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: ID_ORDER, status: 'SHIPPED' })
  })
})