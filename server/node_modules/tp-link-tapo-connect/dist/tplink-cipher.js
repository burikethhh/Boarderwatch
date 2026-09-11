"use strict";
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
exports.shaDigest = exports.base64Decode = exports.base64Encode = exports.readDeviceKey = exports.decrypt = exports.encrypt = exports.generateKeyPair = void 0;
var crypto_1 = __importDefault(require("crypto"));
var util_1 = __importDefault(require("util"));
var RSA_CIPHER_ALGORITHM = "rsa";
var AES_CIPHER_ALGORITHM = "aes-128-cbc";
var PASSPHRASE = "top secret";
var generateKeyPair = function () { return __awaiter(void 0, void 0, void 0, function () {
    var RSA_OPTIONS, generateKeyPair;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                RSA_OPTIONS = {
                    modulusLength: 1024,
                    publicKeyEncoding: {
                        type: "spki",
                        format: "pem",
                    },
                    privateKeyEncoding: {
                        type: "pkcs1",
                        format: "pem",
                        cipher: "aes-256-cbc",
                        passphrase: PASSPHRASE,
                    },
                };
                generateKeyPair = util_1.default.promisify(crypto_1.default.generateKeyPair);
                return [4 /*yield*/, generateKeyPair(RSA_CIPHER_ALGORITHM, RSA_OPTIONS)];
            case 1: 
            // @ts-ignore
            return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.generateKeyPair = generateKeyPair;
var encrypt = function (data, deviceKey) {
    var cipher = crypto_1.default.createCipheriv(AES_CIPHER_ALGORITHM, deviceKey.key, deviceKey.iv);
    var ciphertext = cipher.update(Buffer.from(JSON.stringify(data)));
    return Buffer.concat([ciphertext, cipher.final()]).toString("base64");
};
exports.encrypt = encrypt;
var decrypt = function (data, deviceKey) {
    var cipher = crypto_1.default.createDecipheriv(AES_CIPHER_ALGORITHM, deviceKey.key, deviceKey.iv);
    var ciphertext = cipher.update(Buffer.from(data, "base64"));
    return JSON.parse(Buffer.concat([ciphertext, cipher.final()]).toString());
};
exports.decrypt = decrypt;
var readDeviceKey = function (pemKey, privateKey) {
    var keyBytes = Buffer.from(pemKey, "base64");
    var deviceKey = crypto_1.default.privateDecrypt({
        key: privateKey,
        padding: crypto_1.default.constants.RSA_PKCS1_PADDING,
        passphrase: PASSPHRASE,
    }, keyBytes);
    return deviceKey;
};
exports.readDeviceKey = readDeviceKey;
var base64Encode = function (data) {
    return Buffer.from(data).toString("base64");
};
exports.base64Encode = base64Encode;
var base64Decode = function (data) {
    if (!data)
        return '';
    return Buffer.from(data, "base64").toString();
};
exports.base64Decode = base64Decode;
var shaDigest = function (data) {
    var shasum = crypto_1.default.createHash("sha1");
    shasum.update(data);
    return shasum.digest("hex");
};
exports.shaDigest = shaDigest;
//# sourceMappingURL=tplink-cipher.js.map