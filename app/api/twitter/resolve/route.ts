import { handleResolve } from "@/lib/downloader/api-helpers";
import { TwitterProvider } from "@/lib/downloader/providers";
import { guardApiRequest } from "@/lib/api-shield";

export async function POST(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  return handleResolve(req, {
    rateKey: "twitter",
    provider: TwitterProvider,
  });
}
