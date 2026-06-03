import { Router } from 'express'
import authRoutes from './auth.routes'
import ordersRoutes from './orders.routes'
import phonesRoutes from './phones.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/phones', phonesRoutes)
router.use('/orders', ordersRoutes)

export default router
