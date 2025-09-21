const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Stations API',
      version: '1.0.0',
      description: 'API for stations data',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local dev' },
      { url: 'https://stations-api-mi8d.onrender.com', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        }
      }
    },
  },
  apis: ['./server.js'],
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
