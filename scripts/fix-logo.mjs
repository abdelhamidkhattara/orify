import { createClient } from "@libsql/client";
import path from "path";

const abs = path.join(process.cwd(), "data", "orify.db");
const c = createClient({ url: `file:${abs}` });
await c.execute({
  sql: "UPDATE shops SET logo_url = ? WHERE is_demo = 1",
  args: ["/brand/sportif-logo.webp"],
});
console.log("logo updated");
const rows = await c.execute("SELECT code, status FROM codes");
console.log(rows.rows);
