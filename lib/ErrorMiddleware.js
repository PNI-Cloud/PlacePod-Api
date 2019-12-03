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
 * Middleware that handles errors. */
// Next needs to be a param, otherwise this isn't hit...
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
    const clientId = (res.locals && res.locals.caller) ? res.locals.caller.clientId : '';
    if (!err.status || (typeof err.status === 'number' && err.status >= 500)) {
        console.error(`${new Date().toISOString()} Error from "${clientId}", type: "${req.method}", route "${req.originalUrl}": `, err);
    } else {
        console.error(`${new Date().toISOString()} Error from "${clientId}", type: "${req.method}", `
            + `route "${req.originalUrl}": "${err.message}" status "${err.status}".`);
    }

    const status = err.status || 500;
    res.status(status).json({
        statusCode: status,
        message: err.message,
    });
};
