import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (!env.isProduction) {
    app.use(morgan('dev'));
  }

  app.use('/api', routes);

  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'Mini ERP + CRM Operations Portal API',
      status: 'running',
      docs: 'See /api/health and the Postman collection in /docs',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
