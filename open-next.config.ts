import { defineCloudflareConfig } from '@opennextjs/cloudflare'

export default defineCloudflareConfig({
  // Standard OpenNext Cloudflare configuration without mandatory R2 bucket setup,
  // keeping Cloudflare Free plan compatibility intact.
  // To enable R2 incremental caching later, import r2IncrementalCache and add r2_buckets in wrangler.jsonc.
})
