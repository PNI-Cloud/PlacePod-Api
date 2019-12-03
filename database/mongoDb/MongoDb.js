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
// eslint-disable-next-line import/no-extraneous-dependencies
const { MongoClient, ObjectId } = require('mongodb');

/**
 * @param {import('mongodb').Collection} collection
 * @param {object} index
 */
function createUniqueIndex(collection, index) {
    return new Promise((resolve, reject) => {
        collection.createIndex(index, { unique: true }, (error) => {
            if (error) {
                reject(new Error(error));
            } else {
                resolve();
            }
        });
    });
}

class MongoDb {
    async setup() {
        if (!process.env.MONGODB_CONNECTION) {
            throw new Error('Missing environment variable "MONGODB_CONNECTION".');
        }
        console.log('Connecting to MongoDb...');

        /** @type {import('mongodb').Db} */
        const db = await new Promise((resolve, reject) => {
            const options = { useNewUrlParser: true, useUnifiedTopology: true };
            MongoClient.connect(process.env.MONGODB_CONNECTION, options, (error, result) => {
                if (error) {
                    reject(Error(`Cannon connect to MongoDb: ${error}`));
                } else {
                    console.log('Connected to MongoDb!');
                    resolve(result.db());
                }
            });
        });

        // Make collections.
        this.clients = db.collection('clients');
        await createUniqueIndex(this.clients, { id: 1 });

        this.accessTokens = db.collection('accessTokens');
        await createUniqueIndex(this.accessTokens, { value: 1 });

        this.parkingLots = db.collection('parkingLots');

        this.sensors = db.collection('sensors');
        await createUniqueIndex(this.sensors, { clientId: 1, id: 1 });

        this.lanes = db.collection('lanes');

        this.sensorLogs = db.collection('sensorLogs');
    }

    objectId(id) {
        return new ObjectId(id);
    }
}

module.exports = new MongoDb();
