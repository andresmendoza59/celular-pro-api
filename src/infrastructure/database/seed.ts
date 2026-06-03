import 'dotenv/config'
import prisma from './prisma'

async function seed() {
  console.log('Sembrando datos iniciales...')

  // Categorías
  await prisma.category.createMany({
    data: [
      { id: 'apple', name: 'iPhone', tagline: 'El estándar de referencia.' },
      { id: 'samsung', name: 'Samsung', tagline: 'Innovación en cada píxel.' },
      { id: 'xiaomi', name: 'Xiaomi', tagline: 'Potencia sin concesiones.' },
      { id: 'motorola', name: 'Motorola', tagline: 'Diseñado para durar.' },
    ],
    skipDuplicates: true,
  })

  // Admin por defecto
  const bcrypt = await import('bcrypt')
  const adminPassword = await bcrypt.hash('admin1234', 12)
  await prisma.user.upsert({
    where: { email: 'admin@celularpro.co' },
    update: {},
    create: {
      email: 'admin@celularpro.co',
      name: 'Admin CelularPro',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  console.log('✓ Datos iniciales listos')
  console.log('  Admin: admin@celularpro.co / admin1234')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
