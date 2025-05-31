http://localhost:3000/api/test-fetch?url=https://blog.google/technology/ai/rss/&type=rss&name=GoogleAI%20Blog

http://localhost:3000/api/test-fetch?url=https://techcrunch.com/category/artificial-intelligence/feed/&type=rss&name=TechCrunch AI

http://localhost:3000/api/test-fetch?url=https://www.zdnet.com/topic/artificial-intelligence/rss.xml&type=rss&name=ZDNet

http://localhost:3000/api/test-fetch?url=https://www.technologyreview.com/feed/&type=rss&name=MIT



===========RSS Feeds================
====================================
https://deepmind.google/blog/rss.xml
https://techcrunch.com/category/artificial-intelligence/feed/
https://venturebeat.com/category/ai/feed/
https://blog.google/technology/ai/rss/
https://www.zdnet.com/topic/artificial-intelligence/rss.xml
https://blogs.microsoft.com/ai/feed/
https://aws.amazon.com/blogs/machine-learning/feed/
https://nvidianews.nvidia.com/releases.xml
https://openai.com/news/rss.xml
https://www.technologyreview.com/feed/
https://ai.stanford.edu/blog/feed.xml
https://bair.berkeley.edu/blog/feed.xml
https://rss.arxiv.org/rss/cs.AI
https://newsroom.ibm.com/press-releases-artificial-intelligence?pagetemplate=rss
https://machinelearning.apple.com/rss.xml
https://www.wired.com/feed/tag/ai/latest/rss



===========HTML Sites================
====================================
https://www.anthropic.com/news
https://elevenlabs.io/blog


===========Possible================
====================================
https://www.unite.ai/feed/



pages/api/
├── articles/
│   ├── index.ts                    # GET /api/articles (list all)
│   ├── [articleId]/
│   │   └── index.ts               # PUT/DELETE /api/articles/[articleId]
│   └── external/
│       └── index.ts               # POST /api/articles/external (create external article)
├── sources/
│   ├── index.ts                   # GET/POST /api/sources
│   ├── fetch.ts                   # POST /api/sources/fetch
│   └── [sourceId]/
│       ├── index.ts               # PUT/DELETE /api/sources/[sourceId]
│       └── fetch.ts               # POST /api/sources/[sourceId]/fetch
├── logs/
│   ├── index.ts                   # GET /api/logs
│   └── [runId]/
│       └── index.ts               # GET /api/logs/[runId]
├── tools/
│   ├── index.ts                   # GET/POST /api/tools
│   ├── [id].ts                    # GET/PUT/DELETE /api/tools/[id]
│   └── upload-logo.ts             # POST /api/tools/upload-logo
├── newsletter/
│   ├── index.ts                   # GET/POST /api/newsletter
│   ├── [id].ts                    # GET/PUT/DELETE /api/newsletter/[id]
│   └── generate.ts                # POST /api/newsletter/generate      