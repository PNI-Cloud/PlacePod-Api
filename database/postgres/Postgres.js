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
const { Pool } = require('pg');
const Tables = require('./tables');

const pool = new Pool({ connectionString: process.env.POSTGRES_CONNECTION });
pool.on('error', (err) => {
    console.error('Postgres encountered an error: ', err);
});

/**
 * Wrapper class around 'pg' module. Abstract the pool away. */
class Postgres {
    /**
     * Make a query request. Return the rows if the query should have those.
     * @param {object|string} query : The query to perform on the database.
     * @returns {Promise<object[]?>}
     * @public */
    query(query) {
        return new Promise((resolve, reject) => {
            pool.query(query, (err, res) => {
                if (err) {
                    reject(new Error(`Postgres error: ${err}`));
                } else {
                    resolve(res.rows || null);
                }
            });
        });
    }

    /**
     * Returns the underlying postgres 'client'.
     * @public */
    getClient() {
        return pool;
    }

    /**
     * Run this method on app startup to ensure that postres will properly function.
     * @public */
    async setup() {
        if (!process.env.POSTGRES_CONNECTION) {
            throw new Error('Missing environment variable "POSTGRES_CONNECTION".');
        }

        console.log('Connecting to Postgres...');
        await new Promise((resolve, reject) => {
            pool.connect((err, client, done) => {
                if (err) {
                    reject(new Error(`Cannot connect to Postgres: ${err}`));
                } else {
                    console.log('Connected to Postgres!');
                    done();
                    resolve();
                }
            });
        });

        const queries = [
            Tables.Client,
            Tables.AccessToken,
            Tables.ParkingLot,
            Tables.Sensor,
            Tables.SensorLog,
            Tables.Lane,
        ];

        // This can error if a table that depends on another ends up being created first,
        // so do it sequentially.
        for (const query of queries) {
            // eslint-disable-next-line no-await-in-loop
            await pool.query(query);
        }
    }
}

module.exports = new Postgres();
