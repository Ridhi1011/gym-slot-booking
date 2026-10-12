import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use(notFoundHandler);
app.use(errorHandler);
