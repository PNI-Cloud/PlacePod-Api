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
const { ParkingLot } = require('../../models');
/** @typedef {import('../../models/Caller')} Caller */

/**
 * Postgres implementation of parking lot related database operations. */
class ParkingLotDb {
    /**
     * Check to see if the parking lot exists for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the parking lot to check.
     * @public */
    async exists(caller, id) {
        const query = {
            text: `
                SELECT
                    CAST(id AS TEXT),
                    client_id
                FROM
                    parking_lot
                WHERE
                    CAST(id AS TEXT) = $1
                AND
                    client_id = $2;`,
            values: [id, caller.clientId],
        };

        try {
            const lots = await Postgres.query(query);
            return (lots && lots.length > 0);
        } catch (ex) {
            console.error('ParkingLotDb.exists() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Returns all parking lots for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @public */
    async find(caller) {
        const query = {
            text: `
                SELECT
                    CAST(id AS TEXT),
                    client_id,
                    name,
                    total_spaces,
                    count,
                    created_at
                FROM
                    parking_lot
                WHERE
                    client_id = $1
                ORDER BY
                    created_at DESC;`,
            values: [caller.clientId],
        };

        try {
            const lots = await Postgres.query(query);
            return this.parkingLotFactory(lots);
        } catch (ex) {
            console.error('ParkingLotDb.find() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Returns the parking lot that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the parking lot to get.
     * @public */
    async findOne(caller, id) {
        const query = {
            text: `
                SELECT
                    CAST(id AS TEXT),
                    client_id,
                    name,
                    total_spaces,
                    count,
                    created_at
                FROM
                    parking_lot
                WHERE
                    CAST(id AS TEXT) = $1
                AND
                    client_id = $2;`,
            values: [id, caller.clientId],
        };

        try {
            const lots = await Postgres.query(query);
            if (!lots || !lots.length) {
                return null;
            }
            return this.parkingLotFactory(lots)[0];
        } catch (ex) {
            console.error('ParkingLotDb.findOne() postgres error: ', ex);
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
        const query = {
            text: `
                INSERT INTO
                    parking_lot (
                        name,
                        total_spaces,
                        client_id,
                        count
                    )
                VALUES
                    ($1, $2, $3, $4)
                RETURNING
                    CAST(id AS TEXT);`,
            values: [
                newLot.name,
                newLot.totalSpaces,
                caller.clientId,
                newLot.count || 0,
            ],
        };

        try {
            const results = await Postgres.query(query);
            return (results && results.length) ? results[0].id : null;
        } catch (ex) {
            console.error('ParkingLotDb.create() postgres error: ', ex);
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
        const values = [id, caller.clientId];

        let updates = '';
        if (typeof lotUpdates.name === 'string') {
            values.push(lotUpdates.name);
            updates += `name = $${values.length}, `;
        }
        if (typeof lotUpdates.totalSpaces === 'number') {
            values.push(lotUpdates.totalSpaces);
            updates += `total_spaces = $${values.length}, `;
        }
        if (typeof lotUpdates.count === 'number') {
            values.push(lotUpdates.count);
            updates += `count = $${values.length}, `;
        } else if (typeof lotUpdates.change === 'number') {
            values.push(lotUpdates.change);
            updates += `count = count + $${values.length}, `;
        }

        if (!updates) {
            return;
        }

        const query = {
            text: `
                UPDATE
                    parking_lot
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
            console.error('ParkingLotDb.update() postgres error: ', ex);
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
        const query = {
            text: `
                DELETE FROM
                    parking_lot
                WHERE
                    CAST(id AS TEXT) = $1
                AND
                    client_id = $2;`,
            values: [id, caller.clientId],
        };

        try {
            await Postgres.query(query);
        } catch (ex) {
            console.error('ParkingLotDb.delete() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Convert the raw postgres objects into sensor objects.
     * @param {object[]} lots : Array of raw sensor objects from postgres.
     * @private */
    parkingLotFactory(lots) {
        if (!lots || !lots.length) {
            return [];
        }

        return lots.map((lot) => new ParkingLot({
            id: lot.id,
            clientId: lot.client_id,
            createdAt: lot.created_at,
            name: lot.name,
            totalSpaces: lot.total_spaces,
            count: lot.count,
        }));
    }
}

module.exports = new ParkingLotDb();
