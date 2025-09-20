const express = require('express');
const pool = require('./db');
const insertStations = require('./fetchStations');
const cors = require('cors');
const { swaggerUi, specs } = require('./swagger');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());


// Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));


app.use((req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});


/**
 * @openapi
 * /stations/fetch:
 *   post:
 *     summary: Load station data from external API to DB
 *     tags:
 *       - Stations
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Stations loaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stations loaded from API"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to load stations
 */

app.post('/stations/fetch', async (req, res) => {
  try {
    await insertStations();
    res.json({ message: 'Stations loaded from API' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stations' });
  }
});


/**
 * @openapi
 * /stations/near:
 *   get:
 *     summary: Find a station near lat/lng
 *     tags:
 *       - Stations
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of nearest stations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   en_name:
 *                     type: string
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *                   distance:
 *                     type: number
 *       400:
 *         description: lat,lng required
 *       500:
 *         description: Server error
 */

app.get('/stations/near', async (req, res) => {
  try {
    const { lat, lng, limit } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat,lng required' });

    const q = `
      SELECT name, en_name, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng,
             ST_Distance(geom, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance
      FROM stations
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1,$2),4326)::geography
      LIMIT $3
    `;
    const result = await pool.query(q, [parseFloat(lng), parseFloat(lat), parseInt(limit) || 10]);
    res.json(result.rows);

    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @openapi
 * /stations/near/paginate:
 *   get:
 *     summary: Find a station near lat/lng with pagination
 *     tags:
 *       - Stations
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: List of nearest stations with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   en_name:
 *                     type: string
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *                   distance:
 *                     type: number
 *       400:
 *         description: lat,lng required
 *       500:
 *         description: Server error
 */

app.get('/stations/near/paginate', async (req, res) => {
  try {
    const { lat, lng, limit, page } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat,lng required' });

    const l = parseInt(limit) || 10;
    const p = parseInt(page) || 1;
    const offset = (p - 1) * l;

    const q = `
      SELECT name, en_name, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng,
             ST_Distance(geom, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance
      FROM stations
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1,$2),4326)::geography
      LIMIT $3 OFFSET $4
    `;
    const result = await pool.query(q, [parseFloat(lng), parseFloat(lat), l, offset]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
