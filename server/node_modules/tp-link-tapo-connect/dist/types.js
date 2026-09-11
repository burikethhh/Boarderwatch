"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TapoDeviceEventType = exports.AlarmVolume = exports.AlarmTone = void 0;
var AlarmTone;
(function (AlarmTone) {
    AlarmTone["DoorbellRing1"] = "Doorbell Ring 1";
    AlarmTone["DoorbellRing2"] = "Doorbell Ring 2";
    AlarmTone["DoorbellRing3"] = "Doorbell Ring 3";
    AlarmTone["DoorbellRing4"] = "Doorbell Ring 4";
    AlarmTone["DoorbellRing5"] = "Doorbell Ring 5";
    AlarmTone["DoorbellRing6"] = "Doorbell Ring 6";
    AlarmTone["DoorbellRing7"] = "Doorbell Ring 7";
    AlarmTone["DoorbellRing8"] = "Doorbell Ring 8";
    AlarmTone["DoorbellRing9"] = "Doorbell Ring 9";
    AlarmTone["DoorbellRing10"] = "Doorbell Ring 10";
    AlarmTone["PhoneRing"] = "Phone Ring";
    AlarmTone["Alarm1"] = "Alarm 1";
    AlarmTone["Alarm2"] = "Alarm 2";
    AlarmTone["Alarm3"] = "Alarm 3";
    AlarmTone["Alarm4"] = "Alarm 4";
    AlarmTone["Alarm5"] = "Alarm 5";
    AlarmTone["DrippingTap"] = "Dripping Tap";
    AlarmTone["Connection1"] = "Connection 1";
    AlarmTone["Connection2"] = "Connection 2";
})(AlarmTone || (exports.AlarmTone = AlarmTone = {}));
var AlarmVolume;
(function (AlarmVolume) {
    AlarmVolume["mute"] = "mute";
    AlarmVolume["low"] = "low";
    AlarmVolume["normal"] = "normal";
    AlarmVolume["high"] = "high";
})(AlarmVolume || (exports.AlarmVolume = AlarmVolume = {}));
var TapoDeviceEventType;
(function (TapoDeviceEventType) {
    TapoDeviceEventType["motion"] = "motion";
    TapoDeviceEventType["open"] = "open";
    TapoDeviceEventType["close"] = "close";
})(TapoDeviceEventType || (exports.TapoDeviceEventType = TapoDeviceEventType = {}));
//# sourceMappingURL=types.js.map