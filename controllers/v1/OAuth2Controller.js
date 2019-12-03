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
const Joi = require('@hapi/joi');
const { AccessTokenDb } = require('../../database');
const { ApiError, Response } = require('../../models');
const OAuthServer = require('../../lib/OAuthServer');

/** Body schema for creating an access token. */
const createBody = Joi.object()
    .keys({
        clientId: Joi.string().required(),
        clientSecret: Joi.string().required(),
        validityPeriod: Joi.number().integer().min(1).max(365)
            .allow(''),
    });

/** Params schema for a string id. */
const tokenParam = Joi.object()
    .keys({
        token: Joi.string().required(),
    });

/**
 * Custom auth methods that don't go through the OAuth2 server.
 * No auth/scope is required to access these. */
class OAuth2Controller {
    /**
     * Generate a new API token.
     * @param {{}} headers : The request headers. This should
     * include `Content-Type: application/x-www-form-urlencoded`.
     * @param {{}} body : The request body. */
    async create(headers, body) {
        /**
         * @type {{
         *  clientId: string,
         *  clientSecret: string,
         *  validityPeriod: number,
         * }}
         */
        let validBody;

        try {
            validBody = await createBody.validateAsync(body, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        return OAuthServer.token(headers, validBody);
    }

    /**
     * Retreive info relating to the provided token.
     * @param {{}} params : Contains the unique value of the token to revoke.
     * @public */
    async info(params) {
        /** @type {string} */
        let token;

        try {
            ({ token } = await tokenParam.validateAsync(params, { stripUnknown: true }));
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        const accessToken = await AccessTokenDb.findOne(token);
        if (!accessToken) {
            throw new ApiError(`Invalid access token: ${token}`, 400);
        }

        return {
            token: accessToken.value,
            expiresAt: accessToken.expiresAt,
            type: 'Bearer',
            clientId: accessToken.clientId,
        };
    }

    /**
     * The provided token will not work for future requests.
     * @param {{}} params : Contains the unique value of the token to revoke.
     * @public */
    async revoke(params) {
        /** @type {string} */
        let token;

        try {
            ({ token } = await tokenParam.validateAsync(params, { stripUnknown: true }));
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        await AccessTokenDb.delete(token).catch(() => { });
        return new Response('success');
    }
}

module.exports = new OAuth2Controller();
