import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { config } from './config/env';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.ALLOWED_ORIGINS.split(','), credentials: true }));
app.use(express.json());
app.use(pinoHttp());

app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Error handler to be attached after routes
// app.use(errorHandler);

export default app;
