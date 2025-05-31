import type { NextApiRequest, NextApiResponse } from 'next';
import { getMaxArticlesPerSource, getEffectiveArticleLimit, logArticleLimitConfig } from '../../../lib/config/articleLimits';

type Data = {
  envValue?: string;
  globalLimit?: number | null;
  effectiveLimit?: number;
  tests?: {
    [key: string]: {
      result: number | null;
      expected: number | null;
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
    const globalLimit = getMaxArticlesPerSource();
    
    logArticleLimitConfig();
    
    const tests = {
      envVariableReading: {
        result: globalLimit,
        expected: 3,
        pass: globalLimit === 3
      },
      globalOverride: {
        result: getEffectiveArticleLimit(10, 20, 30),
        expected: 3,
        pass: getEffectiveArticleLimit(10, 20, 30) === 3
      },
      defaultBehavior: {
        result: getEffectiveArticleLimit(),
        expected: 3,
        pass: getEffectiveArticleLimit() === 3
      }
    };

    // Restore console.log
    console.log = originalLog;

    res.status(200).json({
      envValue,
      globalLimit,
      effectiveLimit: getEffectiveArticleLimit(),
      tests,
      logs
    });

  } catch (error) {
    console.error('Error testing article limits:', error);
    res.status(500).json({});
  }
}
