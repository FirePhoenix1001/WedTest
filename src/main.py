# src/web_server.py
import os
import sys
import queue
import threading
import subprocess
import zipfile
import tempfile
import urllib.request
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

# Add parent directory to path so imports work correctly when executing web_server.py directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import youtubeDownload
import mediaCut
from audioProcessor import AudioProcessor

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Global Thread-Safe Queue for logs and progress streaming
log_queue = queue.Queue()
original_stdout = sys.stdout
original_stderr = sys.stderr

# Custom Logger to intercept stdout/stderr prints
class QueueLogger:
    def __init__(self, q, stream):
        self.q = q
        self.stream = stream

    def write(self, text):
        if text:
            # If text is bytes, decode it to string for queue
            if isinstance(text, bytes):
                try:
                    text = text.decode(getattr(self.stream, 'encoding', 'utf-8') or 'utf-8', errors='replace')
                except Exception:
                    text = str(text)

            # Filter out repetitive poller logs to keep terminal and UI console clean
            if "GET /api/status" in text or "GET /api/files" in text:
                return

            # Put string log into the queue
            self.q.put(text)

            # Write to the original terminal stream safely
            try:
                self.stream.write(text)
            except UnicodeEncodeError:
                encoding = getattr(self.stream, 'encoding', 'utf-8') or 'utf-8'
                clean_text = text.encode(encoding, errors='replace').decode(encoding)
                try:
                    self.stream.write(clean_text)
                except Exception:
                    pass
            except TypeError:
                try:
                    encoding = getattr(self.stream, 'encoding', 'utf-8') or 'utf-8'
                    self.stream.write(text.encode(encoding, errors='replace'))
                except Exception:
                    pass
            except Exception:
                pass

    def flush(self):
        try:
            self.stream.flush()
        except Exception:
            pass

# Redirect standard outputs to our QueueLogger
sys.stdout = QueueLogger(log_queue, original_stdout)
sys.stderr = QueueLogger(log_queue, original_stderr)

# Global states
running_task = {
    "active": False,
    "type": None,  # "download", "cut", "transcribe"
    "progress": 0.0
}
audio_processor = None

def progress_callback(val):
    """Sends progress markers directly into the log stream"""
    running_task["progress"] = val
    log_queue.put(f"[PROGRESS] {int(val * 100)}\n")

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/status')
def get_status():
    return jsonify(running_task)

@app.route('/api/stream-logs')
def stream_logs():
    def event_generator():
        yield "data: [SYSTEM] 成功連接至向日葵日誌串流服務... 🌻\n\n"
        while True:
            try:
                # Wait for logs for up to 1 second
                log_msg = log_queue.get(timeout=1.0)
                yield f"data: {log_msg}\n\n"
            except queue.Empty:
                # Send empty ping to keep client connection alive
                yield ": ping\n\n"
    return Response(event_generator(), mimetype='text/event-stream')

@app.route('/api/download', methods=['POST'])
def start_download():
    if running_task["active"]:
        return jsonify({"success": False, "message": "目前有其他任務正在執行中，請稍候。"}), 400

    data = request.json or {}
    url = data.get("url")
    mode = data.get("mode", "3") # Default mode 3 (Merged)

    if not url:
        return jsonify({"success": False, "message": "請輸入影片網址！"}), 400

    def download_thread_func():
        try:
            running_task["active"] = True
            running_task["type"] = "download"
            running_task["progress"] = 0.0
            print(f"\n--- 下載任務開始 ---")
            print(f"網址: {url}")
            print(f"模式: {mode} (1:僅影像, 2:僅聲音, 3:合併)")
            
            youtubeDownload.download_video(url, mode, progress_callback=progress_callback)
            
            running_task["progress"] = 1.0
            print(f"--- 下載任務成功完成！ ---")
        except Exception as e:
            print(f"--- 下載發生錯誤: {str(e)} ---")
        finally:
            running_task["active"] = False
            running_task["type"] = None

    threading.Thread(target=download_thread_func, daemon=True).start()
    return jsonify({"success": True, "message": "下載任務已啟動。"})

