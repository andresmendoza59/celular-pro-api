import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { AppError } from '../../src/domain/AppError'

const TEST_JWT_SECRET = 'secreto-de-prueba-de-la-suite'
process.env.JWT_SECRET = TEST_JWT_SECRET

const { mockAdmin, mockPhone } = vi.hoisted(() => ({
  mockAdmin: {
    getStats: vi.fn(),
    listUsers: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    changeRole: vi.fn(),
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
  OrderRepository: vi.fn(function () { return {} }),
}))
vi.mock('../../src/infrastructure/repositories/PhoneRepository', () => ({
  PhoneRepository: vi.fn(function () { return mockPhone }),
}))

import app from '../../src/app'

function makePhone(overrides: Record<string, unknown> = {}) {
  const ahora = new Date()
  return {
    id: '77777777-7777-7777-7777-777777777777',
    slug: 'iphone-15',
    name: 'iPhone 15',
    brand: 'Apple',
    categoryId: 'apple',
    price: 2_700_000,
    compareAt: 2_900_000,
    badge: 'Top ventas',
    stock: 5,
    condition: 'CERTIFIED',
    verified: true,
    batteryHealth: 100,
    ram: '6GB',
    storage: '128GB',
    camera: '48MP',
    battery: '3349mAh',
    screen: '6.1" OLED',
    chip: 'A16 Bionic',
    shortDesc: 'El iPhone 15 con Dynamic Island',
    longDesc: 'Descripción larga del iPhone 15.',
    heroImage: 'https://img.example.com/iphone-15.jpg',
    images: [
      { id: 1, url: 'https://img.example.com/iphone-15.jpg', position: 1 },
    ],
    colors: [
      { id: 1, colorId: 'midnight', name: 'Midnight', hex: '#24252A' },
    ],
    features: ['Dynamic Island', 'USB-C'],
    createdAt: ahora,
    updatedAt: ahora,
    ...overrides,
  }
}

describe('GET /api/v1/phones/:slug — detalle público por slug', () => {
  it('sin token (pública) → 200 con el celular completo', async () => {
    const celular = makePhone()
    mockPhone.findBySlug.mockResolvedValue(celular)

    const res = await request(app).get('/api/v1/phones/iphone-15')

    expect(mockPhone.findBySlug).toHaveBeenCalledWith('iphone-15')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({
      ...celular,
      createdAt: celular.createdAt.toISOString(),
      updatedAt: celular.updatedAt.toISOString(),
    })
  })

  it('slug inexistente → 404 Celular no encontrado', async () => {
    mockPhone.findBySlug.mockResolvedValue(null)

    const res = await request(app).get('/api/v1/phones/slug-que-no-existe')

    expect(mockPhone.findBySlug).toHaveBeenCalledWith('slug-que-no-existe')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Celular no encontrado')
  })

  it('error del repositorio → se propaga por el error handler', async () => {
    mockPhone.findBySlug.mockRejectedValue(
      new AppError('Celular no encontrado', 404),
    )

    const res = await request(app).get('/api/v1/phones/iphone-15')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Celular no encontrado')
  })
})