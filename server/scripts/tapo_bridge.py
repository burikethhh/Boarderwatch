#!/usr/bin/env python3
"""
BoardersWatch <-> Tapo camera control bridge.

Keeps a single authenticated pytapo session alive and processes JSON commands
from stdin, one per line, printing one JSON result per command on stdout.

Usage:  python tapo_bridge.py <host> <user> <password>
"""
import sys
import json
import traceback

def out(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()

def main():
    if len(sys.argv) < 4:
        out({"ready": False, "error": "usage: tapo_bridge.py <host> <user> <password>"})
        return
    host, user, password = sys.argv[1], sys.argv[2], sys.argv[3]

    try:
        import asyncio
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        except Exception:
            pass
    except Exception:
        pass

    try:
        from pytapo import Tapo
        tapo = Tapo(host, user, password, printDebugInformation=False)
        tapo.getDeviceInfo()
        out({"ready": True})
    except Exception as e:
        out({"ready": False, "error": str(e)})
        return

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            cmd = json.loads(line)
            action = cmd.get("action")
            res = handle(tapo, action, cmd)
            res["ok"] = True
            out(res)
        except Exception as e:
            out({"ok": False, "error": str(e), "trace": traceback.format_exc()[-500:]})

def handle(tapo, action, cmd):
    if action == "ping":
        return {"pong": True}
    if action == "info":
        return {"info": tapo.getDeviceInfo()}
    if action == "move":
        tapo.moveMotor(float(cmd.get("x", 0)), float(cmd.get("y", 0)))
        return {"moved": True}
    if action == "stop":
        tapo.moveMotor(0, 0)
        return {"stopped": True}
    if action == "moveStep":
        tapo.moveMotorStep(float(cmd.get("angle", 0)))
        return {"stepped": True}
    if action == "calibrate":
        tapo.calibrateMotor()
        return {"calibrated": True}
    if action == "presets":
        return {"presets": tapo.getPresets()}
    if action == "savePreset":
        return {"saved": tapo.savePreset(cmd.get("name", "Preset"))}
    if action == "goToPreset":
        tapo.setPreset(int(cmd.get("id")))
        return {"ok": True}
    if action == "nightVision":
        tapo.setDayNightMode(cmd.get("mode", "auto"))
        return {"mode": tapo.getDayNightMode()}
    if action == "getNightVision":
        return {"mode": tapo.getDayNightMode()}
    if action == "smartTrack":
        res = tapo.setSmartTrackConfig("smart_track", bool(cmd.get("enabled")))
        return {"result": res}
    if action == "getSmartTrack":
        return {"config": tapo.getSmartTrackConfig()}
    if action == "autoTrackTarget":
        tapo.setAutoTrackTarget(bool(cmd.get("enabled")))
        return {"enabled": tapo.getAutoTrackTarget()}
    if action == "motionDetection":
        tapo.setMotionDetection(enabled=bool(cmd.get("enabled")), sensitivity=cmd.get("sensitivity", "medium"))
        return {"ok": True}
    if action == "getMotionDetection":
        return {"detection": tapo.getMotionDetection()}
    if action == "privacy":
        tapo.setPrivacyMode(bool(cmd.get("enabled")))
        return {"privacy": tapo.getPrivacyMode()}
    if action == "led":
        tapo.setLEDEnabled(bool(cmd.get("enabled")))
        return {"led": tapo.getLED()}
    return {"error": f"unknown action {action}"}

if __name__ == "__main__":
    main()
