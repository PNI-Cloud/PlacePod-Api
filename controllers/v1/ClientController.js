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
const cryptoRandomString = require('crypto-random-string');
const Joi = require('@hapi/joi');
const { ApiError, Response } = require('../../models');
const { ClientDb } = require('../../database');
const ScopeManager = require('../../lib/ScopeManager');

/** Query schema for searching for clients to get. */
const searchQuery = Joi.object()
    .keys({
        scope: Joi.string()
            .valid(ScopeManager.scopes.admin, ScopeManager.scopes.user)
            .insensitive(),
    });

/** Body schema for creating a client. */
const createBody = Joi.object()
    .keys({
        id: Joi.string().min(3).max(20).required(),
        scope: Joi.string().allow(''),
        email: Joi.string().email().required(),
    });

/** Params schema for a string id. */
const idParam = Joi.object()
    .keys({
        id: Joi.string().required(),
    });

/** Body schema for updating a client. */
const updateBody = Joi.object()
    .min(1)
    .keys({
        email: Joi.string().email(),
    });

/**
 * Generate a new client secret. */
function generateSecret() {
    return cryptoRandomString({ length: 32, type: 'hex' });
}

/**
 * Hash the client's secret.
 * @param {string} secret
 */
function hash(secret) {
    return bcrypt.hash(secret, 10);
}

/**
 * Expose endpoints for managing the 'client' resource.
 * Minimal Scopes: [admin] */
class ClientController {
    /**
     * Returns all clients that match the provided filters.
     * @param {{}} query : Contains optional search filters.
     * @public */
    async getAll(query) {
        /**
         * @type {{ scope: string }}
         */
        let filters;

        try {
            filters = await searchQuery.validateAsync(query, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        const clients = await ClientDb.find(filters);
        return clients.map((client) => ({
            id: client.id,
            scope: client.scope,
            email: client.email,
        }));
    }

    /**
     * This creates a new client and returns the important info.
     * @param {{}} body : The parameters to create the new client.
     * @public */
    async create(body) {
        /**
         * @type {{
         *  id: string,
         *  scope: string?,
         *  email: string?,
         * }}
         */
        let newClient;

        try {
            newClient = await createBody.validateAsync(body, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        // Attempt to creae a new client. The passed id must be a unique id that hasn't been used.
        if (await ClientDb.findOne(newClient.id)) {
            throw new ApiError(`Client with id '${newClient.id}' is already taken.`, 400);
        }

        const scope = newClient.scope || ScopeManager.scopes.user;
        if (!ScopeManager.doesScopeExist(scope)) {
            throw new ApiError(`Invalid scope provided: '${scope}'.`, 400);
        }
        const secret = generateSecret();

        const id = await ClientDb.create({
            id: newClient.id,
            secret: await hash(secret),
            scope,
            email: newClient.email,
        });

        return {
            id,
            secret,
            scope,
        };
    }

    /**
     * Update the client with the matching id.
     * @param {{}} params : Contains the id of the client to update.
     * @param {{}} body : Contains fields to be updated.
     * @public */
    async update(params, body) {
        /** @type {string} */
        let id;

        /** @type {{ email: string }} */
        let updates;

        try {
            [{ id }, updates] = await Promise.all([
                idParam.validateAsync(params, { stripUnknown: true }),
                updateBody.validateAsync(body, { stripUnknown: true }),
            ]);
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!await ClientDb.findOne(id)) {
            throw new ApiError(`Client with id '${id}' doesn't exist.`, 404);
        }

        await ClientDb.update(id, updates);
        return new Response(`Client with id '${id}' successfully updated.`);
    }

    /**
     * Generate a new secret for the given client.
     * @param {{}} params : Contains the id of the client to update.
     * @public */
    async regenerateSecret(params) {
        /** @type {string} */
        let id;

        try {
            ({ id } = await idParam.validateAsync(params, { stripUnknown: true }));
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!await ClientDb.findOne(id)) {
            throw new ApiError(`Client with id '${id}' doesn't exist.`, 404);
        }
        const secret = generateSecret();

        await ClientDb.update(id, { secret: await hash(secret) });

        return { id, secret };
    }
}

module.exports = new ClientController();
