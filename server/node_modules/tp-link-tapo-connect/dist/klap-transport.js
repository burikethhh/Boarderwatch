"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolUnsupportedError = exports.loginDeviceByIp = void 0;
var axios_1 = __importDefault(require("axios"));
var crypto_1 = require("crypto");
var tapo_device_1 = require("./tapo-device");
var tapo_utils_1 = require("./tapo-utils");
// Typescript port of https://gist.github.com/chriswheeldon/3b17d974db3817613c69191c0480fe55
var AES_CIPHER_ALGORITHM = "aes-128-cbc";
var loginDeviceByIp = function (email, password, deviceIp) { return __awaiter(void 0, void 0, void 0, function () {
    var localSeed, response, responseBytes, setCookieHeader, sessionCookie, remoteSeed, serverHash, localAuthHash, localSeedAuthHash, payload;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                localSeed = (0, crypto_1.randomBytes)(16);
                return [4 /*yield*/, axios_1.default
                        .post("http://".concat(deviceIp, "/app/handshake1"), localSeed, {
                        responseType: "arraybuffer",
                        withCredentials: true,
                    })
                        .catch(function (error) {
                        var _a;
                        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                            throw new Error("Klap protocol not supported");
                        }
                        throw new Error("handshake1 failed: ".concat(error));
                    })];
            case 1:
                response = _a.sent();
                responseBytes = Buffer.from(response.data);
                setCookieHeader = response.headers["set-cookie"][0];
                sessionCookie = setCookieHeader.substring(0, setCookieHeader.indexOf(";"));
                remoteSeed = responseBytes.slice(0, 16);
                serverHash = responseBytes.slice(16);
                localAuthHash = generateAuthHash(email, password);
                localSeedAuthHash = handshake1AuthHash(localSeed, remoteSeed, localAuthHash);
                if (!compare(localSeedAuthHash, serverHash)) {
                    throw new Error("email or password incorrect");
                }
                payload = handshake2AuthHash(localSeed, remoteSeed, localAuthHash);
                return [4 /*yield*/, axios_1.default
                        .post("http://".concat(deviceIp, "/app/handshake2"), payload, {
                        responseType: "arraybuffer",
                        headers: {
                            Cookie: sessionCookie,
                        },
                    })
                        .catch(function (error) {
                        throw new Error("handshake2 failed: ".concat(error));
                    })];
            case 2:
                _a.sent();
                return [2 /*return*/, createKlapEncryptionSession(deviceIp, localSeed, remoteSeed, localAuthHash, sessionCookie)];
        }
    });
}); };
exports.loginDeviceByIp = loginDeviceByIp;
var createKlapEncryptionSession = function (deviceIp, localSeed, remoteSeed, userHash, sessionCookie) {
    var key = deriveKey(localSeed, remoteSeed, userHash);
    var iv = deriveIv(localSeed, remoteSeed, userHash);
    var sig = deriveSig(localSeed, remoteSeed, userHash);
    var seq = deriveSeqFromIv(iv);
    var encrypt = function (payload) {
        var payloadJson = JSON.stringify(payload);
        var cipher = (0, crypto_1.createCipheriv)(AES_CIPHER_ALGORITHM, key, ivWithSeq(iv, seq));
        var ciphertext = cipher.update(encode(payloadJson));
        return Buffer.concat([ciphertext, cipher.final()]);
    };
    var decrypt = function (payload) {
        var cipher = (0, crypto_1.createDecipheriv)(AES_CIPHER_ALGORITHM, key, ivWithSeq(iv, seq));
        var ciphertext = cipher.update(payload.slice(32));
        return JSON.parse(Buffer.concat([ciphertext, cipher.final()]).toString());
    };
    var encryptAndSign = function (payload) {
        var ciphertext = encrypt(payload);
        var signature = sha256(Buffer.concat([sig, seq, ciphertext]));
        return Buffer.concat([signature, ciphertext]);
    };
    var send = function (deviceRequest) { return __awaiter(void 0, void 0, void 0, function () {
        var encryptedRequest, response, decryptedResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    seq = incrementSeq(seq);
                    encryptedRequest = encryptAndSign(deviceRequest);
                    return [4 /*yield*/, (0, axios_1.default)({
                            method: "post",
                            url: "http://".concat(deviceIp, "/app/request"),
                            data: encryptedRequest,
                            responseType: "arraybuffer",
                            headers: {
                                Cookie: sessionCookie,
                            },
                            params: {
                                seq: seq.readInt32BE(),
                            },
                        })];
                case 1:
                    response = _a.sent();
                    decryptedResponse = decrypt(response.data);
                    (0, tapo_utils_1.checkError)(decryptedResponse);
                    return [2 /*return*/, decryptedResponse.result];
            }
        });
    }); };
    return (0, tapo_device_1.TapoDevice)({ send: send });
};
var ProtocolUnsupportedError = /** @class */ (function (_super) {
    __extends(ProtocolUnsupportedError, _super);
    function ProtocolUnsupportedError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ProtocolUnsupportedError;
}(Error));
exports.ProtocolUnsupportedError = ProtocolUnsupportedError;
var handshake1AuthHash = function (localSeed, remoteSeed, authHash) { return sha256(Buffer.concat([localSeed, remoteSeed, authHash])); };
var handshake2AuthHash = function (localSeed, remoteSeed, authHash) { return sha256(Buffer.concat([remoteSeed, localSeed, authHash])); };
var generateAuthHash = function (email, password) {
    return sha256(Buffer.concat([sha1(email), sha1(password)]));
};
var deriveKey = function (localSeed, remoteSeed, userHash) {
    return sha256(Buffer.concat([encode("lsk"), localSeed, remoteSeed, userHash])).slice(0, 16);
};
var deriveIv = function (localSeed, remoteSeed, userHash) {
    return sha256(Buffer.concat([encode("iv"), localSeed, remoteSeed, userHash]));
};
var deriveSig = function (localSeed, remoteSeed, userHash) {
    return sha256(Buffer.concat([encode("ldk"), localSeed, remoteSeed, userHash])).slice(0, 28);
};
var deriveSeqFromIv = function (iv) { return iv.slice(iv.length - 4); };
var ivWithSeq = function (iv, seq) {
    return Buffer.concat([iv.slice(0, 12), seq]);
};
var incrementSeq = function (seq) {
    var buffer = Buffer.alloc(4);
    buffer.writeInt32BE(seq.readInt32BE() + 1);
    return buffer;
};
var sha256 = function (data) {
    return (0, crypto_1.createHash)("sha256").update(data).digest();
};
var sha1 = function (data) {
    return (0, crypto_1.createHash)("sha1").update(data).digest();
};
var compare = function (b1, b2) { return b1.compare(b2) === 0; };
var encode = function (text) { return Buffer.from(text, "utf-8"); };
//# sourceMappingURL=klap-transport.js.map