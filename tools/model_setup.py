"""One-use loopback form for configuring this POPO work. Never logs a key."""
import argparse
import json
import secrets
import sys
import threading
from copy import deepcopy
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
SLUG = 'bencao-tcm-tm'
DEFAULT_MODEL = 'gpt-6.1-sol'


def merge_model(config, key):
    if config is None:
        config = {'version': 1, 'services': {}, 'routes': []}
    if config.get('version') != 1 or not isinstance(config.get('services'), dict):
        raise ValueError('Unsupported configuration')
    result = deepcopy(config)
    names = [name for name, service in result['services'].items() if service.get('type') == 'oneapi']
    if len(names) > 1:
        raise ValueError('Ambiguous model services')
    name = names[0] if names else 'model'
    if not names:
        while name in result['services']:
            name += '_oneapi'
    result['services'].setdefault(name, {}).update(type='oneapi', enabled=True, apiKey=key)
    return result


def validate_input(data):
    if not isinstance(data, dict):
        raise ValueError('Invalid input')
    model, key = data.get('model'), data.get('key')
    if not isinstance(model, str) or not 1 <= len(model.strip()) <= 128 or any(ord(c) < 32 for c in model):
        raise ValueError('Invalid model')
    if not isinstance(key, str) or not 10 <= len(key.strip()) <= 4096 or any(ord(c) < 33 or ord(c) > 126 for c in key.strip()):
        raise ValueError('Invalid key')
    return model.strip(), key.strip()


