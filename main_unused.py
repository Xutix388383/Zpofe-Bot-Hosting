from flask import Flask, request, jsonify
import json
import os
import uuid
import time
from datetime import datetime, timedelta

app = Flask(__name__)

# Load or create keys storage
KEYS_FILE = 'keys.json'

def load_keys():
    if os.path.exists(KEYS_FILE):
        with open(KEYS_FILE, 'r') as f:
            return json.load(f)
    return {"keys": []}

def save_keys(data):
    with open(KEYS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def generate_key():
    return str(uuid.uuid4()).replace('-', '').upper()[:12]

@app.route('/genkey', methods=['POST'])
def generate_key_endpoint():
    try:
        key = generate_key()
        keys_data = load_keys()

        key_obj = {
            "key": key,
            "created": datetime.now().isoformat(),
            "type": "permanent",
            "hwid": None,
            "active": True,
            "hwid_resets": 0
        }

        keys_data["keys"].append(key_obj)
        save_keys(keys_data)

        return jsonify({"success": True, "key": key})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/deletekey', methods=['POST'])
def delete_key():
    try:
        data = request.get_json()
        key = data.get('key')
        
        if not key:
            return jsonify({"success": False, "message": "Key is required"}), 400
            
        keys_data = load_keys()
        original_count = len(keys_data["keys"])
        
        # Remove the key from storage
        keys_data["keys"] = [k for k in keys_data["keys"] if k["key"] != key]
        
        if len(keys_data["keys"]) < original_count:
            save_keys(keys_data)
            return jsonify({"success": True, "message": f"Key {key} deleted successfully"})
        else:
            return jsonify({"success": False, "message": "Key not found"}), 404
            
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/resethwid', methods=['POST'])
def reset_hwid():
    try:
        data = request.get_json()
        key = data.get('key')
        
        if not key:
            return jsonify({"success": False, "message": "Key is required"}), 400
            
        keys_data = load_keys()
        
        for key_obj in keys_data["keys"]:
            if key_obj["key"] == key:
                key_obj["hwid"] = None
                key_obj["hwid_resets"] = key_obj.get("hwid_resets", 0) + 1
                save_keys(keys_data)
                return jsonify({"success": True, "message": f"HWID reset for key {key}"})
        
        return jsonify({"success": False, "message": "Key not found"}), 404
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/stats', methods=['GET'])
def delete_key():
    try:
        data = request.json
        key_to_delete = data.get('key')

        if not key_to_delete:
            return jsonify({"success": False, "message": "Key is required"}), 400

        keys_data = load_keys()
        original_count = len(keys_data["keys"])
        keys_data["keys"] = [k for k in keys_data["keys"] if k["key"] != key_to_delete]

        if len(keys_data["keys"]) < original_count:
            save_keys(keys_data)
            return jsonify({"success": True, "message": f"Key {key_to_delete} deleted"})
        else:
            return jsonify({"success": False, "message": "Key not found"}), 404

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/resethwid', methods=['POST'])
def reset_hwid():
    try:
        data = request.json
        key_to_reset = data.get('key')

        if not key_to_reset:
            return jsonify({"success": False, "message": "Key is required"}), 400

        keys_data = load_keys()

        for key_obj in keys_data["keys"]:
            if key_obj["key"] == key_to_reset:
                key_obj["hwid"] = None
                key_obj["hwid_resets"] += 1
                save_keys(keys_data)
                return jsonify({"success": True, "message": f"HWID reset for key {key_to_reset}"})

        return jsonify({"success": False, "message": "Key not found"}), 404

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    try:
        keys_data = load_keys()
        total_keys = len(keys_data["keys"])

        permanent = len([k for k in keys_data["keys"] if k.get("type", "permanent") == "permanent"])
        temporary = len([k for k in keys_data["keys"] if k.get("type") == "temporary"])
        active = len([k for k in keys_data["keys"] if k.get("active", True)])
        expired = total_keys - active
        hwid_resets = sum(k.get("hwid_resets", 0) for k in keys_data["keys"])

        stats = {
            "totalKeys": total_keys,
            "permanent": permanent,
            "temporary": temporary,
            "active": active,
            "expired": expired,
            "hwidResets": hwid_resets
        }

        return jsonify(stats)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "online", "timestamp": datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)