@app.route('/api/cut', methods=['POST'])
def start_cut():
    if running_task["active"]:
        return jsonify({"success": False, "message": "目前有其他任務正在執行中，請稍候。"}), 400

    data = request.json or {}
    input_path = data.get("input_path")
    start_time = data.get("start_time", "00:00:00")
    end_time = data.get("end_time", "00:00:10")

    if not input_path or not os.path.exists(input_path):
        return jsonify({"success": False, "message": "找不到指定的來源檔案！"}), 400

    def cut_thread_func():
        try:
            running_task["active"] = True
            running_task["type"] = "cut"
            running_task["progress"] = 0.0
            print(f"\n--- 剪輯任務開始 ---")
            print(f"檔案: {os.path.basename(input_path)}")
            print(f"時間區間: {start_time} -> {end_time}")
            
            # Start progress simulation
            progress_callback(0.2)
            success, result = mediaCut.cut_video(input_path, start_time, end_time)
            
            if success:
                progress_callback(1.0)
                print(f"--- 剪輯成功！輸出檔案: {result} ---")
            else:
                progress_callback(0.0)
                print(f"--- 剪輯失敗: {result} ---")
        except Exception as e:
            progress_callback(0.0)
            print(f"--- 剪輯發生異常錯誤: {str(e)} ---")
        finally:
            running_task["active"] = False
            running_task["type"] = None

    threading.Thread(target=cut_thread_func, daemon=True).start()
    return jsonify({"success": True, "message": "剪輯任務已啟動。"})

@app.route('/api/transcribe', methods=['POST'])
def start_transcribe():
    if running_task["active"]:
        return jsonify({"success": False, "message": "目前有其他任務正在執行中，請稍候。"}), 400

    data = request.json or {}
    input_path = data.get("input_path")
    model_size = data.get("model_size", "large-v3")
    show_timestamps = data.get("show_timestamps", True)

    if not input_path or not os.path.exists(input_path):
        return jsonify({"success": False, "message": "找不到指定的音訊/影片檔案！"}), 400

    def transcribe_thread_func():
        global audio_processor
        try:
            running_task["active"] = True
            running_task["type"] = "transcribe"
            running_task["progress"] = 0.0
            print(f"\n--- 語音辨識任務開始 ---")
            print(f"檔案: {os.path.basename(input_path)}")
            print(f"模型大小: {model_size}")
            
            # Load or switch Whisper model
            if audio_processor is None or audio_processor.model_size != model_size:
                print(f"正在建立或更換 Whisper 語音模型 ({model_size})，這在首次或切換模型時會花費較長的時間...")
                audio_processor = AudioProcessor(model_size=model_size)
            
            output_path = os.path.splitext(input_path)[0] + "_辨識結果.txt"
            
            audio_processor.transcribe(
                input_path,
                output_file=output_path,
                progress_callback=progress_callback,
                show_timestamps=show_timestamps
            )
            
            progress_callback(1.0)
            print(f"--- 語音辨識成功！輸出結果已儲存於: {output_path} ---")
        except Exception as e:
            progress_callback(0.0)
            print(f"--- 語音辨識出錯: {str(e)} ---")
        finally:
            running_task["active"] = False
            running_task["type"] = None

    threading.Thread(target=transcribe_thread_func, daemon=True).start()
    return jsonify({"success": True, "message": "語音辨識任務已啟動。"})

@app.route('/api/files', methods=['GET'])
def list_files():
    # List files in the project root directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    allowed_extensions = {'.mp4', '.mkv', '.webm', '.mov', '.avi', '.mp3', '.wav', '.m4a', '.txt'}
    
    files_list = []
    try:
        for file in os.listdir(base_dir):
            file_path = os.path.join(base_dir, file)
            if os.path.isfile(file_path):
                name, ext = os.path.splitext(file)
                if ext.lower() in allowed_extensions:
                    stat = os.stat(file_path)
                    files_list.append({
                        "name": file,
                        "size_mb": round(stat.st_size / (1024 * 1024), 2),
                        "mtime": stat.st_mtime,
                        "path": os.path.abspath(file_path)
                    })
        # Sort by modification time (newest first)
        files_list.sort(key=lambda x: x["mtime"], reverse=True)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    return jsonify({"success": True, "files": files_list})

