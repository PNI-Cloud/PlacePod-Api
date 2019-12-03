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
const { Lane } = require('../../models');
/** @typedef {import('../../models/Caller')} Caller */
/** @typedef {import('../../lib/pni-vehicle-counting/Service').State} State */

/**
 * Postgres implementation of lane (driveway) related database operations. */
class LaneDb {
    /**
     * Check to see if the lane exists for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the lane to check.
     * @public */
    async exists(caller, id) {
        const query = {
            text: `
                SELECT
                    CAST(id AS TEXT),
                    client_id
                FROM
                    lane
                WHERE
                    CAST(id AS TEXT) = $1
                AND
                    client_id = $2;`,
            values: [id, caller.clientId],
        };

        try {
            const lanes = await Postgres.query(query);
            return (lanes && lanes.length > 0);
        } catch (ex) {
            console.error('LaneDb.exists() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
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
        const values = [caller.clientId];

        let filterQuery = '';
        if (filters.sensorId) {
            values.push(filters.sensorId.toLowerCase());
            filterQuery += `AND (front_id = $${values.length} OR back_id = $${values.length}) `;
        }

        if (filters.parkingLotId) {
            values.push(filters.parkingLotId);
            filterQuery += `AND CAST(parking_lot_id AS TEXT) = $${values.length} `;
        }

        let limitQuery = '';
        if (limit) {
            values.push(limit);
            limitQuery = `LIMIT $${values.length}`;
        }

        const query = {
            text: `
                SELECT
                    CAST(id AS TEXT),
                    client_id,
                    created_at,
                    name,
                    front_id,
                    back_id,
                    CAST(parking_lot_id AS TEXT),
                    count,
                    direction,
                    timeout,
                    state
                FROM
                    lane
                WHERE
                    client_id = $1
                ${filterQuery}
                ORDER BY
                    created_at DESC
                ${limitQuery};`,
            values,
        };

        try {
            const lanes = await Postgres.query(query);
            return this.laneFactory(lanes);
        } catch (ex) {
            console.error('LaneDb.find() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Returns the lane that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the lane to get.
     * @public */
    async findOne(caller, id) {
        const query = {
            text: `
                SELECT
                    CAST(id AS TEXT),
                    client_id,
                    created_at,
                    name,
                    front_id,
                    back_id,
                    CAST(parking_lot_id AS TEXT),
                    count,
                    direction,
                    timeout,
                    state
                FROM
                    lane
                WHERE
                    CAST(id AS TEXT) = $1
                AND
                    client_id = $2;`,
            values: [id, caller.clientId],
        };

        try {
            const lanes = await Postgres.query(query);
            if (!lanes || !lanes.length) {
                return null;
            }
            return this.laneFactory(lanes)[0];
        } catch (ex) {
            console.error('LaneDb.findOne() postgres error: ', ex);
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
        const query = {
            text: `
                INSERT INTO
                    lane (
                        client_id,
                        name,
                        front_id,
                        back_id,
                        parking_lot_id,
                        count,
                        direction
                    )
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                RETURNING
                    CAST(id AS TEXT);`,
            values: [
                caller.clientId,
                newLane.name,
                newLane.frontId.toLowerCase(),
                newLane.backId.toLowerCase(),
                newLane.parkingLotId,
                newLane.count || 0,
                newLane.direction,
            ],
        };

        try {
            const results = await Postgres.query(query);
            return (results && results.length) ? results[0].id : null;
        } catch (ex) {
            console.error('LaneDb.create() postgres error: ', ex);
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
        const values = [id, caller.clientId];

        let updates = '';
        if (typeof laneUpdates.name === 'string') {
            values.push(laneUpdates.name);
            updates += `name = $${values.length}, `;
        }
        if (typeof laneUpdates.frontId === 'string') {
            values.push(laneUpdates.frontId.toLowerCase());
            updates += `front_id = $${values.length}, `;
        }
        if (typeof laneUpdates.backId === 'string') {
            values.push(laneUpdates.backId.toLowerCase());
            updates += `back_id = $${values.length}, `;
        }
        if (typeof laneUpdates.parkingLotId === 'string') {
            values.push(laneUpdates.parkingLotId);
            updates += `parking_lot_id = $${values.length}, `;
        }
        if (typeof laneUpdates.direction === 'boolean') {
            values.push(laneUpdates.direction);
            updates += `direction = $${values.length}, `;
        }
        if (typeof laneUpdates.count === 'number') {
            values.push(laneUpdates.count);
            updates += `count = $${values.length}, `;
        }
        if (typeof laneUpdates.timeout === 'number') {
            values.push(laneUpdates.timeout);
            updates += `timeout = $${values.length}, `;
        }
        if (laneUpdates.state) {
            values.push(laneUpdates.state);
            updates += `state = $${values.length}, `;
        }

        if (!updates) {
            return;
        }

        const query = {
            text: `
                UPDATE
                    lane
                SET
                    ${updates.replace(/,\s*$/, '')}
                WHERE
                    CAST(id AS TEXT) = $1
                AND 
                    client_id = $2;`,
            values,
        };

        try {
            await Postgres.query(query);
        } catch (ex) {
            console.error('LaneDb.update() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Deletes the lane that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the lane to delete.
     * @public */
    async delete(caller, id) {
        const query = {
            text: `
                DELETE FROM
                    lane
                WHERE
                    CAST(id AS TEXT) = $1
                AND
                    client_id = $2;`,
            values: [id, caller.clientId],
        };

        try {
            await Postgres.query(query);
        } catch (ex) {
            console.error('LaneDb.delete() postgres error: ', ex);
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
            id: lane.id,
            clientId: lane.client_id,
            createdAt: lane.created_at,
            name: lane.name,
            frontId: lane.front_id,
            backId: lane.back_id,
            parkingLotId: lane.parking_lot_id,
            count: lane.count,
            direction: lane.direction,
            timeout: lane.timeout,
            state: lane.state,
        }));
    }
}

module.exports = new LaneDb();
