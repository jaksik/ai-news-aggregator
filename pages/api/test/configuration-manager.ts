import { NextApiRequest, NextApiResponse } from 'next';
import { ConfigurationManager, SourceConfiguration } from '../../../lib/services/configurationManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing ConfigurationManager service...');

    const configManager = ConfigurationManager.getInstance();

    // Test 1: Test context initialization
    const context = configManager.getContext();
    console.log('Configuration context:', context);

    // Test 2: Test RSS configuration
    const rssSource: SourceConfiguration = {
      id: 'test-rss',
      name: 'Test RSS Source',
      url: 'https://example.com/feed.xml',
      type: 'rss'
    };

    const rssValidation = configManager.validateSourceConfiguration(rssSource);
    console.log('RSS validation:', rssValidation);

    const rssConfig = configManager.createRSSConfiguration(rssSource);
    console.log('RSS config:', rssConfig);

    // Test 3: Test HTML configuration
    const htmlSource: SourceConfiguration = {
      id: 'test-html',
      name: 'Scale AI Blog Test',
      url: 'https://scale.com/blog',
      type: 'html',
      scrapingConfig: {
        websiteId: 'scale-blog'
      }
    };

    const htmlValidation = configManager.validateSourceConfiguration(htmlSource);
    console.log('HTML validation:', htmlValidation);

    let htmlConfig;
    if (htmlValidation.isValid) {
      htmlConfig = configManager.createScrapingConfiguration(htmlSource);
      console.log('HTML config created successfully');
    }

    // Test 4: Test HTML configuration with custom selectors
    const htmlWithCustomSelectors: SourceConfiguration = {
      id: 'test-html-custom',
      name: 'Test HTML with Custom Selectors',
      url: 'https://example.com',
      type: 'html',
      scrapingConfig: {
        websiteId: 'scale-blog',
        customSelectors: {
          articleSelector: '.custom-article',
          titleSelector: '.custom-title'
        }
      }
    };

    const customHtmlValidation = configManager.validateSourceConfiguration(htmlWithCustomSelectors);
    console.log('Custom HTML validation:', customHtmlValidation);

    let customHtmlConfig;
    if (customHtmlValidation.isValid) {
      customHtmlConfig = configManager.createScrapingConfiguration(htmlWithCustomSelectors);
      console.log('Custom HTML config created successfully');
    }

    // Test 5: Test invalid configurations
    const invalidSource: SourceConfiguration = {
      id: '',
      name: '',
      url: 'invalid-url',
      type: 'html'
    };

    const invalidValidation = configManager.validateSourceConfiguration(invalidSource);
    console.log('Invalid source validation:', invalidValidation);

    // Test 6: Test HTML without websiteId
    const htmlWithoutWebsiteId: SourceConfiguration = {
      id: 'test-no-website-id',
      name: 'Test HTML No Website ID',
      url: 'https://example.com',
      type: 'html'
    };

    const noWebsiteIdValidation = configManager.validateSourceConfiguration(htmlWithoutWebsiteId);
    console.log('HTML without websiteId validation:', noWebsiteIdValidation);

    // Test 7: Test HTML with non-existent websiteId
    const htmlWithBadWebsiteId: SourceConfiguration = {
      id: 'test-bad-website-id',
      name: 'Test HTML Bad Website ID',
      url: 'https://example.com',
      type: 'html',
      scrapingConfig: {
        websiteId: 'non-existent-site'
      }
    };

    const badWebsiteIdValidation = configManager.validateSourceConfiguration(htmlWithBadWebsiteId);
    console.log('HTML with bad websiteId validation:', badWebsiteIdValidation);

    // Test 8: Test utility methods
    const defaults = configManager.getDefaults();
    const availableConfigs = configManager.getAvailableWebsiteConfigs();
    const hasScaleConfig = configManager.hasWebsiteConfig('scale-blog');
    const hasInvalidConfig = configManager.hasWebsiteConfig('non-existent');

    console.log('Defaults:', defaults);
    console.log('Available website configs:', availableConfigs);
    console.log('Has scale-blog config:', hasScaleConfig);
    console.log('Has non-existent config:', hasInvalidConfig);

    // Test 9: Test singleton pattern
    const configManager2 = ConfigurationManager.getInstance();
    const isSameInstance = configManager === configManager2;
    console.log('Singleton pattern works:', isSameInstance);

    const results = {
      success: true,
      tests: {
        context: context,
        rssConfiguration: {
          validation: rssValidation,
          config: rssConfig
        },
        htmlConfiguration: {
          validation: htmlValidation,
          hasConfig: !!htmlConfig,
          configValid: htmlConfig ? 'websiteId' in htmlConfig : false
        },
        customHtmlConfiguration: {
          validation: customHtmlValidation,
          hasConfig: !!customHtmlConfig,
          hasCustomSelectors: customHtmlConfig ? 
            customHtmlConfig.articleSelector === '.custom-article' : false
        },
        invalidConfiguration: {
          validation: invalidValidation,
          expectedErrors: invalidValidation.errors.length > 0
        },
        htmlWithoutWebsiteId: {
          validation: noWebsiteIdValidation,
          expectedError: noWebsiteIdValidation.errors.includes('HTML sources require scrapingConfig with websiteId')
        },
        htmlWithBadWebsiteId: {
          validation: badWebsiteIdValidation,
          expectedError: badWebsiteIdValidation.errors.some(e => e.includes('No configuration found for websiteId'))
        },
        utilities: {
          defaults: defaults,
          availableConfigs: availableConfigs,
          hasScaleConfig: hasScaleConfig,
          hasInvalidConfig: hasInvalidConfig,
          singletonWorks: isSameInstance
        }
      }
    };

    console.log('ConfigurationManager test results:', results);

    return res.status(200).json(results);

  } catch (error) {
    console.error('ConfigurationManager test error:', error);
    return res.status(500).json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