@app.route('/api/open-folder', methods=['POST'])
def open_folder():
    try:
        # Open working dir
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        os.startfile(os.path.normpath(base_dir))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/open-file', methods=['POST'])
def open_file():
    data = request.json or {}
    file_path = data.get("path")
    if not file_path or not os.path.exists(file_path):
        return jsonify({"success": False, "message": "找不到該檔案！"}), 400
    try:
        os.startfile(file_path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/delete-file', methods=['POST'])
def delete_file():
    data = request.json or {}
    file_path = data.get("path")
    if not file_path or not os.path.exists(file_path):
        return jsonify({"success": False, "message": "找不到該檔案！"}), 400
    try:
        os.remove(file_path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/check-tools', methods=['GET'])
def check_tools():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    search_paths = [
        base_dir,
        os.path.join(base_dir, "tools"),
        os.path.join(base_dir, "src")
    ]
    ffmpeg_exists = False
    ffprobe_exists = False
    
    for d in search_paths:
        if os.path.exists(os.path.join(d, "ffmpeg.exe")):
            ffmpeg_exists = True
        if os.path.exists(os.path.join(d, "ffprobe.exe")):
            ffprobe_exists = True
            
    return jsonify({
        "ffmpeg": ffmpeg_exists,
        "ffprobe": ffprobe_exists,
        "installed": ffmpeg_exists and ffprobe_exists
    })

@app.route('/api/install-tools', methods=['POST'])
def install_tools():
    if running_task["active"]:
        return jsonify({"success": False, "message": "目前有其他任務正在執行中，請稍候。"}), 400
        
    def install_thread_func():
        try:
            running_task["active"] = True
            running_task["type"] = "install"
            running_task["progress"] = 0.0
            print("\n--- 開始自動下載安裝 FFmpeg 與 FFprobe 組件 ---")
            
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            tools_dir = os.path.join(base_dir, "tools")
            if not os.path.exists(tools_dir):
                os.makedirs(tools_dir)
                
            urls = {
                "ffmpeg": "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffmpeg-6.1-win-64.zip",
                "ffprobe": "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffprobe-6.1-win-64.zip"
            }
            
            headers = {'User-Agent': 'Mozilla/5.0'}
            total_steps = len(urls)
            for idx, (name, url) in enumerate(urls.items()):
                step_progress_start = idx / total_steps
                progress_callback(step_progress_start + 0.1)
                
                dest_exe = os.path.join(tools_dir, f"{name}.exe")
                if os.path.exists(dest_exe):
                    print(f"[SYSTEM] {name}.exe 已經存在，跳過。")
                    continue
                    
                print(f"[SYSTEM] 正在從 CDN 下載 {name} 組件包...")
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req) as response:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp_file:
                        tmp_file.write(response.read())
                        tmp_path = tmp_file.name
                
                progress_callback(step_progress_start + 0.4)
                print(f"[SYSTEM] 正在解壓縮並安裝 {name}.exe 至 tools 目錄...")
                with zipfile.ZipFile(tmp_path, 'r') as zip_ref:
                    zip_ref.extract(f"{name}.exe", tools_dir)
                    
                os.remove(tmp_path)
                print(f"[SYSTEM] {name}.exe 安裝成功！")
                
            progress_callback(1.0)
            print("--- 所有必要組件已成功下載與安裝！請重新整理網頁。 ---")
        except Exception as e:
            progress_callback(0.0)
            print(f"--- 下載安裝失敗: {str(e)} ---")
        finally:
            running_task["active"] = False
            running_task["type"] = None
            
    threading.Thread(target=install_thread_func, daemon=True).start()
    return jsonify({"success": True, "message": "安裝任務已在背景啟動。"})

@app.route('/api/uninstall-tools', methods=['POST'])
def uninstall_tools():
    if running_task["active"]:
        return jsonify({"success": False, "message": "目前有其他任務正在執行中，無法解除安裝。"}), 400
        
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        search_paths = [
            base_dir,
            os.path.join(base_dir, "tools"),
            os.path.join(base_dir, "src")
        ]
        deleted_count = 0
        for d in search_paths:
            for name in ["ffmpeg.exe", "ffprobe.exe"]:
                file_path = os.path.join(d, name)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_count += 1
                    
        print(f"\n[SYSTEM] 已成功從系統中移除 {deleted_count} 個組件檔案。")
        return jsonify({"success": True, "message": "必要組件已成功解除安裝！"})
    except Exception as e:
        return jsonify({"success": False, "message": f"解除安裝失敗: {str(e)}"}), 500

if __name__ == '__main__':
    # Make sure we run on 8000
    print("[Sunflower] 向日葵本地網頁伺服器啟動中，請打開 http://localhost:8000")
    app.run(host='127.0.0.1', port=8000, debug=False)
