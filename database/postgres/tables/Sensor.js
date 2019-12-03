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
 * Running this query will attempt to create the 'sensor' table if it doesn't exist. */
module.exports = `CREATE TABLE IF NOT EXISTS
    sensor (
        id              TEXT NOT NULL,
        client_id       TEXT NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT now(),
        name            TEXT NOT NULL,
        type            TEXT,
        parking_lot_id  INT,
        mode            TEXT,
        status          INT,
        temperature     REAL,
        battery         REAL,
        rssi            REAL,
        snr             REAL,
        frame_count     BIGINT,
        port            INT,
        server_time     TIMESTAMPTZ,
        gateway_time    TIMESTAMPTZ,
        frequency       REAL,
        data_rate       TEXT,
        error_register  SMALLINT,
        error_state     SMALLINT,

        PRIMARY KEY
            (id, client_id),

        FOREIGN KEY
            (parking_lot_id, client_id)
        REFERENCES parking_lot
            (id, client_id),

        FOREIGN KEY
            (client_id)
        REFERENCES
            client (id)
    );`;
