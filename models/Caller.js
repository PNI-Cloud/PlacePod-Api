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

/** @typedef {import('./Client')} Client */

/**
 * Contains the authenticated user's context information. */
class Caller {
    /**
     * @param {{
     *  client: Client
     *  scope: string,
     * }} params : Contains initialization parameters.
     * */
    constructor(params) {
        /**
         * The id of the user'd client. */
        this.clientId = params.client.id;

        /**
         * The available scope for this user/client. */
        this.scope = params.scope;
    }
}

module.exports = Caller;
