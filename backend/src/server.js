import { GoogleGenAI } from '@google/genai';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { validateRows } from './validation.js';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
}));

app.use(express.json({ limit: '1mb' }));

// LOCAL REPORT STORAGE

async function readReports() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const data = await fs.readFile(REPORTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function saveReports(reports) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    REPORTS_FILE,
    JSON.stringify(reports, null, 2),
    'utf8'
  );
}

// FILE UPLOAD

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const valid =
      file.originalname.toLowerCase().endsWith('.csv') ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel';

    if (valid) cb(null, true);
    else cb(new Error('Please upload a CSV file.'));
  }
});

// HEALTH CHECK

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: 'local-json-storage',
    ai: ai ? 'configured' : 'not-configured',
    app: 'DataTrust Lite'
  });
});

// CSV VALIDATION

app.post('/api/validate', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Choose a CSV file first.'
      });
    }

    let rules = {};

    try {
      rules = JSON.parse(req.body.rules || '{}');
    } catch {
      return res.status(400).json({
        message: 'Validation rules must be valid JSON.'
      });
    }

    const csv = req.file.buffer
      .toString('utf8')
      .replace(/^\uFEFF/, '');

    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: false
    });

    if (!records.length) {
      return res.status(400).json({
        message: 'The CSV has no data rows.'
      });
    }

    const columns = Object.keys(records[0] || {});

    if (!columns.length || columns.some(c => !c.trim())) {
      return res.status(400).json({
        message: 'Invalid CSV column headers.'
      });
    }

    const result = validateRows(records, columns, rules);

    const report = {
      _id: randomUUID(),
      fileName: req.file.originalname,
      ...result,
      rules,
      createdAt: new Date().toISOString()
    };

    const reports = await readReports();
    reports.unshift(report);
    await saveReports(reports);

    res.status(201).json({
      message: 'CSV validated successfully.',
      report
    });

  } catch (error) {
    if (error.code?.startsWith('CSV_')) {
      return res.status(400).json({
        message: 'Invalid CSV structure. Check the number of columns.'
      });
    }

    next(error);
  }
});

// GET ALL REPORTS

app.get('/api/reports', async (_req, res, next) => {
  try {
    res.json(await readReports());
  } catch (error) {
    next(error);
  }
});

// GET SINGLE REPORT

app.get('/api/reports/:id', async (req, res, next) => {
  try {
    const reports = await readReports();

    const report = reports.find(
      item => item._id === req.params.id
    );

    if (!report) {
      return res.status(404).json({
        message: 'Report not found.'
      });
    }

    res.json(report);

  } catch (error) {
    next(error);
  }
});

// DELETE REPORT

app.delete('/api/reports/:id', async (req, res, next) => {
  try {
    const reports = await readReports();

    const updated = reports.filter(
      item => item._id !== req.params.id
    );

    if (updated.length === reports.length) {
      return res.status(404).json({
        message: 'Report not found.'
      });
    }

    await saveReports(updated);

    res.json({
      message: 'Report deleted successfully.'
    });

  } catch (error) {
    next(error);
  }
});

// GEMINI AI ASSISTANT - SHIELDBOT

app.post('/api/assistant/chat', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        message: 'Gemini API key is not configured.'
      });
    }

    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        message: 'Please enter a question.'
      });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `
You are ShieldBot, the intelligent AI assistant
inside DataTrust Lite.

Help users with:
- Missing values
- Duplicate records
- Invalid data formats
- CSV validation
- Data quality reports
- Data cleaning
- Data quality improvement

Give friendly, accurate and easy-to-understand answers.

User question: ${message.trim().slice(0, 4000)}
      `
    });

    res.json({
      success: true,
      reply: response.text
    });

  } catch (error) {
    console.error('Gemini Error:', error.message);

    res.status(500).json({
      message: 'Gemini could not generate a response. Please try again.',
      error: error.message
    });
  }
});

// ERROR HANDLING

app.use((error, _req, res, _next) => {
  console.error('Server Error:', error.message);

  res.status(
    error instanceof multer.MulterError ? 400 : 500
  ).json({
    message:
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_FILE_SIZE'
        ? 'Maximum file size is 5 MB.'
        : error.message || 'Internal server error.'
  });
});

// START SERVER WITHOUT WAITING FOR MONGODB

app.listen(PORT, () => {
  console.log('================================');
  console.log('  DataTrust Lite Backend');
  console.log('================================');
  console.log(`✓ API running: http://localhost:${PORT}`);
  console.log('✓ Storage: Local JSON');
  console.log(`✓ Gemini: ${ai ? 'Configured' : 'Not configured'}`);
  console.log('================================');
});