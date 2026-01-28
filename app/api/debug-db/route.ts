export const runtime = "nodejs";

function host(u?: string) {
  return (u || "").split("@")[1]?.split("/")[0] || "(missing)";
}

export async function GET() {
  return Response.json({
    databaseUrlHost: host(process.env.DATABASE_URL),
    directUrlHost: host(process.env.DIRECT_URL),
    vercelEnv: process.env.VERCEL_ENV,
  });
}
