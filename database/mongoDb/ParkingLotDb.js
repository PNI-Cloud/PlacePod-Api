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
const { ParkingLot } = require('../../models');
/** @typedef {import('../../models/Caller')} Caller */

/**
 * MongoDb implementation of parking lot related database operations. */
class ParkingLotDb {
    /**
     * Check to see if the parking lot exists for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the parking lot to check.
     * @public */
    async exists(caller, id) {
        return !!(await this.findOne(caller, id));
    }

    /**
     * Returns all parking lots for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @public */
    async find(caller) {
        try {
            const lots = await new Promise((resolve, reject) => {
                MongoDb.parkingLots
                    .find({ clientId: caller.clientId })
                    .sort({ createdAt: -1 })
                    .toArray((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    });
            });
            return this.parkingLotFactory(lots);
        } catch (ex) {
            console.error('ParkingLotDb.find() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Returns the parking lot that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the parking lot to get.
     * @public */
    async findOne(caller, id) {
        const filter = { clientId: caller.clientId, _id: MongoDb.objectId(id) };

        try {
            const parkingLot = await new Promise((resolve, reject) => {
                MongoDb.parkingLots.findOne(filter, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
            if (!parkingLot) {
                return null;
            }

            return this.parkingLotFactory([parkingLot])[0];
        } catch (ex) {
            console.error('ParkingLotDb.findOne() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Attempt to create a new parking lot using the given parameters.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {object} newLot : Parameters for creating a parking lot.
     *  @param {string} newLot.name
     *  @param {number} newLot.totalSpaces
     *  @param {number} newLot.count
     * @returns {Promise<string>}
     * @public */
    async create(caller, newLot) {
        const lot = {
            clientId: caller.clientId,
            createdAt: new Date().toISOString(),
            name: newLot.name,
            totalSpaces: newLot.totalSpaces || null,
            count: newLot.count || 0,
        };

        try {
            const id = await new Promise((resolve, reject) => {
                MongoDb.parkingLots.insertOne(lot, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res.insertedId);
                    }
                });
            });
            return id;
        } catch (ex) {
            console.error('ParkingLotDb.create() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Update the parking lot that matches the given id. Pass `count` to set the count value to
     * that specific value. Pass `change` to increment count by that amout (vehicle counting).
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the parking lot to update.
     * @param {object} lotUpdates : Updates to be applied.
     *  @param {string} lotUpdates.name
     *  @param {number} lotUpdates.totalSpaces
     *  @param {number} lotUpdates.count
     *  @param {number} lotUpdates.change
     * @public */
    async update(caller, id, lotUpdates) {
        const updates = { };
        let increment = null;
        if (typeof lotUpdates.name === 'string') {
            updates.name = lotUpdates.name;
        }
        if (typeof lotUpdates.totalSpaces === 'number') {
            updates.totalSpaces = lotUpdates.totalSpaces;
        }
        if (typeof lotUpdates.count === 'number') {
            updates.count = lotUpdates.count;
        } else if (typeof lotUpdates.change === 'number') {
            increment = lotUpdates.change;
        }

        const query = { };
        if (Object.keys(updates).length) {
            query.$set = updates;
        }
        if (increment) {
            query.$inc = { count: increment };
        }
        if (!Object.keys(query).length) {
            return;
        }

        const filter = { clientId: caller.clientId, _id: MongoDb.objectId(id) };

        try {
            await new Promise((resolve, reject) => {
                MongoDb.parkingLots.updateOne(filter, query, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (ex) {
            console.error('ParkingLotDb.update() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Deletes the parking lot that matches the given id. The lot should have
     * no sensors/lanes associated with it.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the parking lot to delete.
     * @public */
    async delete(caller, id) {
        const filter = { clientId: caller.clientId, _id: MongoDb.objectId(id) };
        try {
            await new Promise((resolve, reject) => {
                MongoDb.parkingLots.deleteOne(filter, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (ex) {
            console.error('ParkingLotDb.delete() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Convert the raw mongodb objects into sensor objects.
     * @param {object[]} lots : Array of raw sensor objects from mongodb.
     * @private */
    parkingLotFactory(lots) {
        if (!lots || !lots.length) {
            return [];
        }

        return lots.map((lot) => new ParkingLot({
            id: lot._id,
            clientId: lot.clientId,
            createdAt: new Date(lot.createdAt),
            name: lot.name,
            totalSpaces: lot.totalSpaces,
            count: lot.count,
        }));
    }
}

module.exports = new ParkingLotDb();
