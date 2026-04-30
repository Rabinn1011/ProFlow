"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealth = void 0;
const getHealth = (_req, res) => {
    res.status(200).json({
        status: "ok",
        service: "proflow-server",
        timestamp: new Date().toISOString(),
    });
};
exports.getHealth = getHealth;
