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

/**
 * Running this query will attempt to create the 'sensor_log' table if it doesn't exist.
 * The foreign key isn't `(sensor_id, client_id) REFERENCES sensor (id, client_id)`
 * so that logs will persist even if their sensor is removed. */
module.exports = `CREATE TABLE IF NOT EXISTS
    sensor_log (
        id              SERIAL,
        sensor_id       TEXT NOT NULL,
        client_id       TEXT NOT NULL,
        server_time     TIMESTAMPTZ DEFAULT now(),
        gateway_time    TIMESTAMPTZ DEFAULT now(),
        raw_payload     TEXT NOT NULL,
        frame_count     INT,
        rssi            REAL,
        snr             REAL,
        gateway_id      TEXT,
        frequency       REAL,
        data_rate       TEXT,
        port            INT,
        mode            TEXT,
        status          SMALLINT,
        keep_alive      BOOL DEFAULT false,
        temperature     REAL,
        battery         REAL,
        error_register  SMALLINT,
        error_state     SMALLINT,

        PRIMARY KEY
            (id, sensor_id, client_id),

        FOREIGN KEY
            (client_id)
        REFERENCES
            client (id)
    );`;
