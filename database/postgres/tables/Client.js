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
 * Running this query will attempt to create the 'client' table if it doesn't exist. */
module.exports = `CREATE TABLE IF NOT EXISTS
    client (
        id          TEXT NOT NULL,
        secret      TEXT NOT NULL,
        scope       TEXT NOT NULL,
        email       TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT now(),

        PRIMARY KEY
            (id)
    );`;
