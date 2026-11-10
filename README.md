# DataTrust Lite

A React + Vite frontend and Node.js + Express + MongoDB backend for CSV data-quality validation.

## Features

- CSV upload (up to 5 MB), drag-and-drop, and a small data preview
- Automatic missing-value and duplicate checks
- Column format validation (auto, text, number, email, date)
- Data-quality score, valid/invalid row counts, searchable issue details
- Saved report history in MongoDB
- Downloadable CSV error report
- Responsive dark purple workspace with a collapsible sidebar and restrained cybersecurity artwork

## Requirements

- Node.js 18 or newer
- A MongoDB Atlas connection string or a local MongoDB server

## Setup

1. Extract the ZIP.
2. Open a terminal in the `DataTrust-Lite` folder.
3. Install the root runner and both app dependencies:

   ```bash
   npm install
   npm run install:all
   ```

4. Create `backend/.env` by copying `backend/.env.example`.
5. Edit `backend/.env` and set your MongoDB connection string and database-user password:

   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<database-user>:<URL-encoded-password>@<your-cluster-host>/datatrust_lite
   CLIENT_ORIGIN=http://localhost:5174
   ```

   Do not share or commit this file. Keep the real password private. If a database password has been exposed, rotate it in MongoDB Atlas and update this value.

6. Start both servers from the project root:

   ```bash
   npm run dev
   ```

7. Open **http://localhost:5174**. The backend health check is **http://localhost:5000/api/health**.

## Notes

- Keep the terminal running while using the application.
- The frontend uses port 5174 and the API uses port 5000.
- CSV contents are processed in memory by the API; report summaries and validation issues are stored in MongoDB.
- The supplied `.env` file is intentionally not included in this project archive. Create it locally from `.env.example`.
