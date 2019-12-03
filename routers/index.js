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
const { Router } = require('express');
const ScopeManager = require('../lib/ScopeManager');
const AuthMiddleware = require('../lib/AuthMiddleware');
const v1 = require('./v1');

const apiBase = 'api';
const apiInternalBase = 'api-internal';

/**
 * Connect general resources with routes.
 * Each resource should use the authMiddleware as needed since scopes vary.
 * @param {AuthMiddleware} authMiddleware : Some authentication middleware, like AuthMiddleware or
 * something that matches its interface.
 */
function apiRouterV1(authMiddleware) {
    const router = Router();

    router.use('/lanes',
        authMiddleware.handle(ScopeManager.scopes.user),
        v1.LaneRouter());

    router.use('/oauth2tokens', v1.OAuth2Router());

    router.use('/parkinglots',
        authMiddleware.handle(ScopeManager.scopes.user),
        v1.ParkingLotRouter());

    router.use('/sensors',
        authMiddleware.handle(ScopeManager.scopes.user),
        v1.SensorRouter());

    router.use('/sensorlogs',
        authMiddleware.handle(ScopeManager.scopes.user),
        v1.SensorLogRouter());

    return router;
}

/**
 * Connect interal resources with routes.
 * Admin level scope is required to get into this. */
function apiInternalRouterV1() {
    const router = Router();

    router.use('/clients', v1.ClientRouter());

    return router;
}

/**
 * Define base resource paths.
 */
module.exports = () => {
    const router = Router();
    const authMiddleware = new AuthMiddleware();

    router.use(`/${apiBase}/v1`,
        apiRouterV1(authMiddleware));

    router.use(`/${apiInternalBase}/v1`,
        authMiddleware.handle(ScopeManager.scopes.admin),
        apiInternalRouterV1());

    return router;
};
