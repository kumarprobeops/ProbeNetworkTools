import websocket
import threading
import time
import json
import subprocess

print("Probe Node: Starting up!")

WS_URL = "ws://backend:8000/ws/node"

def send_heartbeat(ws):
    while True:
        try:
            heartbeat_msg = {
                "action": "heartbeat",
                "status": "ok",
                "node_name": "probe-node-1"
            }
            ws.send(json.dumps(heartbeat_msg))
            print("Sent heartbeat")
        except Exception as e:
            print("Heartbeat error:", e)
            break  # Exit the thread, WebSocket client should reconnect
        time.sleep(10)

def on_open(ws):
    print("[+] Connected to backend WebSocket!")
    registration_msg = {
        "action": "register",
        "node_name": "probe-node-1"
    }
    ws.send(json.dumps(registration_msg))
    # Start heartbeat in background
    threading.Thread(target=send_heartbeat, args=(ws,), daemon=True).start()

def on_message(ws, message):
    try:
        msg = json.loads(message)
        print("[*] Message from backend:", msg)

        if msg.get("action") == "job":
            job_id = msg.get("job_id")
            job_type = msg.get("job_type")
            target = msg.get("target")
            port = msg.get("port", None)
            params = msg.get("params", {})  # <- Add this line

            output = ""
            success = True

            try:
                if job_type == "ping":
                    output = subprocess.check_output(
                        ["ping", "-c", "4", target],
                        stderr=subprocess.STDOUT,
                        timeout=10
                    ).decode()
                elif job_type == "traceroute":
                    output = subprocess.check_output(
                        ["traceroute", target],
                        stderr=subprocess.STDOUT,
                        timeout=20
                    ).decode()
                elif job_type == "curl":
                    output = subprocess.check_output(
                        ["curl", "-s", "-D", "-", target, "-o", "/dev/null"],
                        stderr=subprocess.STDOUT,
                        timeout=15
                    ).decode()
                elif job_type == "port_check":
                    if port is None:
                        output = "Missing 'port' argument for port_check"
                        success = False
                    else:
                        try:
                            port = int(port)
                            result = subprocess.check_output(
                                ["nc", "-zv", target, str(port)],
                                stderr=subprocess.STDOUT,
                                timeout=10
                            ).decode()
                            output = f"Port {port} open:\n" + result
                        except subprocess.CalledProcessError as e:
                            output = f"Port {port} closed or error:\n" + e.output.decode()
                        except subprocess.TimeoutExpired:
                            output = f"Port check to {target}:{port} timed out"
                            success = False
                        except Exception as e:
                            output = f"Port check error: {e}"
                            success = False
                elif job_type == "nmap":
                    ports = params.get("ports", None)
                    if ports:
                        port_str = str(ports)
                    else:
                        port_str = "1-1024"
                    cmd = ["nmap", "-p", port_str, target]
                    output = subprocess.check_output(
                        cmd,
                        stderr=subprocess.STDOUT,
                        timeout=30
                    ).decode()
                elif job_type == "dns":
                    record_type = params.get("record_type", "A")
                    resolver = params.get("resolver", None)
                    recursive = params.get("recursive", True)
                    cmd = ["dig", "+short", target, record_type]
                    if resolver:
                        cmd = ["dig", f"@{resolver}", "+short", target, record_type]
                    if not recursive:
                        cmd.append("+norecurse")
                    try:
                        output = subprocess.check_output(
                            cmd,
                            stderr=subprocess.STDOUT,
                            timeout=10
                        ).decode()
                    except Exception as e:
                        # fallback to nslookup
                        output = subprocess.check_output(
                            ["nslookup", target],
                            stderr=subprocess.STDOUT,
                            timeout=10
                        ).decode()
                elif job_type == "rdns":
                    # Reverse DNS Lookup
                    output = subprocess.check_output(
                        ["nslookup", target],
                        stderr=subprocess.STDOUT,
                        timeout=10
                    ).decode()
                elif job_type == "whois":
                    output = subprocess.check_output(
                        ["whois", target],
                        stderr=subprocess.STDOUT,
                        timeout=20
                    ).decode()
                else:
                    output = f"Unknown job_type: {job_type}"
                    success = False
            except subprocess.TimeoutExpired:
                output = f"{job_type} command timed out"
                success = False
            except Exception as e:
                output = f"{job_type} error: {e}"
                success = False

            result_msg = {
                "action": "result",
                "job_id": job_id,
                "output": output,
                "success": success
            }
            ws.send(json.dumps(result_msg))
            print(f"[*] Sent result for job {job_id}")

        else:
            print("[*] Non-job message from backend:", msg)

    except Exception as e:
        print("[!] Error in on_message:", e)

def on_error(ws, error):
    print("[!] WebSocket error:", error)

def on_close(ws, close_status_code, close_msg):
    print("[!] WebSocket closed:", close_status_code, close_msg)

def run_ws():
    while True:
        try:
            ws = websocket.WebSocketApp(
                WS_URL,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close
            )
            ws.run_forever()
        except Exception as e:
            print("[!] Exception, retrying in 5s:", e)
            time.sleep(5)

if __name__ == "__main__":
    print("Starting Probe Node WebSocket client...")
    time.sleep(10)  # Give backend extra time to start
    run_ws()
