import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API_BASE || "https://api.yourrulesgame.ru/api";
const EMAIL = __ENV.TEST_EMAIL;
const PASSWORD = __ENV.TEST_PASSWORD;

export const options = {
  scenarios: {
    home: {
      executor: "constant-vus",
      vus: Number(__ENV.HOME_VUS || 10),
      duration: __ENV.DURATION || "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<900"],
  },
};

export function setup() {
  if (!EMAIL || !PASSWORD) throw new Error("Set TEST_EMAIL and TEST_PASSWORD for a dedicated load-test account");
  const login = http.post(`${API}/auth/web/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
    headers: { "Content-Type": "application/json" },
  });
  check(login, { "login succeeds": (response) => response.status === 200 });
  return { cookie: login.headers["Set-Cookie"] };
}

export default function (data) {
  const response = http.get(`${API}/home`, { headers: { Cookie: data.cookie } });
  check(response, { "home 200": (item) => item.status === 200, "home has profile": (item) => item.json("profile.user_id") !== undefined });
  sleep(0.25);
}
