export const runtime = "nodejs";

export function GET() {
  return Response.json({
    status: "ok",
    backendBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://backendefferenthackathon.onrender.com",
    vercel: Boolean(process.env.VERCEL)
  });
}
