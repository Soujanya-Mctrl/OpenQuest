import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import passport from './config/passport';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user.route';
import { aiRouter } from './routes/ai.route';
import { config } from './config/env';

const app = express();

app.use(helmet());
app.use(cors({
    origin: config.ALLOWED_ORIGINS.split(','),
    credentials: true,
}));
app.use(express.json());
app.use(pinoHttp());

// Session configuration (must come before passport)
app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
    },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/ai', aiRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

export default app;
