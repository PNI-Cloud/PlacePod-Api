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
const { OAuth2Controller } = require('../../controllers/v1');

/**
 * Define method routes for 'oauth2' resource. */
module.exports = () => {
    const router = Router();

    router.post('/', (req, res, next) => {
        OAuth2Controller.create(req.headers, req.body)
            .then((result) => res.json(result))
            .catch((ex) => next(ex));
    });

    router.route('/:token')
        .get((req, res, next) => {
            OAuth2Controller.info(req.params)
                .then((result) => res.json(result))
                .catch((ex) => next(ex));
        })
        .delete((req, res, next) => {
            OAuth2Controller.revoke(req.params)
                .then((result) => res.json(result))
                .catch((ex) => next(ex));
        });

    return router;
};
