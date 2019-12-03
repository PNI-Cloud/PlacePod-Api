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
const OAuth2Server = require('oauth2-server');
const OAuthModel = require('./OAuthModel');
const { ApiError, Caller } = require('../models');
const ScopeManager = require('./ScopeManager');

const oauth2Server = new OAuth2Server({ model: OAuthModel });

/**
 * Wrapper around the oath2-server module. */
module.exports = {
    /**
     * Generate a new API token using the oauth2-server module.
     * @param {object} headers : The request headers. This should
     * include `Content-Type: application/x-www-form-urlencoded`.
     * @param {{
     *  clientId: string,
     *  clientSecret: string,
     *  validityPeriod: number?,
     * }} body : The request body.
     * @param {object?} options : Optional options to be passed to the oauth2-server module. */
    async token(headers, body, options = null) {
        // 30 days default.
        const accessTokenDays = body.validityPeriod || 30;

        const tokenOptions = {
            ...options,
            accessTokenLifetime: accessTokenDays * 86400, // Seconds
        };

        const request = new OAuth2Server.Request({
            headers,
            method: 'POST',
            query: { },
            body: {
                client_id: body.clientId,
                client_secret: body.clientSecret,
                grant_type: 'client_credentials',
            },
        });
        const response = new OAuth2Server.Response();

        try {
            const token = await oauth2Server.token(request, response, tokenOptions);

            return {
                token: token.accessToken,
                expiresAt: token.accessTokenExpiresAt,
                type: 'Bearer',
            };
        } catch (ex) {
            throw new ApiError(ex.message, ex.status);
        }
    },

    /**
     * Authenticate the provided token.
     * @param {object} headers : The request headers. This should include the token.
     * @param {string} method : Http method type.
     * @param {string?} requiredScope : Optional minimally required scope to access the method.
     * @param {object?} options : Optional options to be passed to the oauth2-server module. */
    async authenticate(headers, method, requiredScope = null, options = null) {
        const request = new OAuth2Server.Request({
            headers,
            method,
            query: { },
            body: { },
        });
        const response = new OAuth2Server.Response();

        let authResult;
        try {
            authResult = await oauth2Server.authenticate(request, response, options);
        } catch (ex) {
            throw new ApiError(ex.message, ex.status);
        }

        if (requiredScope && !ScopeManager.isScopeValid(authResult.scope, requiredScope)) {
            throw new ApiError('Method is forbidden', 403);
        }
        return new Caller({
            client: authResult.client,
            scope: authResult.scope,
        });
    },
};
