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
 * Represents a user. */
class Client {
    /**
     * Create a new client object.
     * @param {{
     *  id: string,
     *  secret: string,
     *  scope: string,
     *  email: string?,
     *  createdAt: Date,
     * }} params : Initialization parameters.
     * */
    constructor(params) {
        /**
         * Unique id of the client. */
        this.id = params.id;

        /**
         * The client's 'secret' value. This will probably be null. */
        this.secret = params.secret;

        /**
         * The scope available to the client. */
        this.scope = params.scope;

        /**
         * Oauth2 grants that the client can access. */
        this.grants = params.grants || ['client_credentials'];

        /**
         * Client's primary email address. */
        this.email = params.email;

        /**
         * The date this object was created at. */
        this.createdAt = params.createdAt;
    }
}

module.exports = Client;
