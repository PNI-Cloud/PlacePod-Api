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
 * Represents an API Access Token used for OAuth2. */
class AccessToken {
    /**
     * Create a new access token object.
     * @param {{
     *  value: string,
     *  expiresAt: Date,
     *  scope: string,
     *  clientId: string,
     *  createdAt: Date,
     * }} params : Initialization parameters.
     * */
    constructor(params) {
        /**
         * The actual token value. This should be unique. */
        this.value = params.value;

        /**
         * When the access token will no longer be valid at. */
        this.expiresAt = params.expiresAt;

        /**
         * The scope this token is able to access. */
        this.scope = params.scope;

        /**
         * The id of the client that owns this token. */
        this.clientId = params.clientId;

        /**
         * The date this object was created at. */
        this.createdAt = params.createdAt;
    }
}

module.exports = AccessToken;
