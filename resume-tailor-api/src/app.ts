import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { optionalAuth } from './middleware/authenticate.js';
import { registerProjectRoutes } from './routes/project.routes.js';
import { registerResumeRoutes } from './routes/resume.routes.js';
import { registerConversationRoutes } from './routes/conversation.routes.js';
import { registerRetrievalRoutes } from './routes/retrieval.routes.js';
import { registerLlmRoutes } from './routes/llm.routes.js';
import { registerKnowledgeGraphRoutes } from './routes/knowledgeGraph.routes.js';
import { registerIntelligenceRoutes } from './routes/intelligence.routes.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerSettingsRoutes } from './routes/settings.routes.js';

import { registerProfileRoutes } from './routes/profile.routes.js';
export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(optionalAuth);

app.get('/health', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      environment: env.NODE_ENV
    }
  });
});

registerProjectRoutes(app);
registerResumeRoutes(app);
registerConversationRoutes(app);
registerRetrievalRoutes(app);
registerLlmRoutes(app);
registerKnowledgeGraphRoutes(app);
registerIntelligenceRoutes(app);
registerAuthRoutes(app);
registerProfileRoutes(app);
registerSettingsRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

app.on('mount', () => {
  logger.info('Express application mounted');
});