HTML = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>本草 · 模型连接</title>
<style nonce="__NONCE__">
*{box-sizing:border-box}body{margin:0;background:#f1f5ed;color:#304936;font:15px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;min-height:100dvh;display:grid;place-items:center;padding:24px}main{max-width:540px;width:100%;background:#fff;border:1px solid #e0e8d9;border-radius:24px;padding:34px;box-shadow:0 15px 60px #304f3010}.eyebrow{font-size:11px;letter-spacing:2px;color:#829477}h1{font-family:"Songti SC",serif;font-size:28px;font-weight:500;margin:10px 0}p{font-size:13px;color:#7a8874}.target{font-size:12px;padding:13px;background:#f1f6eb;border-radius:10px;margin:20px 0;overflow-wrap:anywhere}.target strong{color:#4d6b42}label{display:block;font-size:13px;margin:23px 0 8px;font-weight:600}input{width:100%;font:14px/1.6 inherit;border:1px solid #d7e2cf;border-radius:10px;padding:12px;color:#334c35;background:#fcfdf9;outline:none}input:focus{border-color:#7d9b6e;box-shadow:0 0 0 3px #e9f0e1}small{display:block;font-size:11px;color:#8b9784;margin-top:7px}button{font:inherit;cursor:pointer;border:0;border-radius:10px;background:#446b47;color:white;width:100%;padding:13px;margin-top:24px}button:disabled{opacity:.55;cursor:default}#status{font-size:13px;white-space:pre-line;padding:14px;background:#eff5e8;border-radius:9px;margin-top:16px}#status:empty{display:none}.note{border-top:1px solid #edf1e7;padding-top:15px;margin-top:23px;font-size:11px;color:#8a9782}a{color:#4a704c}input,button{font-family:inherit}details{margin-top:16px;color:#7f8b75;font-size:12px}details ul{padding-left:18px}summary{cursor:pointer}footer{font-size:10px;color:#9ba590;text-align:center;margin-top:20px}
</style></head><body><main><div class="eyebrow">本草 · 仅在本机填写</div><h1>把问答模型接进来</h1><p>填写一次，保存后由我继续调试。Key 将保存在 POPO 服务端，不进入作品源码。</p><div class="target"><strong>配置作品</strong><br>本草 · 中医健康助手<br>bencao-tcm-tm.popo.baidu-int.com</div>
<form id="setup" autocomplete="off"><label for="model">模型名称 / Model ID</label><input id="model" name="model" value="gpt-6.1-sol" list="models" required maxlength="128" spellcheck="false"><datalist id="models"><option value="gpt-6.1-sol"><option value="gpt-6-astra"><option value="DeepSeek-V4.1-Flash"><option value="Claude Sonnet 5.5"></datalist><small>暂选 gpt-6.1-sol。请使用网关认可的准确 ID；展示名称可能与 ID 不同。</small>
<label for="key">OneAPI Key</label><input id="key" name="key" type="password" autocomplete="new-password" placeholder="在这里粘贴你的 Key" required minlength="10" maxlength="4096" spellcheck="false"><small>此窗口连接 POPO 内置 OneAPI 服务。无需把 Key 发给我。</small>
<button id="save" type="submit">保存配置，交给我调试</button><div id="status" role="status" aria-live="polite"></div></form>
<details><summary>为什么暂选这个模型？</summary><ul><li>先验证知识解答、必要追问和连续对话的表现。</li><li>以 gpt-6-astra 作质量对照，再比较 Flash 候选的实际响应速度。</li><li>这是测试起点，不是医疗准确性排名。</li></ul></details><p class="note">Key 仅从本机发送给本作品的 POPO 配置接口。窗口不记录 Key 到磁盘、浏览器存储或日志。保存成功不代表问答验收通过，我会继续检查实际响应。</p><footer>本地配置窗口不会发布给作品访客</footer></main>
<script nonce="__NONCE__">
const form=document.querySelector('#setup'),button=document.querySelector('#save'),status=document.querySelector('#status'),keyInput=document.querySelector('#key');
form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;status.textContent='正在保存到 POPO，请稍候…';const payload={model:document.querySelector('#model').value,key:keyInput.value};try{const response=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json','X-Setup-Token':'__TOKEN__'},body:JSON.stringify(payload)});keyInput.value='';payload.key='';const result=await response.json();status.textContent=result.message;if(result.ok){button.textContent='已保存 · 等待调试';form.querySelectorAll('input').forEach(el=>el.disabled=true);}else button.disabled=false;}catch{keyInput.value='';payload.key='';status.textContent='未能确认保存结果。请告诉我页面提示，我会先核对服务端配置，避免重复提交。';button.textContent='等待核对保存状态';}});
</script></body></html>'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=18767)
    parser.add_argument('--skill-dir', default='/tmp/tcm-popo-skill/popo/scripts')
    args = parser.parse_args()
    sys.path.insert(0, args.skill_dir)
    import proxy
    from schema import DEFAULT_API_BASE, DEFAULT_API_HOST, resolve_auth
    api_args = argparse.Namespace(slug=SLUG, username='tangming04', token=None, api_base=DEFAULT_API_BASE, api_host=DEFAULT_API_HOST)
    nonce, token = secrets.token_urlsafe(24), secrets.token_urlsafe(24)
    path = '/configure/' + secrets.token_urlsafe(24)
    origin = f'http://127.0.0.1:{args.port}'
    host = f'127.0.0.1:{args.port}'
    html = HTML.replace('__NONCE__', nonce).replace('__TOKEN__', token).encode()
    saved = {'done': False}
    lock = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def reply(self, status, body, content_type='application/json; charset=utf-8'):
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', f"default-src 'none'; script-src 'nonce-{nonce}'; style-src 'nonce-{nonce}'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'")
            self.end_headers()
            self.wfile.write(body)

        def message(self, status, ok, text):
            self.reply(status, json.dumps({'ok': ok, 'message': text}, ensure_ascii=False).encode())

        def do_GET(self):
            if self.headers.get('Host') != host or self.path != path:
                self.message(404, False, '页面不存在。')
                return
            self.reply(200, html, 'text/html; charset=utf-8')

        def do_POST(self):
            if (self.path != path or self.headers.get('Host') != host or
                    self.headers.get('Origin') != origin or
                    self.headers.get('X-Setup-Token') != token or
                    self.headers.get('Content-Type') != 'application/json'):
                self.message(403, False, '请求来源不匹配。请使用已打开的本地配置窗口。')
                return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 16384:
                    raise ValueError('Invalid length')
                model, key = validate_input(json.loads(self.rfile.read(length)))
            except (ValueError, UnicodeError):
                self.message(400, False, '请检查模型名称和 Key，勿包含多余换行或空格。')
                return
            with lock:
                if saved['done']:
                    self.message(409, False, '配置已经保存，请等待调试。')
                    return
                try:
                    auth = resolve_auth(api_args)
                    current = proxy.request_config(api_args, auth)
                    config = merge_model(current, key)
                    result = proxy.request_config(api_args, auth, json.dumps(config, ensure_ascii=False).encode())
                    services = [s for s in result['services'].values() if s.get('type') == 'oneapi']
                    if len(services) != 1 or services[0].get('enabled') is not True:
                        raise ValueError('Save not confirmed')
                    # Only the nonsecret model ID and completion state are persisted locally.
                    (PROJECT / 'public/config.js').write_text('// Model ID only. The OneAPI key is stored by POPO.\nexport const MODEL = ' + json.dumps(model, ensure_ascii=False) + ';\n')
                    (PROJECT / '.local-setup-status.json').write_text(json.dumps({'status': 'saved', 'model': model, 'savedAt': datetime.now(timezone.utc).isoformat(), 'modelResponseVerified': False}, ensure_ascii=False, indent=2))
                    saved['done'] = True
                    key = ''
                    self.message(200, True, '配置已保存，Key 已从输入框清除。\n请回到对话告诉我“已填写”，我会发布所选模型并验证真实问答。')
                except (SystemExit, OSError, ValueError, KeyError):
                    self.message(502, False, '尚未确认配置保存成功。请告诉我，我会先核对 POPO 当前状态；不要重复填写或发送 Key。')

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(origin + path, flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
