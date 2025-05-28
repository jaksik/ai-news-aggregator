// File: /pages/api/test-fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  fetchParseAndStoreSource, // Updated function name
  SourceToFetch,
  ProcessingSummary,       // Updated result type
} from '../../lib/services/fetcher';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessingSummary | { error: string }>
) {
  if (req.method === 'GET') {
    const urlToFetch = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    const typeToFetch = (Array.isArray(req.query.type) ? req.query.type[0] : req.query.type) as SourceToFetch['type'] | undefined;
    const sourceName = Array.isArray(req.query.name) ? req.query.name[0] : req.query.name; // Get name from query

    if (!urlToFetch || !typeToFetch || !sourceName) {
      return res.status(400).json(
        { error: 'Please provide "url", "type" (rss or html), and "name" query parameters.' }
      );
    }
    // ... (validation for typeToFetch as before) ...
    if (typeToFetch !== 'rss' && typeToFetch !== 'html') {
      return res.status(400).json(
        { error: 'Invalid "type" parameter. Must be "rss" or "html".' }
      );
    }

    const source: SourceToFetch = {
      url: urlToFetch,
      type: typeToFetch,
      name: sourceName,
    };

    console.log(`--- /api/test-fetch calling fetchParseAndStoreSource for: ${source.name} ---`);
    const result: ProcessingSummary = await fetchParseAndStoreSource(source);

    if (result.status === 'failed' && result.fetchError) {
        return res.status(500).json(result);
    }
    return res.status(200).json(result);

  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}