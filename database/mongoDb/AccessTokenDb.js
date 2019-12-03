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
const MongoDb = require('./MongoDb');
const { AccessToken } = require('../../models');

/**
 * MongoDb implementation of Access Token related database operations. */
class AccessTokenDb {
    /**
     * Find the saved accessToken's data and return it.
     * Return null if it is not found.
     * @param {string} tokenValue : The value of the access token to find.
     * @public */
    async findOne(tokenValue) {
        try {
            const token = await new Promise((resolve, reject) => {
                MongoDb.accessTokens.findOne({ value: tokenValue }, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
            if (!token) {
                return null;
            }
            return this.tokenFactory([token])[0];
        } catch (ex) {
            console.error('AccessTokenDb.findOne() mongodb error: ', ex);
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
        const token = {
            value: params.accessToken,
            expiresAt: new Date(params.expiresAt).toISOString(),
            scope: params.scope,
            clientId: params.clientId,
            createdAt: new Date().toISOString(),
        };

        try {
            await new Promise((resolve, reject) => {
                MongoDb.accessTokens.insertOne(token, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res.insertedId);
                    }
                });
            });
        } catch (ex) {
            console.error('AccessTokenDb.create() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Delete an existing token from the database.
     * @param {string} tokenValue : Value of the token to delete.
     * @public */
    async delete(tokenValue) {
        try {
            await new Promise((resolve, reject) => {
                MongoDb.accessTokens.deleteOne({ value: tokenValue }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (ex) {
            console.error('AccessTokenDb.delete() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Convert the raw mongodb objects into access token objects.
     * @param {object[]} tokens : Array of raw access token objects from mongodb.
     * @private */
    tokenFactory(tokens) {
        if (!tokens || !tokens.length) {
            return [];
        }

        return tokens.map((token) => new AccessToken({
            value: token.value,
            expiresAt: token.expiresAt,
            scope: token.scope,
            clientId: token.clientId,
            createdAt: token.createdAt,
        }));
    }
}

module.exports = new AccessTokenDb();
