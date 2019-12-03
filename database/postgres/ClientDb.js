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
const Postgres = require('./Postgres');
const { Client } = require('../../models');

/**
 * Postgres implementation of Client related database operations. */
class ClientDb {
    /**
     * Get all clients that match the given filter options.
     * @param {object} filters : Filter options.
     *  @param {string} filters.scope : Filter by client's scope field.
     * @public */
    async find(filters = { }) {
        const values = [];

        let filterQuery = '';
        if (typeof filters.scope === 'string') {
            values.push(filters.scope);
            filterQuery += (!filterQuery) ? 'WHERE ' : 'AND ';
            filterQuery += `scope = $${values.length} `;
        }

        const query = {
            text: `
                SELECT
                    id,
                    secret,
                    scope,
                    email,
                    created_at
                FROM
                    client
                ${filterQuery};`,
            values,
        };

        try {
            const clients = await Postgres.query(query);
            return this.clientFactory(clients);
        } catch (ex) {
            console.error('ClientDb.find() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Find and return the client that matches the provided client id. Return null
     * if the client doesn't exist.
     * @param {string} clientId : Unique identifier of the client to find.
     * @public */
    async findOne(clientId) {
        const query = {
            text: `
                SELECT
                    id,
                    secret,
                    scope,
                    email,
                    created_at
                FROM
                    client
                WHERE
                    id = $1;`,
            values: [clientId],
        };

        try {
            const clients = await Postgres.query(query);
            if (!clients || !clients.length) {
                return null;
            }
            return this.clientFactory(clients)[0];
        } catch (ex) {
            console.error('ClientDb.findOne() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Create a new client in the database.
     * @param {object} params
     *  @param {string} params.id
     *  @param {string} params.secret
     *  @param {string} params.scope
     *  @param {string} params.email
     * @public */
    async create(params) {
        const query = {
            text: `
                INSERT INTO
                    client (
                        id,
                        secret,
                        scope,
                        email
                    )
                VALUES
                    ($1, $2, $3, $4);`,
            values: [
                params.id,
                params.secret,
                params.scope,
                params.email || '',
            ],
        };

        try {
            await Postgres.query(query);
            return params.id;
        } catch (ex) {
            console.error('ClientDb.findOne() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Update the existing client.
     * @param {string} id : The client to update.
     * @param {object} clientUpdates : Fields to update.
     *  @param {string} clientUpdates.secret
     *  @param {string} clientUpdates.email
     * @public */
    async update(id, clientUpdates) {
        const values = [id];

        let updates = '';
        if (typeof clientUpdates.secret === 'string') {
            values.push(clientUpdates.secret);
            updates += `secret = $${values.length}, `;
        }
        if (typeof clientUpdates.email === 'string') {
            values.push(clientUpdates.email);
            updates += `email = $${values.length}, `;
        }

        if (!updates) {
            return;
        }

        const query = {
            text: `
                UPDATE
                    client
                SET
                    ${updates.replace(/,\s*$/, '')}
                WHERE
                    id = $1`,
            values,
        };

        try {
            await Postgres.query(query);
        } catch (ex) {
            console.error('ClientDb.update() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Convert the raw postgres objects into client objects.
     * @param {object[]} clients : Array of raw client objects from postgres.
     * @private */
    clientFactory(clients) {
        if (!clients || !clients.length) {
            return [];
        }

        return clients.map((client) => new Client({
            id: client.id,
            secret: client.secret,
            scope: client.scope,
            email: client.email,
            createAt: client.created_at,
        }));
    }
}

module.exports = new ClientDb();
