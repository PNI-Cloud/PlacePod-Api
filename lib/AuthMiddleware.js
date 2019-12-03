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
const OAuthServer = require('./OAuthServer');

/**
 * Express app specific handlers to oauth2-server. */
class AuthMiddleware {
    /**
     * Express middleware authentication using oauth2-server.
     * @param {string?} requiredScope : Optional minimally required scope to access the method.
     * @param {object?} options : Optional options to be passed to the oauth2-server module. */
    handle(requiredScope = null, options = null) {
        return (req, res, next) => {
            OAuthServer.authenticate(req.headers, req.method, requiredScope, options)
                .then((caller) => {
                    console.log(`${new Date().toISOString()} Bearer valid for "${caller.clientId}", type: "${req.method}", route: "${req.originalUrl}".`);
                    res.locals.caller = caller;
                    next();
                })
                .catch((ex) => next(ex));
        };
    }
}

module.exports = AuthMiddleware;
