import type { NextApiRequest, NextApiResponse } from 'next';
import {
  fetchAndInitiallyProcessSource,
  SourceToFetch,
  FetchResult,
} from '../../lib/services/fetcher'; // Ensure this path is correct

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FetchResult | { error: string }> // The response can be FetchResult or a simple error object
) {
  // We only want to handle GET requests for this endpoint
  if (req.method === 'GET') {
    // Extract 'url' and 'type' from the query parameters.
    // req.query values can be string or string[], so we handle the array case by taking the first element.
    const urlToFetch = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    const typeToFetch = (Array.isArray(req.query.type) ? req.query.type[0] : req.query.type) as SourceToFetch['type'] | undefined;

    // Validate the presence of required query parameters
    if (!urlToFetch || !typeToFetch) {
      return res.status(400).json(
        { error: 'Please provide "url" and "type" (rss or html) query parameters.' }
      );
    }

    // Validate the 'type' parameter
    if (typeToFetch !== 'rss' && typeToFetch !== 'html') {
      return res.status(400).json(
        { error: 'Invalid "type" parameter. Must be "rss" or "html".' }
      );
    }

    const source: SourceToFetch = {
      url: urlToFetch,
      type: typeToFetch,
    };

    console.log(`--- /api/test-fetch (Pages Router) received request for: ${source.url} (type: ${source.type}) ---`);
    const result: FetchResult = await fetchAndInitiallyProcessSource(source);

    if (result.success) {
      // If the fetcher service indicates success, return 200 with the result
      return res.status(200).json(result);
    } else {
      // If the fetcher service indicates failure, return 500 (or a more specific error code if available)
      // The 'result' object itself contains the 'error' message from the fetcher.
      return res.status(500).json(result);
    }

  } else {
    // Handle any other HTTP methods (e.g., POST, PUT) by disallowing them
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}