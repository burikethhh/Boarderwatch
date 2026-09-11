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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TapoDevice = void 0;
var colour_helper_1 = require("./colour-helper");
var tplink_cipher_1 = require("./tplink-cipher");
var types_1 = require("./types");
var TapoDevice = function (_a) {
    var send = _a.send;
    var wrapRequestForChildDevice = function (request, deviceId) {
        // No child means no need to wrap
        if (!deviceId)
            return request;
        return {
            method: 'control_child',
            params: {
                device_id: deviceId,
                // Note: requestData can be an array of requests with the block below
                requestData: request,
                // requestData: {
                // 	method: 'multipleRequest',
                // 	params: {requests: [request]}
                // },
            }
        };
    };
    var setDeviceOn = function (deviceOn, deviceId) { return __awaiter(void 0, void 0, void 0, function () {
        var turnDeviceOnRequest;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    turnDeviceOnRequest = {
                        "method": "set_device_info",
                        "params": {
                            "device_on": deviceOn,
                        }
                    };
                    return [4 /*yield*/, send(wrapRequestForChildDevice(turnDeviceOnRequest, deviceId))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var augmentTapoDeviceInfo = function (deviceInfo) {
        return __assign(__assign({}, deviceInfo), { ssid: (0, tplink_cipher_1.base64Decode)(deviceInfo.ssid), nickname: (0, tplink_cipher_1.base64Decode)(deviceInfo.nickname) });
    };
    return {
        turnOn: function (deviceId) { return setDeviceOn(true, deviceId); },
        turnOff: function (deviceId) { return setDeviceOn(false, deviceId); },
        setBrightness: function () {
            var args_1 = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args_1[_i] = arguments[_i];
            }
            return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (brightnessLevel) {
                var setBrightnessRequest;
                if (brightnessLevel === void 0) { brightnessLevel = 100; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            setBrightnessRequest = {
                                "method": "set_device_info",
                                "params": {
                                    "brightness": brightnessLevel,
                                }
                            };
                            return [4 /*yield*/, send(setBrightnessRequest)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        },
        setColour: function () {
            var args_1 = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args_1[_i] = arguments[_i];
            }
            return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (colour) {
                var params, setColourRequest;
                if (colour === void 0) { colour = 'white'; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            params = (0, colour_helper_1.getColour)(colour);
                            setColourRequest = {
                                "method": "set_device_info",
                                params: params
                            };
                            return [4 /*yield*/, send(setColourRequest)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        },
        setHSL: function (hue, sat, lum) { return __awaiter(void 0, void 0, void 0, function () {
            var normalisedHue, normalisedSat, normalisedLum, setHSLRequest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        normalisedHue = hue % 360;
                        normalisedSat = Math.max(0, Math.min(100, sat));
                        normalisedLum = Math.max(0, Math.min(100, lum));
                        if (!(normalisedLum === 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, setDeviceOn(false)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        setHSLRequest = {
                            "method": "set_device_info",
                            "params": {
                                "hue": normalisedHue,
                                "saturation": normalisedSat,
                                "brightness": normalisedLum,
                                "color_temp": 0
                            }
                        };
                        return [4 /*yield*/, send(setHSLRequest)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        getDeviceInfo: function () { return __awaiter(void 0, void 0, void 0, function () {
            var statusRequest, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        statusRequest = {
                            "method": "get_device_info"
                        };
                        _a = augmentTapoDeviceInfo;
                        return [4 /*yield*/, send(statusRequest)];
                    case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                }
            });
        }); },
        getChildDevicesInfo: function () { return __awaiter(void 0, void 0, void 0, function () {
            var listChildDeviceRequest, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        listChildDeviceRequest = {
                            "method": "get_child_device_list",
                            start_index: 0,
                        };
                        return [4 /*yield*/, send(listChildDeviceRequest)];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, res.child_device_list.map(function (deviceInfo) { return augmentTapoDeviceInfo(deviceInfo); }).sort(function (a, b) { return a.position - b.position; })];
                }
            });
        }); },
        getEnergyUsage: function () { return __awaiter(void 0, void 0, void 0, function () {
            var statusRequest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        statusRequest = {
                            "method": "get_energy_usage"
                        };
                        return [4 /*yield*/, send(statusRequest)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); },
        // HS100 - Tapo Hub
        getHubDevices: function () { return __awaiter(void 0, void 0, void 0, function () {
            var statusRequest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        statusRequest = {
                            "method": "get_child_device_list",
                        };
                        return [4 /*yield*/, send(statusRequest)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); },
        playAlarm: function () {
            var args_1 = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args_1[_i] = arguments[_i];
            }
            return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (alarmType, volume, alarm_duration) {
                var statusRequest;
                if (alarmType === void 0) { alarmType = types_1.AlarmTone.Alarm1; }
                if (volume === void 0) { volume = types_1.AlarmVolume.high; }
                if (alarm_duration === void 0) { alarm_duration = 0; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            statusRequest = {
                                "method": "play_alarm",
                                "params": {
                                    "alarm_duration": alarm_duration,
                                    "alarm_volume": volume,
                                    "alarm_type": alarmType
                                }
                            };
                            return [4 /*yield*/, send(statusRequest)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            });
        },
        stopAlarm: function () { return __awaiter(void 0, void 0, void 0, function () {
            var statusRequest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        statusRequest = {
                            "method": "stop_alarm"
                        };
                        return [4 /*yield*/, send(statusRequest)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); },
        getEventLogs: function (deviceId_1) {
            var args_1 = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args_1[_i - 1] = arguments[_i];
            }
            return __awaiter(void 0, __spreadArray([deviceId_1], args_1, true), void 0, function (deviceId, size, startId) {
                var eventLogsRequest;
                if (size === void 0) { size = 20; }
                if (startId === void 0) { startId = 0; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            eventLogsRequest = {
                                "method": "control_child",
                                "params": {
                                    "device_id": deviceId,
                                    "requestData": {
                                        "method": "get_trigger_logs",
                                        "params": {
                                            "page_size": size,
                                            "start_id": startId
                                        }
                                    }
                                }
                            };
                            return [4 /*yield*/, send(eventLogsRequest)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            });
        },
        getAlarmTones: function () { return __awaiter(void 0, void 0, void 0, function () {
            var alarmInfoRequest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        alarmInfoRequest = {
                            "method": "get_support_alarm_type_list"
                        };
                        return [4 /*yield*/, send(alarmInfoRequest)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }
    };
};
exports.TapoDevice = TapoDevice;
//# sourceMappingURL=tapo-device.js.map