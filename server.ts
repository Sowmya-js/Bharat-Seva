import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { categorizeIssue, validateResolution, generateGovInsights } from './src/server/gemini.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to handle JSON payloads with generous limit for base64 images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes first
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Categorize Issue API
  app.post('/api/ai/categorize', async (req, res) => {
    try {
      const { image, description } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Image is required for categorization' });
      }
      const result = await categorizeIssue(image, description || '');
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/ai/categorize:', error);
      res.status(500).json({ error: error.message || 'Internal AI Server Error' });
    }
  });

  // Validate Resolution API
  app.post('/api/ai/validate', async (req, res) => {
    try {
      const { imageBefore, imageAfter, category, description } = req.body;
      if (!imageBefore || !imageAfter) {
        return res.status(400).json({ error: 'Both original and fixed images are required for validation' });
      }
      const result = await validateResolution(imageBefore, imageAfter, category || '', description || '');
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/ai/validate:', error);
      res.status(500).json({ error: error.message || 'Internal AI Server Error' });
    }
  });

  // Government Analytics API
  app.post('/api/ai/analytics', async (req, res) => {
    try {
      const { level, locationName, issues } = req.body;
      if (!level || !locationName || !Array.isArray(issues)) {
        return res.status(400).json({ error: 'Level, locationName, and issues array are required' });
      }
      const result = await generateGovInsights(level, locationName, issues);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/ai/analytics:', error);
      res.status(500).json({ error: error.message || 'Internal AI Server Error' });
    }
  });

  // Vite middleware for development or Static Serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bharat Seva Server running on port ${PORT} [NODE_ENV=${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
