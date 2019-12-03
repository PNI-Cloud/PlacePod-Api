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
const { Lane } = require('../../models');
/** @typedef {import('../../models/Caller')} Caller */
/** @typedef {import('../../lib/pni-vehicle-counting/Service').State} State */

/**
 * MongoDb implementation of lane (driveway) related database operations. */
class LaneDb {
    /**
     * Check to see if the lane exists for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the lane to check.
     * @public */
    async exists(caller, id) {
        return !!(await this.findOne(caller, id));
    }

    /**
     * Returns all lanes for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {object} filters : Optional query filters including:
     *  @param {string} filters.sensorId : All lanes who have that sensor in them.
     *  @param {string} filters.parkingLotId : All lanes who are assigned to the lot.
     * @param {number?} limit : Maximum number of sensors to return.
     * @public */
    async find(caller, filters = { }, limit = null) {
        const filterQuery = { clientId: caller.clientId };
        if (filters.sensorId) {
            filterQuery.$or = [
                { frontId: filters.sensorId.toLowerCase() },
                { backId: filters.sensorId.toLowerCase() },
            ];
        }
        if (filters.parkingLotId) {
            filterQuery.parkingLotId = filters.parkingLotId;
        }

        try {
            const lots = await new Promise((resolve, reject) => {
                let cursor = MongoDb.lanes
                    .find(filterQuery)
                    .sort({ createdAt: -1 });

                if (limit) {
                    cursor = cursor.limit(limit);
                }
                cursor.toArray((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
            return this.laneFactory(lots);
        } catch (ex) {
            console.error('LaneDb.find() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Returns the lane that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the lane to get.
     * @public */
    async findOne(caller, id) {
        const filter = { clientId: caller.clientId, _id: MongoDb.objectId(id) };

        try {
            const lane = await new Promise((resolve, reject) => {
                MongoDb.lanes.findOne(filter, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
            if (!lane) {
                return null;
            }

            return this.laneFactory([lane])[0];
        } catch (ex) {
            console.error('LaneDb.findOne() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Attempt to create a new lane using the given parameters.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {object} newLane : Parameters for creating a lane.
     *  @param {string} newLane.name
     *  @param {string} newLane.frontId
     *  @param {string} newLane.backId
     *  @param {string} newLane.parkingLotId
     *  @param {number} newLane.count
     *  @param {boolean} newLane.direction
     * @returns {Promise<string>}
     * @public */
    async create(caller, newLane) {
        const lane = {
            name: newLane.name,
            frontId: newLane.frontId.toLowerCase(),
            backId: newLane.backId.toLowerCase(),
            parkingLotId: newLane.parkingLotId,
            count: newLane.count || 0,
            direction: newLane.direction,
            clientId: caller.clientId,
            createdAt: new Date().toISOString(),
        };

        try {
            const id = await new Promise((resolve, reject) => {
                MongoDb.lanes.insertOne(lane, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res.insertedId);
                    }
                });
            });
            return id;
        } catch (ex) {
            console.error('LaneDb.create() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Update the lane that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the lane to update.
     * @param {object} laneUpdates : Updates to be applied.
     *  @param {string} laneUpdates.name
     *  @param {string} laneUpdates.frontId
     *  @param {string} laneUpdates.backId
     *  @param {string} laneUpdates.parkingLotId
     *  @param {boolean} laneUpdates.direction
     *  @param {number} laneUpdates.count
     *  @param {number} laneUpdates.timeout
     *  @param {{ front: State, back: State }} laneUpdates.state
     * @public */
    async update(caller, id, laneUpdates) {
        const updates = { };

        if (typeof laneUpdates.name === 'string') {
            updates.name = laneUpdates.name;
        }
        if (typeof laneUpdates.frontId === 'string') {
            updates.frontId = laneUpdates.frontId.toLowerCase();
        }
        if (typeof laneUpdates.backId === 'string') {
            updates.backId = laneUpdates.backId.toLowerCase();
        }
        if (typeof laneUpdates.parkingLotId === 'string') {
            updates.parkingLotId = laneUpdates.parkingLotId;
        }
        if (typeof laneUpdates.direction === 'boolean') {
            updates.direction = laneUpdates.direction;
        }
        if (typeof laneUpdates.count === 'number') {
            updates.count = laneUpdates.count;
        }
        if (typeof laneUpdates.timeout === 'number') {
            updates.timeout = laneUpdates.timeout;
        }
        if (laneUpdates.state) {
            updates.state = laneUpdates.state;
        }

        if (!Object.keys(updates).length) {
            return;
        }
        const filter = { clientId: caller.clientId, _id: MongoDb.objectId(id) };

        try {
            await new Promise((resolve, reject) => {
                MongoDb.lanes.updateOne(filter, { $set: updates }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (ex) {
            console.error('LaneDb.update() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Deletes the lane that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the lane to delete.
     * @public */
    async delete(caller, id) {
        const filter = { clientId: caller.clientId, _id: MongoDb.objectId(id) };
        try {
            await new Promise((resolve, reject) => {
                MongoDb.lanes.deleteOne(filter, (err) => {
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
     * Convert the raw postgres objects into lane objects.
     * @param {object[]} lanes : Array of raw lane objects from postgres.
     * @private */
    laneFactory(lanes) {
        if (!lanes || !lanes.length) {
            return [];
        }

        return lanes.map((lane) => new Lane({
            id: lane._id,
            clientId: lane.clientId,
            createdAt: new Date(lane.createdAt),
            name: lane.name,
            frontId: lane.frontId,
            backId: lane.backId,
            parkingLotId: lane.parkingLotId,
            count: lane.count,
            direction: lane.direction,
            timeout: lane.timeout,
            state: (typeof lane.state === 'string') ? JSON.parse(lane.state) : lane.state,
        }));
    }
}

module.exports = new LaneDb();
