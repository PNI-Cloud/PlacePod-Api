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
const { AccessToken } = require('../../models');

/**
 * Postgres implementation of Access Token related database operations. */
class AccessTokenDb {
    /**
     * Find the saved accessToken's data and return it.
     * Return null if it is not found.
     * @param {string} tokenValue : The value of the access token to find.
     * @public */
    async findOne(tokenValue) {
        const query = {
            text: `
                SELECT
                    value,
                    expires_at,
                    scope,
                    client_id,
                    created_at
                FROM
                    access_token
                WHERE
                    value = $1;`,
            values: [tokenValue],
        };

        try {
            const tokens = await Postgres.query(query);
            if (!tokens || !tokens.length) {
                return null;
            }
            return this.tokenFactory(tokens)[0];
        } catch (ex) {
            console.error('AccessTokenDb.findOne() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Save the newly generated token to the database.
     * @param {object} params : The access token instance.
     *  @param {string} params.accessToken
     *  @param {Date} params.expiresAt
     *  @param {string} params.scope
     *  @param {string} params.clientId
     * @public */
    async create(params) {
        const query = {
            text: `
                INSERT INTO
                    access_token (
                        value,
                        expires_at,
                        scope,
                        client_id
                    )
                VALUES
                    ($1, $2, $3, $4);`,
            values: [
                params.accessToken,
                new Date(params.expiresAt).toISOString(),
                params.scope,
                params.clientId,
            ],
        };

        try {
            await Postgres.query(query);
        } catch (ex) {
            console.error('AccessTokenDb.create() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Delete an existing token from the database.
     * @param {string} tokenValue : Value of the token to delete.
     * @public */
    async delete(tokenValue) {
        const query = {
            text: `
                DELETE FROM
                    access_token
                WHERE
                    value = $1;`,
            values: [tokenValue],
        };

        try {
            await Postgres.query(query);
        } catch (ex) {
            console.error('AccessTokenDb.delete() postgres error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }


    /**
     * Convert the raw postgres objects into access token objects.
     * @param {object[]} tokens : Array of raw access token objects from postgres.
     * @private */
    tokenFactory(tokens) {
        if (!tokens || !tokens.length) {
            return [];
        }

        return tokens.map((token) => new AccessToken({
            value: token.value,
            expiresAt: token.expires_at,
            scope: token.scope,
            clientId: token.client_id,
            createdAt: token.created_at,
        }));
    }
}

module.exports = new AccessTokenDb();
