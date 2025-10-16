import { treaty } from "@elysiajs/eden";
import type { App } from "../../../backend/src/index";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = treaty<App>(API_URL);