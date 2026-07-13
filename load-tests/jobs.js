import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API_BASE || "https://api.yourrulesgame.ru/api";

export const options = {
  scenarios: {
    jobs: {
      executor: "per-vu-iterations",
      vus: Number(__ENV.JOB_VUS || 2),
      iterations: Number(__ENV.JOB_ITERATIONS || 1),
      maxDuration: "10m",
    },
  },
};

export function setup() {
  if (__ENV.ALLOW_PAID_LOAD !== "YES") throw new Error("This test creates paid AI work. Set ALLOW_PAID_LOAD=YES deliberately.");
  if (!__ENV.TEST_EMAIL || !__ENV.TEST_PASSWORD || !__ENV.SESSION_ID) throw new Error("Set TEST_EMAIL, TEST_PASSWORD and SESSION_ID");
  const login = http.post(`${API}/auth/web/login`, JSON.stringify({ email: __ENV.TEST_EMAIL, password: __ENV.TEST_PASSWORD }), { headers: { "Content-Type": "application/json" } });
  return { cookie: login.headers["Set-Cookie"], sessionId: __ENV.SESSION_ID };
}

export default function (data) {
  const queued = http.post(`${API}/jobs/image`, JSON.stringify({ session_id: data.sessionId }), { headers: { "Content-Type": "application/json", Cookie: data.cookie } });
  check(queued, { "job queued": (response) => response.status === 200 });
  if (queued.status !== 200) return;
  const jobId = queued.json("job_id");
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const status = http.get(`${API}/jobs/${jobId}`, { headers: { Cookie: data.cookie } });
    if (["completed", "failed"].includes(status.json("status"))) break;
    sleep(1);
  }
}
