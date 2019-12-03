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
const { Sensor, Packet } = require('../../models');
/** @typedef {import('../../models/Caller')} Caller */
/** @typedef {import('../../models/SensorState')} SensorState */

/**
 * Postgres implementation of Sensor related database operations. */
class SensorDb {
    /**
     * Check to see if the sensor exists for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the sensor to check.
     * @public */
    async exists(caller, id) {
        const query = {
            text: `
                SELECT
                    id,
                    client_id
                FROM
                    sensor
                WHERE
                    id = $1
                AND
                    client_id = $2;`,
            values: [id.toLowerCase(), caller.clientId],
        };

        try {
            const sensors = await Postgres.query(query);
            return (sensors && sensors.length > 0);
        } catch (ex) {
            console.error('SensorDb.exists() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Returns all sensors for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {object} filters : Optional query filters.
     *  @param {string} filters.state : Either all vacant, occupied, or offline sensors.
     *  @param {string} filters.type : All sensors of the specified type.
     *  @param {string} filters.parkingLotId : All sensors who are assigned to the lot.
     *  @param {string} filters.laneId : All sensors who are assigned to the lane.
     * @param {number?} limit : Maximum number of sensors to return.
     * @public */
    async find(caller, filters = { }, limit = null) {
        const values = [caller.clientId];

        let filterQuery = '';
        if (filters.state) {
            switch (filters.state) {
                case Sensor.states.vacant:
                    filterQuery += `AND s.mode = '${Sensor.modes.presence}' AND s.status = 0 `;
                    break;

                case Sensor.states.occupied:
                    filterQuery += `AND s.mode = '${Sensor.modes.presence}' AND s.status = 1 `;
                    break;

                case Sensor.states.offline: {
                    const now = new Date();
                    const yesterday = new Date(now.setDate(now.getDate() - 1)).toISOString();
                    filterQuery += `AND s.server_time < '${yesterday}' `;
                    break;
                }

                default:
                    console.error(`Unhandled sensor 'state' filter given: '${filters.state}'.`);
                    break;
            }
        }

        if (filters.type) {
            values.push(filters.type);
            filterQuery += `AND s.type = $${values.length} `;
        }

        if (filters.parkingLotId) {
            values.push(filters.parkingLotId);
            filterQuery += `AND CAST(s.parking_lot_id AS TEXT) = $${values.length} `;
        }

        let joinQuery = '';
        if (filters.laneId) {
            values.push(filters.laneId);
            joinQuery += `
                LEFT JOIN
                    lane AS l
                ON
                    s.client_id = l.client_id AND (s.id = l.front_id OR s.id = l.back_id)`;
            filterQuery += `AND CAST(l.id AS TEXT) = $${values.length} `;
        }

        let limitQuery = '';
        if (limit) {
            values.push(limit);
            limitQuery = `LIMIT $${values.length}`;
        }

        const query = {
            text: `
                SELECT
                    s.id,
                    s.client_id,
                    s.created_at,
                    s.name,
                    s.type,
                    CAST(s.parking_lot_id AS TEXT),
                    s.mode,
                    s.status,
                    s.temperature,
                    s.battery,
                    s.rssi,
                    s.snr,
                    s.frame_count,
                    s.port,
                    s.server_time,
                    s.gateway_time,
                    s.frequency,
                    s.data_rate,
                    s.error_register,
                    s.error_state
                FROM
                    sensor AS s
                ${joinQuery}
                WHERE
                    s.client_id = $1
                ${filterQuery}
                ORDER BY
                    s.created_at DESC
                ${limitQuery};`,
            values,
        };

        try {
            const sensors = await Postgres.query(query);
            return this.sensorFactory(sensors);
        } catch (ex) {
            console.error('SensorDb.find() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Returns the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the sensor to get.
     * @public */
    async findOne(caller, id) {
        const query = {
            text: `
                SELECT
                    id,
                    client_id,
                    created_at,
                    name,
                    type,
                    CAST(parking_lot_id AS TEXT),
                    mode,
                    status,
                    temperature,
                    battery,
                    rssi,
                    snr,
                    frame_count,
                    port,
                    server_time,
                    gateway_time,
                    frequency,
                    data_rate,
                    error_register,
                    error_state
                FROM
                    sensor
                WHERE
                    id = $1
                AND
                    client_id = $2;`,
            values: [id.toLowerCase(), caller.clientId],
        };

        try {
            const sensors = await Postgres.query(query);
            if (!sensors || !sensors.length) {
                return null;
            }
            return this.sensorFactory(sensors)[0];
        } catch (ex) {
            console.error('SensorDb.findOne() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Attempt to create a new sensor using the given parameters.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {object} newSensor : Parameters for creating a new sensor.
     *  @param {string} newSensor.id
     *  @param {string} newSensor.name
     *  @param {string} newSensor.type
     *  @param {string} newSensor.parkingLotId
     * @returns {Promise<string>}
     * @public */
    async create(caller, newSensor) {
        const id = newSensor.id.toLowerCase();
        const query = {
            text: `
                INSERT INTO
                    sensor (
                        id,
                        name,
                        type,
                        parking_lot_id,
                        client_id
                    )
                VALUES
                    ($1, $2, $3, $4, $5);`,
            values: [
                id,
                newSensor.name,
                newSensor.type,
                newSensor.parkingLotId || null,
                caller.clientId,
            ],
        };

        try {
            await Postgres.query(query);
            return id;
        } catch (ex) {
            console.error('SensorDb.create() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Update the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the sensor to update.
     * @param {object} sensorUpdates : Updates to be applied.
     *  @param {string} sensorUpdates.name
     *  @param {string} sensorUpdates.type
     *  @param {string} sensorUpdates.parkingLotId
     * @public */
    async update(caller, id, sensorUpdates) {
        const values = [id.toLowerCase(), caller.clientId];

        let updates = '';
        if (typeof sensorUpdates.name === 'string') {
            values.push(sensorUpdates.name);
            updates += `name = $${values.length}, `;
        }
        if (typeof sensorUpdates.type === 'string') {
            values.push(sensorUpdates.type);
            updates += `type = $${values.length}, `;
        }
        if (typeof sensorUpdates.parkingLotId === 'string') {
            values.push(sensorUpdates.parkingLotId);
            updates += `parking_lot_id = $${values.length}, `;
        }

        if (!updates) {
            return;
        }

        const query = {
            text: `
                UPDATE
                    sensor
                SET
                    ${updates.replace(/,\s*$/, '')}
                WHERE
                    id = $1
                AND
                    client_id = $2;`,
            values,
        };

        try {
            await Postgres.query(query);
        } catch (ex) {
            console.error('SensorDb.update() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Update the sensor's internal state based off of the decoded information.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {SensorState} sensorState : Object containing the sensor's updated state.
     * @public */
    async updateState(caller, sensorState) {
        // Have a default packet.
        const packet = new Packet();

        const values = [
            sensorState.sensorId.toLowerCase(),
            caller.clientId,
            sensorState.serverTime,
            sensorState.gatewayTime,
            sensorState.errorRegister,
            sensorState.errorState,
        ];

        let updates = '';
        if (typeof sensorState.frameCount === 'number') {
            values.push(sensorState.frameCount);
            updates += `frame_count = $${values.length}, `;
        }
        if (typeof sensorState.rssi === 'number') {
            values.push(sensorState.rssi);
            updates += `rssi = $${values.length}, `;
        }
        if (typeof sensorState.snr === 'number') {
            values.push(sensorState.snr);
            updates += `snr = $${values.length}, `;
        }
        if (typeof sensorState.frequency === 'number') {
            values.push(sensorState.frequency);
            updates += `frequency = $${values.length}, `;
        }
        if (typeof sensorState.dataRate === 'string') {
            values.push(sensorState.dataRate);
            updates += `data_rate = $${values.length}, `;
        }
        if (typeof sensorState.port === 'number') {
            values.push(sensorState.port);
            updates += `port = $${values.length}, `;
        }
        if (
            typeof sensorState.status === 'number'
            && sensorState.status !== packet.status
        ) {
            values.push(sensorState.status);
            updates += `status = $${values.length}, `;
        }
        if (
            typeof sensorState.mode === 'string'
            && sensorState.mode !== packet.mode
        ) {
            values.push(sensorState.mode);
            updates += `mode = $${values.length}, `;
        }
        if (typeof sensorState.battery === 'number') {
            values.push(sensorState.battery);
            updates += `battery = $${values.length}, `;
        }
        if (typeof sensorState.temperature === 'number') {
            values.push(sensorState.temperature);
            updates += `temperature = $${values.length}, `;
        }

        const query = {
            text: `
                UPDATE
                    sensor
                SET
                    ${updates}
                    server_time = $3,
                    gateway_time = $4,
                    error_register = $5,
                    error_state = $6
                WHERE
                    id = $1
                AND
                    client_id = $2;`,
            values,
        };

        try {
            await Postgres.query(query);
        } catch (ex) {
            console.error('SensorDb.updateState() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Deletes the sensor that matches the given id. This SHOULDNT remove history logs.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the sensor to delete.
     * @public */
    async delete(caller, id) {
        const query = {
            text: `
                DELETE FROM
                    sensor
                WHERE
                    id = $1
                AND
                    client_id = $2;`,
            values: [id.toLowerCase(), caller.clientId],
        };

        try {
            await Postgres.query(query);
        } catch (ex) {
            console.error('SensorDb.delete() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Convert the raw postgres objects into sensor objects.
     * @param {object[]} sensors : Array of raw sensor objects from postgres.
     * @private */
    sensorFactory(sensors) {
        if (!sensors || !sensors.length) {
            return [];
        }

        return sensors.map((sensor) => new Sensor({
            id: sensor.id,
            clientId: sensor.client_id,
            createdAt: sensor.created_at,
            name: sensor.name,
            type: sensor.type,
            parkingLotId: sensor.parking_lot_id,
            mode: sensor.mode,
            status: sensor.status,
            temperature: sensor.temperature,
            battery: sensor.battery,
            rssi: sensor.rssi,
            snr: sensor.snr,
            frameCount: sensor.frame_count,
            port: sensor.port,
            serverTime: sensor.server_time,
            gatewayTime: sensor.gateway_time,
            frequency: sensor.frequency,
            dataRate: sensor.data_rate,
            errorRegister: sensor.error_register,
            errorState: sensor.error_state,
        }));
    }
}

module.exports = new SensorDb();
