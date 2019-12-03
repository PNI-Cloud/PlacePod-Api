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
const MongoDb = require('./MongoDb');
const { Client } = require('../../models');

/**
 * MongoDb implementation of Client related database operations. */
class ClientDb {
    /**
     * Get all clients that match the given filter options.
     * @param {object} filters : Filter options.
     *  @param {string} filters.scope : Filter by client's scope field.
     * @public */
    async find(filters = { }) {
        const filterQuery = { };
        if (typeof filters.scope === 'string') {
            filterQuery.scope = filters.scope;
        }

        try {
            const clients = await new Promise((resolve, reject) => {
                MongoDb.clients.find(filterQuery).toArray((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
            return this.clientFactory(clients);
        } catch (ex) {
            console.error('ClientDb.find() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Find and return the client that matches the provided client id. Return null
     * if the client doesn't exist.
     * @param {string} clientId : Unique identifier of the client to find.
     * @public */
    async findOne(clientId) {
        try {
            const client = await new Promise((resolve, reject) => {
                MongoDb.clients.findOne({ id: clientId }, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
            if (!client) {
                return null;
            }
            return this.clientFactory([client])[0];
        } catch (ex) {
            console.error('ClientDb.findOne() mongodb error: ', ex);
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
        const client = {
            id: params.id,
            secret: params.secret,
            scope: params.scope,
            email: params.email,
            createdAt: new Date().toISOString(),
        };

        try {
            await new Promise((resolve, reject) => {
                MongoDb.clients.insertOne(client, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res.insertedId);
                    }
                });
            });
            return params.id;
        } catch (ex) {
            console.error('ClientDb.create() mongodb error: ', ex);
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
        const updates = { };
        if (typeof clientUpdates.secret === 'string') {
            updates.secret = clientUpdates.secret;
        }
        if (typeof clientUpdates.email === 'string') {
            updates.email = clientUpdates.email;
        }

        if (!Object.keys(updates).length) {
            return;
        }

        try {
            await new Promise((resolve, reject) => {
                MongoDb.clients.updateOne({ id }, { $set: updates }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (ex) {
            console.error('ClientDb.update() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Convert the raw MongoDb objects into client objects.
     * @param {object[]} clients : Array of raw client objects from MongoDb
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
            createdAt: new Date(client.createdAt),
        }));
    }
}

module.exports = new ClientDb();
