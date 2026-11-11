/* Gọi các hàm survey_* trên Supabase. Dùng chung cho index.html và admin.html.
   Mọi hàm đều idempotent (gửi lại cùng một respondent chỉ ghi đè), nên lỗi mạng
   được thử lại vài lần trước khi báo lỗi. */
const RPC_ERRORS = ["CLOSED", "BAD_INPUT", "TOO_LARGE", "FORBIDDEN"];

class RpcError extends Error {
  constructor(code, detail) { super(detail || code); this.code = code; }
}

async function rpc(fn, args, { retries = 3 } = {}) {
  for (let attempt = 1; ; attempt++) {
    let res, body;
    try {
      res = await fetch(`${BACKEND.url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: BACKEND.key },
        body: JSON.stringify(args || {}),
      });
      body = await res.json().catch(() => null);
    } catch (e) {
      if (attempt >= retries) throw new RpcError("NETWORK", e.message);
      await new Promise(r => setTimeout(r, 600 * attempt));
      continue;
    }
    if (res.ok) return body;
    const msg = body && body.message;
    if (RPC_ERRORS.includes(msg)) throw new RpcError(msg);
    if (res.status >= 500 && attempt < retries) {
      await new Promise(r => setTimeout(r, 600 * attempt));
      continue;
    }
    throw new RpcError(res.status >= 500 ? "NETWORK" : "SERVER", msg || `HTTP ${res.status}`);
  }
}

/* Escape trước khi chèn dữ liệu người dùng vào HTML. */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
