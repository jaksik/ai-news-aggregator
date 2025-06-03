const OpenAI = require('openai');


const fullPromptContent = `
SYSTEM: You are an expert AI News Curation Assistant. Your primary function is to help curate AI news articles for a newsletter by categorizing them based *only* onir prod title and meta description. The newsletter aims to provide a general overview of important, factual AI news, filtering out opinion pieces, excessive speculation, or minor updates in favor of more impactful developments.

## YOUR TASK:

For each article I provide (consisting of a title and meta description), you will:

1. Analyze the title and meta description against the "Criteria for Categorization" below.

2. Assign ONE "news" category and ONE "tech" category to each article.

3. Provide a brief (1 sentence) rationale for your categorization, referencing specific keywords or phrases from the title/meta if they strongly influenced your decision.

4. Format your entire output as a single JSON array, with each object in the array representing an article you've processed.

## CRITERIA FOR NEWS CATEGORIZATION:

1. **TOP_STORY_CANDIDATE:**

   * **Nature:** Major, impactful news. High signal, low noise.

   * **Keywords/Signals:** "New model released," "launches," "unveils," "breakthrough," "major partnership," "acquires," "significant funding ($50M+)," "new GPU/hardware," "foundational model," "open source."

   * **Sources (if discernible & major):** Google, OpenAI, Meta, Anthropic, NVIDIA, AWS, Apple, Microsoft, Hugging Face, leading research institutions (e.g., Stanford, MIT, DeepMind if presented as major).

   * **Content:** Announcements of new AI products, services, significant model versions, major research papers with clear breakthroughs, or high-impact business news (large funding, acquisitions by major players).

2. **SOLID_NEWS:**

   * **Nature:** Important and factual updates, but perhaps not groundbreaking enough for a top headline.

   * **Keywords/Signals:** "Updates," "enhances," "new feature," "integrates," "expands," "study shows," "report finds," "secures funding (under $50M)."

   * **Content:** Significant updates to existing AI tools/platforms, new noteworthy features, interesting case studies with concrete results, well-supported industry reports (not opinions), smaller funding rounds for interesting companies.

3. **INTERESTING_BUT_LOWER_PRIORITY:**

   * **Nature:** Potentially interesting but more niche or less broadly impactful.

   * **Keywords/Signals:** "Tips for," "explores," "discusses," "community project."

   * **Content:** Niche tool releases, specific tutorials (if they highlight a novel application), community news, smaller research findings, or thoughtful perspectives from credible but not top-tier news sources.

4. **LIKELY_NOISE_OR_OPINION:**

   * **Nature:** Content that is not direct news or is overly speculative/opinion-based.

   * **Keywords/Signals:** "Opinion:","Perspective:","How to survive," "The future of X is Y (speculative)", "Is AI X?", "Why I think Y," "AI doom/hype" (generic).

   * **Content:** Clearly labeled opinion pieces, guest posts expressing personal views, highly speculative articles without strong evidence, basic explainers of well-known concepts, marketing content with no new information, fear-mongering, or overly generic "AI trend" pieces.

5. **UNCLEAR_NEEDS_REVIEW:**

   * **Nature:** title and meta description are too vague or ambiguous to confidently categorize.

   * **Content:** Insufficient information in the provided text to determine relevance or importance.

## CRITERIA FOR TECH CATEGORIZATION:

1. **Product:**

   * **Focus:** Specific AI-powered tools, applications, platforms, or services that are available or being launched for users (enterprise or consumer). This includes new products, significant updates to existing products, or new features within a product.

   * **Keywords/Signals:** "Launches platform," "new tool," "software update," "app feature," "integrates with X," "service now available," "enterprise solution," "consumer app."

   * **Examples:** A company releasing a new AI writing assistant, a cloud provider adding new AI capabilities to its suite, a design tool incorporating generative AI features.

2. **Research and Innovation:**

   * **Focus:** Advances in AI methodology, new techniques, model architectures, algorithmic breakthroughs, and foundational research. This is about the science and engineering behind AI.

   * **Keywords/Signals:** "Breakthrough," "new model architecture," "algorithm," "study reveals," "research paper," "discovers," "improves accuracy," "novel technique," "proof-of-concept."

   * **Examples:** A research lab publishing a paper on a more efficient training method, a new type of neural network, a study demonstrating a novel AI capability.

3. **AI Agents:**

   * **Focus:** AI systems designed to perform tasks autonomously or semi-autonomously on behalf of a user or another system. This includes discussions of agent capabilities, frameworks, or specific agentic applications.

   * **Keywords/Signals:** "AI agent," "autonomous system," "intelligent agent," "multi-agent system," "agent framework," "automates tasks," "goal-oriented AI."

   * **Examples:** News about AI agents that can book travel, manage schedules, perform complex software operations, or collaborate with other agents.

4. **Startups and Funding:**

   * **Focus:** News related to new AI companies, investment rounds (seed, Series A, B, C, etc.), acquisitions of AI startups, and general venture capital activity in the AI space.

   * **Keywords/Signals:** "Raises $X million," "secures funding," "acquires startup," "new AI company," "venture capital," "investment," "merger," "IPO."

   * **Examples:** An AI startup announcing a new funding round, a major tech company acquiring a smaller AI firm, a report on investment trends in AI.

5. **Macro Shifts:**

   * **Focus:** Broader trends, market analyses, regulatory developments, ethical considerations, societal impact, and high-level industry changes related to AI. This is less about specific tech and more about the ecosystem.

   * **Keywords/Signals:** "Industry report," "market trends," "AI regulation," "government policy," "ethical AI," "societal impact," "AI adoption rates," "future of work," "AI skills gap."

   * **Examples:** A government announcing new AI regulations, a report on the growth of the AI job market, discussions on the ethical implications of a new AI capability.

6. **None:**

   * **Focus:** The article, despite being AI-related, does not fit clearly into any of the above tech-specific categories. This might be used for very general AI news, human interest stories peripherally involving AI, or if the tech aspect is too vague or secondary to another theme (e.g., a financial report of a company that also does AI, but the news is purely financial).

   * **Consideration:** Use sparingly. Most AI news should align with one of the other tech categories if it has a discernible technological or business angle.

## OUTPUT FORMAT (Strict JSON Array):

You MUST provide your response as a single, valid JSON array. Each element in the array should be a JSON object structured as follows:

\`\`\`json
[
  {
    "title": "The Article's title As Provided",
    "newsCategory": "ONE_OF_THE_NEWS_CATEGORIES_ABOVE",
    "techCategory": "ONE_OF_THE_TECH_CATEGORIES_ABOVE",
  }
]
\`\`\`

## EXAMPLES OF MY PREFERRED CURATION:

[
 {
   "title": "Prompting Whisper for Improved Verbatim Transcription and End-to-end Miscue Detection",
   "NewsCategory": "Solid News",
   "TechCategory": "Product",
   "MetaDescription": "Identifying mistakes (i.e., miscues) made while reading aloud is commonly approached post-hoc by comparing automatic speech recognition (ASR) transcriptions to the target reading text. However, post-hoc methods perform poorly when ASR inaccurately transcribes verbatim speech. To improve on current methods for reading error annotation, we propose a novel end-to-end architecture that incorporates the target reading text via prompting and is trained for both improved verbatim transcription and direct miscue detection. Our contributions include: first, demonstrating that…"
 },
 {
   "title": "Console raises $6.2M from Thrive to free IT teams from mundane tasks with AI",
   "NewsCategory": "Solid News",
   "TechCategory": "Startups and Funding",
   "MetaDescription": "Console's mission is to help IT teams reduce mundane, repetitive tasks, thereby freeing up time for help desk professionals to work on more strategic and sophisticated projects."
 },
 {
   "title": "How S&P is using deep web scraping, ensemble learning and Snowflake architecture to collect 5X more data on SMEs",
   "NewsCategory": "Low Priority",
   "TechCategory": "None",
   "MetaDescription": "Previously, S&P only had data on about 2 million SMEs, but its AI-powered RiskGauge platform expanded that to 10 million."
 },
 {
   "title": "Former DreamWorks CEO Jeffrey Katzenberg co-leads $15.5M Series A for AI video ad platform",
   "NewsCategory": "Solid News",
   "TechCategory": "Startups and Funding",
   "MetaDescription": "Creatify's AdMax platform uses AI to quickly generate dozens of video advertisements, which are geared toward social media marketing"
 },
 {
   "title": "Google quietly launches AI Edge Gallery, letting Android phones run AI without the cloud",
   "NewsCategory": "Top Story Candidate",
   "TechCategory": "Product",
   "MetaDescription": "Google quietly launched AI Edge Gallery, an experimental Android app that runs AI models offline without internet, bringing Hugging Face models directly to smartphones with enhanced privacy."
 },
 {
   "title": "Microsoft Bing gets a free Sora-powered AI video generator",
   "NewsCategory": "Top Story Candidate",
   "TechCategory": "Product",
   "MetaDescription": "Microsoft Bing announced Monday that it is introducing the Bing Video Creator to its app, which uses OpenAI's Sora model to let users generate videos from text prompts."
 },
 {
   "title": "Snowflake to acquire database startup Crunchy Data",
   "NewsCategory": "Solid News",
   "TechCategory": "Startups and Funding",
   "MetaDescription": "Cloud data platform Snowflake announced its intent to acquire Crunchy Data, a Postgres database partner, late this afternoon."
 },
 {
   "title": "Perplexity AI coming soon to these Samsung devices",
   "NewsCategory": "Top Story Candidate",
   "TechCategory": "Product",
   "MetaDescription": "If Perplexity's app and assistant get preloaded on upcoming Galaxies, what happens to Google Gemini integration?"
 },
 {
   "title": "Digg’s founders explain how they’re building a site for humans in the AI era",
   "NewsCategory": "Interesting but Low Priority",
   "TechCategory": "Startups and Funding",
   "MetaDescription": "The rebooted version of social site Digg aims to bring back the spirit of the old web."
 },
 {
   "title": "Why the end of Google as we know it could be your biggest opportunity yet",
   "NewsCategory": "Likely Noise or Opinion",
   "TechCategory": "Macro Shifts",
   "MetaDescription": "As Google faces its biggest challenge yet, here's how you can turn uncertainty into your next big win."
 },
 {
   "title": "OpenAI’s Sora is now available for FREE to all users through Microsoft Bing Video Creator on mobile",
   "NewsCategory": "Top Story Candidate",
   "TechCategory": "Product",
   "MetaDescription": "OpenAI‘s Sora was one of the most hyped releases of the AI era, launching in December 2024, nearly 10 months after it was first previewed to awe-struck reactions due to its — at the time, at least — unprecedented level of realism, camera dynamism, and prompt adherence and 60-second long generation clips. However, much of […]"
 },
 {
   "title": "OpenAI wants ChatGPT to be your 'super assistant'",
   "NewsCategory": "Top Story Candidate",
   "TechCategory": "AI Agents",
   "MetaDescription": "Starting in the first half of 2026, OpenAI plans to evolve ChatGPT into a super assistant that knows you, understands what you care about, and can help with virtually any task."
 },
 {
   "title": "Build GraphRAG applications using Amazon Bedrock Knowledge Bases",
   "NewsCategory": "Interesting but Low Priority",
   "TechCategory": "Product",
   "MetaDescription": "In this post, we explore how to use Graph-based Retrieval-Augmented Generation (GraphRAG) in Amazon Bedrock Knowledge Bases to build intelligent applications. Unlike traditional vector search, which retrieves documents based on similarity scores, knowledge graphs encode relationships between entities, allowing large language models (LLMs) to retrieve information with context-aware reasoning."
 },
 {
   "title": "Streamline personalization development: How automated ML workflows accelerate Amazon Personalize implementation",
   "NewsCategory": "Interesting but Low Priority",
   "TechCategory": "Product",
   "MetaDescription": "This blog post presents an MLOps solution that uses AWS Cloud Development Kit (AWS CDK) and services like AWS Step Functions, Amazon EventBridge and Amazon Personalize to automate provisioning resources for data preparation, model training, deployment, and monitoring for Amazon Personalize."
 },
 {
   "title": "30% of Americans are now active AI users, says new ComScore data",
   "NewsCategory": "Likely Noise or Opinion",
   "TechCategory": "Macro Shifts",
   "MetaDescription": "Comscore now reports on the number of monthly visitors to 117 AI services on PCs and mobile devices."
 },
 {
   "title": "Anthropic tripled its revenue in 5 months - and this is why",
   "NewsCategory": "Top Story Candidate",
   "TechCategory": "Startups and Funding",
   "MetaDescription": "The AI start-up has been making rapid advances thanks largely to the coding abilities of its family of Claude chatbots."
 },
 {
   "title": "Fast-track SOP processing using Amazon Bedrock",
   "NewsCategory": "Interesting but Low Priority",
   "TechCategory": "Product",
   "MetaDescription": "When a regulatory body like the US Food and Drug Administration (FDA) introduces changes to regulations, organizations are required to evaluate the changes against their internal SOPs. When necessary, they must update their SOPs to align with the regulation changes and maintain compliance. In this post, we show different approaches using Amazon Bedrock to identify relationships between regulation changes and SOPs."
 },
 {
   "title": "IBM Unveils watsonx AI Labs: The Ultimate Accelerator for AI Builders, Startups and Enterprises in New York City",
   "NewsCategory": "Solid News",
   "TechCategory": "Research and Innovation",
   "MetaDescription": "New AI initiative will co-create gen AI solutions with IBM clients, nurture NYC talent, advance enterprise AI implementations"
 },
 {
   "title": "Researchers and Students in Türkiye Build AI, Robotics Tools to Boost Disaster Readiness",
   "NewsCategory": "Interesting but Low Priority",
   "TechCategory": "Research and Innovation",
   "MetaDescription": "Since a 7.8-magnitude earthquake hit Syria and Türkiye two years ago — leaving 55,000 people dead, 130,000 injured and millions displaced from their homes — students, researchers and developers have been harnessing the latest AI robotics technologies to increase disaster preparedness in the region. The work is part of a Disaster Response Innovation and Education Read Article"
 },
 {
   "title": "Aethir enables better user acquisition via Instant Play streaming for Doctor Who: Worlds Apart",
   "NewsCategory": "Interesting but Low Priority",
   "TechCategory": "None",
   "MetaDescription": "Aethir provides better computing efficiency with its Instant Play streaming solution for Doctor Who: Worlds Apart."
 }
]

## ARTICLES TO CURATE NOW:

[
  {
    "title": "How to Make AI Faster and Smarter—With a Little Help from Physics",
    "meta_description": "Rose Yu has drawn on the principles of fluid dynamics to improve deep learning systems that predict traffic, model the climate, and stabilize drones during flight."
  },

  {
    "title": "IBM and Roche Co-Created an Innovative Solution to Support People with Diabetes in their Daily Lives with AI-Enabled Glucose Predictions",
    "meta_description": "●\\tAI-enabled continuous glucose monitoring app provides supportive predictions for people with diabetes."
  },

  {
    "title": "The Trump administration has shut down more than 100 climate studies",
    "meta_description": "The Trump administration has terminated National Science Foundation grants for more than 100 research projects related to climate change amid a widening campaign to slash federal funding for scientists and institutions studying the rising risks of a warming world. The move will cut off what’s likely to amount to tens of millions of dollars for…"
  },
  {
    "title": "The Download: US climate studies are being shut down, and building cities from lava",
    "meta_description": "This is today’s edition of The Download, our weekday newsletter that provides a daily dose of what’s going on in the world of technology. The Trump administration has shut down more than 100 climate studies The Trump administration has terminated National Science Foundation grants for more than 100 research projects related to climate change, according to an…"
  },
  {
    "title": "NVIDIA Announces Upcoming Events for Financial Community",
    "meta_description": "SANTA CLARA, Calif., May 29, 2025 (GLOBE NEWSWIRE) -- NVIDIA will present at the following events for the financial community: BofA Securities 2025 Global Technology ConferenceWednesday, June ..."
  },
  {
    "title": "Model Context Protocol: A promising AI integration layer, but not a standard (yet)",
    "meta_description": "Enterprises should experiment with MCP where it adds value, isolate dependencies and prepare for a multi-protocol future."
  },
  {
    "title": "Early AI investor Elad Gil finds his next big bet: AI-powered rollups",
    "meta_description": "Elad Gil started betting on AI before most of the world took notice. By the time investors began grasping the implications of ChatGPT, Gil had already written seed checks to startups like Perplexity, Character.AI, and Harvey. Now, as the early winners of the AI wave become clearer, the renowned “solo” VC is increasingly focused on […]"
  },
  {
    "title": "This palm recognition smart lock doubles as a video doorbell (and has no monthly fees)",
    "meta_description": "The Eufy Familock S3 Max is among the best smart locks I've tested, thanks to a standout feature designed with families in mind."
  },
  {
    "title": "When your LLM calls the cops: Claude 4’s whistle-blow and the new agentic AI risk stack",
    "meta_description": "Claude 4’s “whistle-blow” surprise shows why agentic AI risk lives in prompts and tool access, not benchmarks. Learn the 6 controls every enterprise must adopt."
  },
  {
    "title": "4 days to go: TechCrunch Sessions: AI is almost in session",
    "meta_description": "Artificial intelligence has no shortage of visionaries—but the ones who matter are executing. In 4 days, TechCrunch Sessions: AI brings those builders, researchers, funders, and enthusiasts under one roof at UC Berkeley’s Zellerbach Hall. This isn’t a parade of AI hype or a string of over-edited keynotes. It’s a single day designed for clarity, candor, […]"
  },
  {
    "title": "Day 4 of TechCrunch Sessions: AI Trivia Countdown — Flex your brain, score big on tickets",
    "meta_description": "TechCrunch Sessions: AI hits UC Berkeley’s Zellerbach Hall on June 5 — and today’s your shot at AI trivia glory and two tickets for the price of one. Answer a few brain-busting questions on artificial intelligence, and if you ace it, you might just find a special promo code waiting in your inbox. Every day […]"
  },
  {
    "title": "Sam Altman biographer Keach Hagey explains why the OpenAI CEO was ‘born for this moment’",
    "meta_description": "In “The Optimist: Sam Altman, OpenAI, and the Race to Invent the Future,” Wall Street Journal reporter Keach Hagey examines our AI-obsessed moment through one of its key figures — Sam Altman, co-founder and CEO of OpenAI. Hagey begins with Altman’s Midwest childhood, then takes readers through his career at startup Loopt, accelerator Y Combinator, […]"
  },
  {
    "title": "ZeniMax union reaches tentative agreement with Microsoft",
    "meta_description": "ZeniMax Workers United has reached a tentative contract agreement with Microsoft after two years of negotiation."
  },
  {
    "title": "The future of engineering belongs to those who build with AI, not without it",
    "meta_description": "As we look ahead, the relationship between engineers and AI systems will likely evolve from tool and user to something more symbiotic."
  },
  {
    "title": "Meta plans to automate many of its product risk assessments",
    "meta_description": "An AI-powered system could soon take responsibility for evaluating the potential harms and privacy risks of up to 90% of updates made to Meta apps like Instagram and WhatsApp, according to internal documents reportedly viewed by NPR. NPR says a 2012 agreement between Facebook (now Meta) and the Federal Trade Commission requires the company to […]"
  },
  {
    "title": "ElevenLabs now verified on n8n Cloud",
    "meta_description": "Build voice-enabled workflows in seconds — no custom code required"
  },
  {
    "title": "Introducing batch calling for ElevenLabs Conversational AI",
    "meta_description": "Our new batch calling feature for Conversational AI lets you automate and scale outreach."
  },
  {
    "title": "Introducing Multimodal Conversational AI",
    "meta_description": "Our AI agents can now seamlessly process both speech words and text inputs simultaneously, leading to more natural, efficient, and resilient user interactions."
  },
  {
    "title": "Claude Sonnet 4 is now available in Conversational AI",
    "meta_description": "Anthropic's new Claude Sonnet 4 model is now available on the ElevenLabs platform, we’ve integrated it to give you a powerful new tool for building more capable and intuitive voice experiences."
  },
  {
    "title": "Introducing ElevenLabs Conversational AI 2.0",
    "meta_description": "Conversational AI 2.0 launches with advanced features and enterprise readiness."
  },
  {
    "title": "Introducing web search on the Anthropic API",
    "meta_description": ""
  },
  {
    "title": "Testing our safety defenses with a new bug bounty program",
    "meta_description": ""
  },
  {
    "title": "New capabilities for building agents on the Anthropic API",
    "meta_description": ""
  },
  {
    "title": "Activating AI Safety Level 3 Protections",
    "meta_description": ""
  },
  {
    "title": "Reed Hastings appointed to Anthropic’s board of directors",
    "meta_description": ""
  },
  {
    "title": "Google AI Overviews Says It’s Still 2024",
    "meta_description": "When asked to confirm the current year, Google’s AI-generated top result confidently answers, “No, it is not 2025.”"
  },
  {
    "title": "How the Loudest Voices in AI Went From ‘Regulate Us’ to ‘Unleash Us’",
    "meta_description": "Two years after Sam Altman pitched Congress on AI guardrails, he's back in Washington with a new message: To beat China, invest in OpenAI."
  },
  {
    "title": "10 tips for 10 years of Google Photos",
    "meta_description": "Google Photos is turning 10! To celebrate, here are some favorite tips, tricks and features."
  },
  {
    "title": "Google quietly released an app that lets you download and run AI models locally",
    "meta_description": "Last week, Google quietly released an app that lets users run a range of openly available AI models from the AI dev platform Hugging Face on their phones. Called Google AI Edge Gallery, the app is available for Android and will soon come to iOS. It allows users to find, download, and run compatible models […]"
  }
]
`;

