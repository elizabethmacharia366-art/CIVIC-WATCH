const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);

const logger = require('./utils/logger');
const errorHandler = require('./utils/errorHandle');

app.use(express.json());
app.use(logger);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));
