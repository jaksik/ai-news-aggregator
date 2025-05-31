import type { NextApiRequest, NextApiResponse } from 'next';
import { getMaxArticlesPerSource } from '../../../lib/config/articleLimits';

type Data = {
  envValue?: string;
  maxArticles?: number;
  tests?: {
    [key: string]: {
      result: number;
      expected: number;
      pass: boolean;
    };
  };
  logs?: string[];
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({});
  }

  try {
    const logs: string[] = [];
    
    // Capture console.log output
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    const envValue = process.env.MAX_ARTICLES_PER_SOURCE;
    const maxArticles = getMaxArticlesPerSource();
    
    const tests = {
      envVariableReading: {
        result: maxArticles,
        expected: 5, // Current value in .env.local
        pass: maxArticles === 5
      },
      envVariableHandling: {
        result: maxArticles,
        expected: envValue ? parseInt(envValue) : 20,
        pass: maxArticles === (envValue ? parseInt(envValue) : 20)
      }
    };

    // Restore console.log
    console.log = originalLog;

    res.status(200).json({
      envValue,
      maxArticles,
      tests,
      logs
    });

  } catch (error) {
    console.error('Error testing article limits:', error);
    res.status(500).json({});
  }
}