function getApiKey() {
    let apiKey = '';
    if (!apiKey) {
        console.error('API key is required to run this script.');
        process.exit(1);
    }
    return apiKey;
}

// Main function to call OpenAI API
async function curateArticles() {
    const apiKey = getApiKey();
    const openai = new OpenAI({ apiKey });

    console.log('\nSending request to OpenAI API. This may take a moment...');

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-2025-04-14",
            messages: [
                {
                    role: "user",
                    content: fullPromptContent
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
        });

        const responseContent = completion.choices[0].message.content;
        console.log('\n--- OpenAI API Response ---');

        try {
            let parsedResponse = JSON.parse(responseContent);
            let outputArray = null;

            if (Array.isArray(parsedResponse)) {
                outputArray = parsedResponse;
            } else if (typeof parsedResponse === 'object' && parsedResponse !== null) {
                // Find array within object
                for (const key in parsedResponse) {
                    if (Array.isArray(parsedResponse[key])) {
                        outputArray = parsedResponse[key];
                        console.log(`Found array under key: ${key}`);
                        break;
                    }
                }
                if (!outputArray) {
                    console.log("No array found in response object");
                    outputArray = parsedResponse; // Save the whole object as fallback
                }
            }

            // Display the result
            console.log(JSON.stringify(outputArray, null, 2));

            // Save to JSON file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `curated-articles-${timestamp}.json`;
            const filepath = path.join(__dirname, filename);
            
            fs.writeFileSync(filepath, JSON.stringify(outputArray, null, 2), 'utf8');
            console.log(`\n✅ JSON output saved to: ${filename}`);

        } catch (parseError) {
            console.error('Error parsing JSON response from OpenAI:');
            console.error(parseError);
            console.log('Raw response content that failed to parse:');
            console.log(responseContent);
            
            // Save raw response as fallback
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `raw-response-${timestamp}.txt`;
            fs.writeFileSync(path.join(__dirname, filename), responseContent, 'utf8');
            console.log(`Raw response saved to: ${filename}`);
        }

    } catch (error) {
        console.error('Error calling OpenAI API:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

// Run the main function
curateArticles();
