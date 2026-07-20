"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const workspaces_routes_1 = __importDefault(require("./routes/workspaces.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const not_found_middleware_1 = require("./middleware/not-found.middleware");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? true,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.get("/", (_req, res) => {
    res.json({ message: "Welcome to ProFlow API" });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/health", health_routes_1.default);
app.use("/api/users", users_routes_1.default);
app.use("/api/workspaces", workspaces_routes_1.default);
app.use(not_found_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
exports.default = app;
