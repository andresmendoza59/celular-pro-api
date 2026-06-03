import { NextFunction, Request, Response } from 'express'
import { AppError } from '../../domain/AppError'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  // Errores no controlados: no exponer el stack trace al cliente
  const isDev = process.env.NODE_ENV === 'development'
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isDev && { detail: err.message }),
  })
}
