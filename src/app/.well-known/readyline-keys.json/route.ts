import { publicKeyDocument } from "@/server/crypto/keys";

// Public signing keys (Ed25519 and ML-DSA-65) for verifying revisions and evidence exports offline.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(publicKeyDocument(), { headers: { "Cache-Control": "public, max-age=3600" } });
}
