import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import bookingRoutes from './routes/bookings.js';
import meRoutes from './routes/me.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/me', meRoutes);
app.use('/api', bookingRoutes); // /api/sessions/:id/bookings and /api/bookings/:id

app.use(notFoundHandler);
app.use(errorHandler);
