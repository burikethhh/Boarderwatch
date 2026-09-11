"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkError = exports.isTapoDevice = exports.augmentTapoDevice = void 0;
var tplink_cipher_1 = require("./tplink-cipher");
var augmentTapoDevice = function (deviceInfo) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if ((0, exports.isTapoDevice)(deviceInfo.deviceType)) {
            return [2 /*return*/, __assign(__assign({}, deviceInfo), { alias: (0, tplink_cipher_1.base64Decode)(deviceInfo.alias) })];
        }
        else {
            return [2 /*return*/, deviceInfo];
        }
        return [2 /*return*/];
    });
}); };
exports.augmentTapoDevice = augmentTapoDevice;
var isTapoDevice = function (deviceType) {
    switch (deviceType) {
        case 'SMART.TAPOPLUG':
        case 'SMART.TAPOBULB':
        case 'SMART.IPCAMERA':
            return true;
        default: return false;
    }
};
exports.isTapoDevice = isTapoDevice;
var checkError = function (responseData) {
    var errorCode = responseData["error_code"];
    if (errorCode) {
        switch (errorCode) {
            case 0: return;
            case -1005: throw new Error("AES Decode Fail");
            case -1006: throw new Error("Request length error");
            case -1008: throw new Error("Invalid request params");
            case -1301: throw new Error("Rate limit exceeded");
            case -1101: throw new Error("Session params error");
            case -1010: throw new Error("Invalid public key length");
            case -1012: throw new Error("Invalid terminal UUID");
            case -1501: throw new Error("Invalid credentials");
            case -1002: throw new Error("Transport not available error");
            case -1003: throw new Error("Malformed json request");
            case -20004: throw new Error("API rate limit exceeded");
            case -20104: throw new Error("Missing credentials");
            case -20601: throw new Error("Incorrect email or password");
            case -20675: throw new Error("Cloud token expired or invalid");
            case 1000: throw new Error("Null transport error");
            case 1001: throw new Error("Command cancel error");
            case 1002: throw new Error("Transport not available error");
            case 1003: throw new Error("Device supports KLAP protocol - Legacy login not supported");
            case 1100: throw new Error("Handshake failed");
            case 1111: throw new Error("Login failed");
            case 1112: throw new Error("Http transport error");
            case 1200: throw new Error("Multirequest failed");
            case 9999: throw new Error("Session Timeout");
            default: throw new Error("Unrecognised Error Code: ".concat(errorCode, " (").concat(responseData["msg"], ")"));
        }
    }
};
exports.checkError = checkError;
//# sourceMappingURL=tapo-utils.js.map