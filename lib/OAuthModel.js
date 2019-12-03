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
const bcrypt = require('bcryptjs');
const { AccessTokenDb, ClientDb } = require('../database');
/** @typedef {import('../models/Client')} Client */

/**
 * Oauth2 model to be injected into the OAuth2 server. This acts as a layer
 * between server and database. */
class OAuthModel {
    /**
     * https://oauth2-server.readthedocs.io/en/latest/model/spec.html#getaccesstoken-accesstoken-callback
     * @param {string} accessToken : The access token to lookup and validate. */
    async getAccessToken(accessToken) {
        const token = await AccessTokenDb.findOne(accessToken);
        if (!token) {
            // If the token can't be found, then it's no good.
            return null; // Implies status 401.
        }
        const client = await ClientDb.findOne(token.clientId);

        return {
            accessToken: token.value,
            accessTokenExpiresAt: new Date(token.expiresAt),
            scope: token.scope,
            client,
            user: { id: null },
        };
    }

    /**
     * https://oauth2-server.readthedocs.io/en/latest/model/spec.html#getclient-clientid-clientsecret-callback
     * @param {string} clientId : The id of the client to retrieve.
     * @param {string?} clientSecret : The secret of the client to retrieve. */
    async getClient(clientId, clientSecret) {
        const client = await ClientDb.findOne(clientId);
        if (!client || !clientSecret) {
            return null;
        }

        // Make sure the secret is valid.
        if (!(await bcrypt.compare(clientSecret, client.secret))) {
            return null;
        }

        return client;
    }

    /**
     * https://oauth2-server.readthedocs.io/en/latest/model/spec.html#savetoken-token-client-user-callback
     * @param {object} token : The token(s) to be saved.
     * @param {Client} client : The client associated with the token(s).
     * @param {{}} user : The user associated with the token(s). */
    async saveToken(token, client, user) {
        await AccessTokenDb.create({
            accessToken: token.accessToken,
            expiresAt: token.accessTokenExpiresAt,
            scope: token.scope || client.scope,
            clientId: client.id,
        });

        return {
            accessToken: token.accessToken,
            accessTokenExpiresAt: token.accessTokenExpiresAt,
            scope: token.scope,
            client,
            user,
        };
    }

    /**
     * https://oauth2-server.readthedocs.io/en/latest/model/spec.html#verifyscope-accesstoken-scope-callback
     * @param {object} accessToken : The access token to test against
     * @param {string} scope : The required scopes. */
    verifyScope(accessToken, scope) {
        return (accessToken.scope === scope);
    }


    /* client_credentials specific */


    /**
     * https://oauth2-server.readthedocs.io/en/latest/model/spec.html#getuserfromclient-client-callback */
    getUserFromClient() {
        return { id: null };
    }
}

module.exports = new OAuthModel();
