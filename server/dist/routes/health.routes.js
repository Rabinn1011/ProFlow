"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_controller_1 = require("../controllers/health.controller");
const healthRouter = (0, express_1.Router)();
healthRouter.get("/", health_controller_1.getHealth);
exports.default = healthRouter;
