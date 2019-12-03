//
// Copyright (C) 2019 Protonex LLC dba PNI Sensor
//
//     This program is free software: you can redistribute it and/or modify
//     it under the terms of the GNU General Public License as published by
//     the Free Software Foundation, either version 3 of the License, or
//     (at your option) any later version.
//
//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//     GNU General Public License for more details.
//
//     You should have received a copy of the GNU General Public License
//     along with this program.  If not, see <https://www.gnu.org/licenses/>.
//

'use strict';

/* Imports */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const BaseRouter = require('./routers');
const ErrorMiddleware = require('./lib/ErrorMiddleware');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());

const useSchema = (schema) => (...args) => swaggerUi.setup(schema)(...args);
app.use('/internal-api-docs/v1', swaggerUi.serve, useSchema(YAML.load('./swagger/swagger-internal.yaml')));
app.use('/api-docs/v1', swaggerUi.serve, useSchema(YAML.load('./swagger/swagger-public.yaml')));

app.use('/', BaseRouter());

// Catch all for any other unused routes!
app.use('*', (req, res) => {
    res.status(404).send('Method not found.');
});

// Catch all error handler.
app.use(ErrorMiddleware);

/**
 * Express app instance. */
module.exports = app;
