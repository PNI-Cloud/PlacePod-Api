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
const { SensorLog } = require('../../models');
/** @typedef {import('../../models/Caller')} Caller */
/** @typedef {import('../../models/SensorState')} SensorState */

/**
 * Postgres implementation of Sensor Log related database operations. */
class SensorLogDb {
    /**
     * Get all sensor logs for the user that fit within the filters.
     * Do NOT return existing logs for sensors that have been removed.
     * Do NOT return logs with a status of -1, they are non-critical uplinks.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {object} options : Query options including:
     *  @param {Date} options.startTime : Starting date-time to get logs.
     *  @param {Date} options.endTime : Ending date-time to get logs.
     *  @param {number} options.limit : Maximum number of logs to return.
     * @param {object} filters : Filtering options. If none are included then get all
     * logs for existing sensors. Options include:
     *  @param {string} filters.sensorId : Filter by specific sensor.
     *  @param {string} filters.parkingLotId : Filter by sensors within the given lot.
     *  @param {string} filters.laneId : Filter by sensors within the given lane.
     * @public */
    async find(caller, options, filters = { }) {
        const values = [caller.clientId, options.startTime, options.endTime, options.limit];

        let filterQuery = '';
        let joinQuery = '';

        if (filters.sensorId) {
            values.push(filters.sensorId);
            filterQuery += `AND sensor_id = $${values.length} `;
        }

        if (filters.parkingLotId) {
            values.push(filters.parkingLotId);

            joinQuery += `
                LEFT JOIN
                    sensor AS s
                ON
                    sl.client_id = s.client_id AND sl.sensor_id = s.id`;
            filterQuery += `AND CAST(s.parking_lot_id AS TEXT) = $${values.length} `;
        }

        if (filters.laneId) {
            values.push(filters.laneId);

            joinQuery += `
                LEFT JOIN
                    lane AS l
                ON
                    sl.client_id = l.client_id AND (sl.sensor_id = l.front_id OR sl.sensor_id = l.back_id)`;
            filterQuery += `AND CAST(l.id AS TEXT) = $${values.length} `;
        }

        if (!filterQuery) {
            joinQuery += `
                LEFT JOIN
                    sensor AS s
                ON
                    sl.client_id = s.client_id AND sl.sensor_id = s.id`;
            filterQuery += 'AND s.id IS NOT NULL ';
        }

        const query = {
            text: `
                SELECT
                    sl.sensor_id,
                    sl.client_id,
                    sl.server_time,
                    sl.gateway_time,
                    sl.raw_payload,
                    sl.frame_count,
                    sl.rssi,
                    sl.snr,
                    sl.gateway_id,
                    sl.frequency,
                    sl.data_rate,
                    sl.port,
                    sl.status,
                    sl.mode,
                    sl.keep_alive,
                    sl.temperature,
                    sl.battery,
                    sl.error_register,
                    sl.error_state
                FROM
                    sensor_log AS sl
                ${joinQuery}
                WHERE
                    sl.client_id = $1
                AND
                    sl.server_time >= $2
                AND
                    sl.server_time <= $3
                AND
                    sl.status != -1
                ${filterQuery}
                ORDER BY
                    sl.server_time DESC
                LIMIT
                    $4;`,
            values,
        };

        try {
            const logs = await Postgres.query(query);
            return this.sensorLogFactory(logs);
        } catch (ex) {
            console.error('SensorLogDb.find() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Attempt to create and insert a new sensor log record.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {SensorState} sensorState : Object containing the new sensor log's data.
     * @returns {Promise<string?>}
     * @public */
    async create(caller, sensorState) {
        const query = {
            text: `
                INSERT INTO
                    sensor_log (
                        sensor_id,
                        client_id,
                        server_time,
                        gateway_time,
                        raw_payload,
                        frame_count,
                        rssi,
                        snr,
                        gateway_id,
                        frequency,
                        data_rate,
                        port,
                        status,
                        mode,
                        keep_alive,
                        battery,
                        temperature,
                        error_register,
                        error_state
                    )
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING
                    CAST(id AS TEXT);`,
            values: [
                sensorState.sensorId.toLowerCase(),
                caller.clientId,
                sensorState.serverTime,
                sensorState.gatewayTime,
                sensorState.rawPayload.toUpperCase(),
                sensorState.frameCount,
                sensorState.rssi,
                sensorState.snr,
                sensorState.gatewayId,
                sensorState.frequency,
                sensorState.dataRate,
                sensorState.port,
                sensorState.status,
                sensorState.mode,
                sensorState.keepAlive,
                sensorState.battery,
                sensorState.temperature,
                sensorState.errorRegister,
                sensorState.errorState,
            ],
        };

        try {
            const results = await Postgres.query(query);
            return (results && results.length) ? results[0].id : null;
        } catch (ex) {
            console.error('SensorLogDb.create() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Convert the raw postgres objects into sensor log objects.
     * @param {object[]} logs : Array of raw sensor log objects from postgres.
     * @private */
    sensorLogFactory(logs) {
        if (!logs || !logs.length) {
            return [];
        }

        return logs.map((log) => new SensorLog({
            sensorId: log.sensor_id,
            clientId: log.client_id,

            mode: log.mode,
            status: log.status,
            keepAlive: log.keep_alive,
            temperature: log.temperature,
            battery: log.battery,

            frameCount: log.frame_count,
            rssi: log.rssi,
            snr: log.snr,
            serverTime: log.server_time,
            gatewayTime: log.gateway_time,

            rawPayload: log.raw_payload,
            errorRegister: log.error_register,
            errorState: log.error_state,
            gatewayId: log.gateway_id,
            frequency: log.frequency,
            dataRate: log.data_rate,
            port: log.port,
        }));
    }
}

module.exports = new SensorLogDb();
