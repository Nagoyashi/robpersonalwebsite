/**
 * monitors.ts — derive uptime monitor targets from products.ts.
 *
 * A project is monitorable if it exposes a real hosted endpoint (a live/beta
 * app with a site URL that isn't an external profile). Everything else lands in
 * the "no public endpoint" list with a reason. No invented URLs — targets come
 * straight from products.ts.
 */
import { products, type Product } from '../../config/products';

export interface Monitor {
  slug: string;
  name: string;
  host: string;
  url: string;
}
export interface NoEndpoint {
  slug: string;
  name: string;
  reason: string;
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const isMonitorable = (p: Product): boolean => {
  if (!p.siteUrl || p.manualOnly) return false;
  if (host(p.siteUrl).includes('linkedin.com')) return false;
  return p.status === 'live' || p.status === 'beta';
};

export function monitors(): Monitor[] {
  return products.filter(isMonitorable).map((p) => ({
    slug: p.slug,
    name: p.name,
    host: host(p.siteUrl!),
    url: p.siteUrl!,
  }));
}

export function noEndpoint(): NoEndpoint[] {
  return products.filter((p) => !isMonitorable(p)).map((p) => {
    let reason = 'not deployed';
    if (p.manualOnly || (p.siteUrl && host(p.siteUrl).includes('linkedin.com'))) reason = 'external';
    else if (p.kind === 'cli') reason = 'cli tool';
    return { slug: p.slug, name: p.name, reason };
  });
}
