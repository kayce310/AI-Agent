---
source: knowledge/blueprints/Free LLM API Providers List.docx
type: docx
converted: 2026-05-13T02:58:38.931Z
---

# Free_LLM_API_Providers_List

__Provider__

__Exact Model ID__

__Context Window \(Tokens\)__

__Rate Limits \(RPM / RPD / TPM\)__

__Notes \(e\.g\., requires PAT, specific endpoint\)__

__Google AI Studio__

gemini\-3\.1\-flash\-lite

1,050,000

15 RPM / 1,000 RPD / 1,000,000 TPM

This permanent free tier provides an unprecedented 1\.05M context window, structurally altering how developers approach Retrieval\-Augmented Generation \(RAG\) by allowing full codebase and extensive document ingestion without truncation\. Operating completely independently of Vertex AI, it avoids unexpected billing transitions\. The endpoint dynamically scales its quota based on global server load; however, developers can achieve higher effective throughput by stacking requests across both the web interface and the developer API, maximizing parallel multi\-agent data processing at zero cost\.1

__Google AI Studio__

gemini\-2\.5\-flash

1,000,000

10 RPM / 250 RPD / 250,000 TPM

Serving as a highly capable multimodal foundation model, this endpoint natively processes text, images, and video to facilitate comprehensive visual\-linguistic reasoning\. The expansive one\-million\-token memory allows for continuous session history retention within deep agentic loops\. Developers must implement strict data governance, as Google actively reserves the right to utilize free\-tier prompts for future product training, strictly contraindicating this endpoint for processing proprietary enterprise data, confidential source code, or Personally Identifiable Information\.4

__Google AI Studio__

gemini\-2\.5\-flash\-lite

1,000,000

15 RPM / 1,000 RPD / 250,000 TPM

Engineered explicitly for high\-efficiency, low\-latency execution, this model thrives in dynamic micro\-task environments\. The generous 1,000 Requests Per Day allocation grants sufficient operational headroom to support highly parallelized agent swarms evaluating complex logic trees simultaneously\. Because Google enforces rate limits strictly at the project level rather than per API key, data engineers looking to scale beyond these baseline thresholds must architect sophisticated multi\-project load\-balancing gateways\.4

__Groq__

meta\-llama/llama\-4\-scout\-17b\-16e\-instruct

131,072

30 RPM / 1,000 RPD / 30,000 TPM

Meta's state\-of\-the\-art 17B active parameter Mixture\-of\-Experts \(MoE\) model is dramatically accelerated by Groq's proprietary Language Processing Units \(LPUs\), entirely bypassing conventional GPU latency bottlenecks\. Groq uniquely excludes cached tokens from its rate\-limit calculations\. This critical architectural advantage empowers developers to heavily utilize prompt caching for static schemas, maintaining extreme token economy and protecting the 30,000 TPM quota during repetitive, high\-frequency systemic calls\.8

__Groq__

llama\-3\.1\-8b\-instant

131,072

30 RPM / 14,400 RPD / 6,000 TPM

Boasting an unparalleled 14,400 Requests Per Day allowance, this lightweight model is structurally ideal for acting as a universal network router or continuous fallback node\. It provides the sustained endurance necessary to process thousands of sequential logic checks, semantic classifications, and rapid data extraction operations continuously throughout the day without succumbing to Request Per Day exhaustion, forming the resilient backbone of free\-tier agent swarms\.8

__Groq__

llama\-3\.3\-70b\-versatile

131,072

30 RPM / 1,000 RPD / 12,000 TPM

This dense, highly capable Meta model provides immense reasoning capabilities and deep linguistic comprehension\. While Groq's hardware guarantees near\-instantaneous inference velocity, the strict 12,000 TPM limit dictates that this endpoint must be strategically reserved exclusively for critical decision\-making nodes, complex planning, and final validation within an agentic pipeline, rather than being squandered on bulk text summarization or generic retrieval tasks\.8

__Groq__

meta\-llama/llama\-prompt\-guard\-2\-22m

131,072

30 RPM / 14,400 RPD / 15,000 TPM

A highly specialized security model designed to sanitize inputs and detect adversarial jailbreaks or prompt injections before they reach primary reasoning engines\. The massive 14,400 RPD allowance ensures that every single user prompt within a decentralized application can be routed through this security layer synchronously without causing system\-wide latency or quota depletion, establishing a robust, zero\-cost zero\-trust architecture\.8

__Groq__

meta\-llama/llama\-prompt\-guard\-2\-86m

131,072

30 RPM / 14,400 RPD / 15,000 TPM

The larger sibling to the 22m variant, this model offers enhanced nuance in detecting complex, multi\-turn adversarial attacks\. Operating with identical rate limits, it allows developers to implement military\-grade input validation pipelines at the edge\. Integrating this model via synchronous API calls prevents malicious payloads from triggering expensive or rate\-limited downstream generation models, preserving overall network integrity\.8

__Groq__

allam\-2\-7b

131,072

30 RPM / 7,000 RPD / 6,000 TPM

This mid\-tier reasoning model serves as an effective intermediary between lightweight routers and massive intelligence engines\. With a 7,000 RPD limit, it provides substantial volume for continuous daytime operations\. Applications must actively monitor the x\-ratelimit\-remaining\-tokens header to ensure the 6,000 TPM ceiling is not breached during sudden bursts of concurrent user activity, pivoting to asynchronous queues when thresholds are approached\.8

__Groq__

qwen/qwen3\-32b

32,768

60 RPM / 1,000 RPD / 6,000 TPM

Developed by Alibaba, this highly optimized text\-generation model benefits from Groq's uniquely doubled Requests Per Minute allowance \(60 RPM\)\. This elevated frequency renders it exceptionally suited for rapid, low\-latency micro\-tasks, such as real\-time chat moderation or high\-speed entity extraction\. However, the restrictive 6,000 TPM ceiling necessitates that input contexts be aggressively truncated and engineered for absolute conciseness\.8

__Groq__

openai/gpt\-oss\-120b

131,072

30 RPM / 1,000 RPD / 8,000 TPM

OpenAI’s landmark open\-weight reasoning model, heavily optimized for autonomous agent workflows and structured tool calling\. The restrictive 8,000 TPM limit on Groq requires developers to design synchronous, low\-output generation cycles, as the asynchronous Batch API remains disabled for free\-tier users\. To guarantee successful execution, integration logic must omit the service\_tier parameter or explicitly define it as on\_demand to avoid immediate payload rejection\.8

__Groq__

openai/gpt\-oss\-20b

131,072

30 RPM / 1,000 RPD / 8,000 TPM

Functioning as a lightweight, highly efficient variant of the 120b architecture, this model delivers reasoning capabilities roughly equivalent to the proprietary o3\-mini\. Its execution speed on Groq's LPUs is staggering, but the tight TPM boundary demands strict token economy management\. Systems must be engineered to parse the retry\-after header upon encountering a 429 HTTP error, dynamically halting execution loops to allow capacity replenishment\.8

__Groq__

openai/gpt\-oss\-safeguard\-20b

131,072

30 RPM / 1,000 RPD / 8,000 TPM

Engineered specifically for output validation and hallucination mitigation, this model assesses the logical integrity and safety of generated content\. Deployed alongside primary generative models, it creates a self\-correcting agentic loop\. Given the shared 8,000 TPM cap, developers must interleave safeguard requests carefully with generation requests, utilizing token caching to minimize redundant system prompt overhead\.8

__Groq__

groq/compound

131,072

30 RPM / 250 RPD / 70,000 TPM

A highly specialized internal model architecture offering an immense 70,000 TPM limit for massive data ingestion, offset by a severely constrained 250 RPD cap\. This inverse rate\-limit structure dictates that the model be used exclusively for deep batch processing, where single, massive prompts ingest hundreds of documents simultaneously, maximizing token throughput while rigorously conserving request allotments\.8

__Groq__

groq/compound\-mini

131,072

30 RPM / 250 RPD / 70,000 TPM

Retaining the massive token throughput of its larger counterpart, this mini variant processes extensive contexts with lower latency\. It is structurally designed for large\-scale log analysis or bulk data transformation tasks where execution speed is prioritized over complex logical reasoning\. The 250 RPD limit reinforces the necessity of batch\-heavy architectures over iterative conversational patterns\.8

__Groq__

canopylabs/orpheus\-arabic\-saudi

131,072

10 RPM / 100 RPD / 1,200 TPM

A highly specialized, localization\-focused model serving specific regional linguistic nuances\. Subject to strict bottlenecking \(10 RPM / 1,200 TPM\), it is deployed strictly as a targeted translation and cultural alignment node within a broader multilingual pipeline, ensuring localized accuracy without consuming the rate limits of primary English\-centric reasoning models\.8

__Groq__

canopylabs/orpheus\-v1\-english

131,072

10 RPM / 100 RPD / 1,200 TPM

A niche English\-language variant operating under highly restrictive free\-tier limits\. It is best utilized for highly specialized text classification or linguistic analysis tasks where its specific training data provides a unique advantage over generalized Llama models, though its low limits preclude it from functioning as a primary conversational interface\.8

__Groq__

whisper\-large\-v3

N/A

20 RPM / 2,000 RPD / 7,200 ASH

Groq extends its LPU acceleration to state\-of\-the\-art audio transcription, measuring limits in Audio Seconds per Hour \(ASH\) and Audio Seconds per Day \(ASD\)\. The generous 28,800 ASD \(8 hours\) daily allowance empowers developers to build completely free, real\-time voice\-to\-text applications, seamlessly converting auditory input into text before routing it to downstream LLMs for reasoning\.8

__Groq__

whisper\-large\-v3\-turbo

N/A

20 RPM / 2,000 RPD / 7,200 ASH

Delivering near\-instantaneous speech recognition by trading marginal accuracy for extreme velocity, this turbo variant is essential for real\-time voice agents and live translation matrices\. Operating under identical auditory limits to the standard model, it ensures that latency\-sensitive audio pipelines remain performant without encountering sudden quota exhaustion\.8

__Cerebras__

gpt\-oss\-120b

128,000

30 RPM / 14,400 RPD / 64,000 TPM

Executed directly on the Cerebras Wafer\-Scale Engine, this model shatters conventional latency ceilings, achieving speeds up to 3,000 tokens per second\. Cerebras employs a sophisticated continuous token bucketing algorithm rather than fixed chronological resets, providing smooth, uninterrupted capacity replenishment\. Developers must explicitly define the max\_completion\_tokens parameter; omitting this causes the system to prospectively deduct the Maximum Sequence Length, causing instantaneous quota exhaustion\.14

__Cerebras__

zai\-glm\-4\.7

131,072

10 RPM / 100 RPD / 60,000 TPM

A highly capable multilingual reasoning engine optimized for complex tool\-calling sequences\. Due to extreme global network congestion and unprecedented demand on the Cerebras WSE network, this endpoint's limits have been temporarily but drastically throttled down from standard tiers\. Consequently, system architects must demote this model to an emergency fallback node rather than relying on it as a primary processing engine\.14

__SambaNova__

DeepSeek\-V3\.1

128,000

20 RPM / 20 RPD / 200,000 TPD

Accelerated by proprietary Reconfigurable Dataflow Units \(RDUs\), this production\-grade model offers an immense 200,000 free tokens daily without requiring credit card verification\. However, the severe 20 Requests Per Day constraint forcefully dictates an architecture centered entirely on batch processing; engineers must aggregate queries into massive, singular prompts rather than relying on sequential, multi\-turn conversational interactions to maximize utility\.18

__SambaNova__

Meta\-Llama\-3\.3\-70B\-Instruct

128,000

20 RPM / 20 RPD / 200,000 TPD

This permanent free tier provides uninhibited access to Meta's 70B flagship\. API responses contain dynamic tracking headers \(x\-ratelimit\-remaining\-requests\-day\) which must be actively and programmatically monitored by the application layer\. This allows the system to gracefully pivot traffic to alternative providers like Mistral or Groq before the rigid 20 RPD cap triggers a catastrophic application fault\.18

__SambaNova__

gpt\-oss\-120b

128,000

20 RPM / 20 RPD / 200,000 TPD

OpenAI's open\-weight masterpiece deployed on SambaNova's high\-speed RDU infrastructure\. Given the extreme request limitations, this endpoint is optimally positioned for daily scheduled analytical reports, database vectorization updates, or bulk data transformations where the massive 200,000 token pool can be fully exhausted across a minimal number of highly structured API calls\.18

__Mistral La Plateforme__

mistral\-small\-2603

256,000

~60 RPM / Dynamic RPD / 500,000 TPM

Accessible via the generous "Experiment" plan, this endpoint offers an astonishing one billion free tokens per month, requiring only cellular phone verification to activate\. The model itself is a unified hybrid engine seamlessly integrating deep reasoning, instruction following, and advanced coding capabilities\. Because limits apply globally at the organizational level across all active workspaces, centralized token velocity tracking is mandatory to prevent cross\-project throttling\.19

__Mistral La Plateforme__

mistral\-large\-2402

256,000

~60 RPM / Dynamic RPD / 500,000 TPM

Mistral's flagship frontier model provides proprietary\-level reasoning entirely free for developer evaluation\. The consistent ~1 request per second throughput enables steady, continuous processing streams, making it an exceptional primary engine for complex agentic workflows that demand deep, nuanced reasoning without incurring the exorbitant costs typically associated with standard OpenAI or Anthropic endpoints\.6

__Mistral La Plateforme__

codestral

256,000

~60 RPM / Dynamic RPD / 500,000 TPM

An elite, specialized endpoint exclusively dedicated to code generation and repository analysis\. The expansive 256K context window empowers developers to ingest entire codebases in a single logical pass for comprehensive vulnerability scanning or architectural refactoring\. Users must exercise extreme caution, as migrating from the Experiment plan to the Scale tier to bypass rate limits will automatically trigger pay\-as\-you\-go billing protocols\.6

__Mistral La Plateforme__

pixtral\-large

128,000

~60 RPM / Dynamic RPD / 500,000 TPM

A multimodal powerhouse processing both dense text and complex imagery\. By analyzing visual data alongside textual prompts natively, Pixtral eliminates the need for separate Optical Character Recognition \(OCR\) microservices\. The 500K TPM limit ensures that heavy image tensors do not immediately exhaust the connection, allowing for sustained visual\-agent looping in production environments\.6

__Mistral La Plateforme__

mistral\-nemo

128,000

~60 RPM / Dynamic RPD / 500,000 TPM

A collaborative 12B parameter model offering extreme compute efficiency while maintaining a 128K context window\. It acts as the perfect localized processor for continuous document summarization or intermediate data formatting, operating flawlessly within the 1 RPS / 500K TPM boundaries of the Experiment plan to preserve the larger models for complex logic tasks\.6

__Mistral La Plateforme__

mistral\-medium\-3

128,000

~60 RPM / Dynamic RPD / 500,000 TPM

Bridging the gap between the speed of Small and the profound intelligence of Large, Medium 3 is optimized for standard generative tasks\. It shares the organizational rate limits of the Experiment plan, requiring infrastructure teams to dynamically allocate token usage among all Mistral endpoints based on task priority to avoid sudden API blackout events\.6

__OpenRouter__

openai/gpt\-oss\-120b:free

131,072

20 RPM / 200 RPD / Dynamic TPM

OpenRouter fully subsidizes this open\-weight Mixture\-of\-Experts model, eliminating all financial and hardware barriers\. By providing a unified, OpenAI\-compatible API schema, integration requires merely swapping the base URL and exact model ID\. While it relies on dynamic load balancing to ensure uptime, free endpoints are inherently subject to temporary capacity restrictions during global traffic spikes, necessitating local retry logic\.6

__OpenRouter__

openai/gpt\-oss\-20b:free

131,072

20 RPM / 200 RPD / Dynamic TPM

Functioning as a high\-speed subsidiary to the 120b variant, this model executes rapid instruction following and basic tool calling with minimal latency\. Subsidized by the OpenRouter collective, it operates under the standard 200 RPD cap\. Developers should leverage this endpoint for rapid data transformation and validation tasks, reserving heavier models for deep reasoning\.23

__OpenRouter__

google/gemma\-4\-31b\-it:free

262,144

20 RPM / 200 RPD / Dynamic TPM

A highly dense 30\.7 billion parameter multimodal model featuring native function calling and support for over 140 languages\. It serves as an optimal analytical engine for global localization workflows and multimodal data extraction, allowing systems to benefit from Google's advanced architecture without directly interfacing with Google AI Studio's specific platform constraints\.23

__OpenRouter__

google/gemma\-4\-26b\-a4b\-it:free

262,144

20 RPM / 200 RPD / Dynamic TPM

An instruction\-tuned Mixture\-of\-Experts model from Google DeepMind, activating only 3\.8B parameters during inference to maximize speed\. It natively supports multimodal inputs, including processing video segments up to 60 seconds in length\. This makes it an incredibly powerful, zero\-cost utility for automated video analysis, transcription checking, and dynamic media monitoring pipelines\.23

__OpenRouter__

qwen/qwen3\-coder:free

262,144

20 RPM / 200 RPD / Dynamic TPM

A specialized coding model hailing from the Qwen lineage, uniquely adapted for complex agent workflows\. With a 262K context window, it can ingest vast repositories to perform deep architectural reviews, bug detection, and automated refactoring\. Its zero\-cost availability on OpenRouter democratizes advanced software engineering capabilities for indie developers\.23

__OpenRouter__

qwen/qwen3\-next\-80b\-a3b\-instruct:free

262,144

20 RPM / 200 RPD / Dynamic TPM

A sophisticated MoE instruction model that activates 3B parameters for highly efficient logic processing\. It excels in long\-context document retrieval and structured data output, effectively serving as a centralized knowledge extraction node\. The OpenRouter deployment ensures free access while dynamically managing backend compute allocation to maintain stability\.23

__OpenRouter__

nvidia/nemotron\-3\-super\-120b\-a12b:free

262,144

20 RPM / 200 RPD / Dynamic TPM

A state\-of\-the\-art hybrid Mamba\-Transformer model activating 12B parameters per token\. This unique architectural fusion yields a 50% increase in token generation throughput compared to legacy dense models\. It is specifically engineered for high\-complexity, cross\-document reasoning and massive news aggregation, providing enterprise\-grade analytics at absolutely zero cost\.23

__OpenRouter__

nvidia/nemotron\-3\-nano\-omni\-30b\-a3b\-reasoning:free

256,000

20 RPM / 200 RPD / Dynamic TPM

Acting as an advanced perception sub\-agent, this multimodal model seamlessly accepts text, image, video, and audio inputs\. Leveraging the hybrid MoE Transformer\-Mamba framework, it maintains high throughput while reasoning across disparate data types\. It serves as the perfect sensory node in a decentralized AI architecture, parsing environmental data before passing it to cognitive models\.23

__OpenRouter__

nvidia/nemotron\-3\-nano\-30b\-a3b:free

256,000

20 RPM / 200 RPD / Dynamic TPM

A small language MoE model defined by its extreme compute efficiency, intended specifically for developers architecting specialized, low\-latency agentic systems\. By routing basic tasks through this node, developers preserve their rate\-limit allocations on heavier, more capable endpoints, establishing a highly efficient hierarchical processing swarm\.23

__OpenRouter__

nvidia/nemotron\-nano\-12b\-v2\-vl:free

128,000

20 RPM / 200 RPD / Dynamic TPM

A multimodal reasoning engine designed explicitly for video understanding and deep document intelligence\. It utilizes Efficient Video Sampling \(EVS\) to handle long\-form multimedia while drastically reducing backend inference costs, allowing OpenRouter to offer it sustainably on the free tier\. Essential for automated surveillance or media indexing applications\.23

__OpenRouter__

nvidia/nemotron\-nano\-9b\-v2:free

128,000

20 RPM / 200 RPD / Dynamic TPM

A highly versatile unified LLM designed for both reasoning and non\-reasoning tasks\. Through precise system prompting, it can be dynamically configured to expose its internal reasoning trace or bypass it to deliver instantaneous final answers\. This adaptability makes it an exceptional tool for dynamic workloads where execution speed and deep logic must be toggled programmatically\.23

__OpenRouter__

z\-ai/glm\-4\.5\-air:free

131,072

20 RPM / 200 RPD / Dynamic TPM

A lightweight, highly agile MoE variant of Z\.AI's flagship GLM\-4\.5\. It uniquely offers an on\-demand "thinking mode" for advanced algorithmic reasoning, and a "non\-thinking mode" for real\-time, zero\-latency interaction\. This dual\-mode capability allows developers to streamline their infrastructure by relying on a single endpoint for both complex planning and rapid conversational responses\.23

__OpenRouter__

openrouter/owl\-alpha

1,000,000

20 RPM / 200 RPD / Dynamic TPM

A proprietary high\-performance foundation model developed internally by OpenRouter, specifically tuned for agentic workloads\. It supports a massive 1\.0M context length and natively processes complex tool use and code generation\. By operating their own model, OpenRouter completely eliminates upstream dependency costs, ensuring a highly stable and permanent free offering\.23

__OpenRouter__

google/lyria\-3\-pro\-preview

1,000,000

20 RPM / 200 RPD / Dynamic TPM

Providing subsidized access to Google's advanced visual\-acoustic reasoning model, this endpoint excels in massive context multimodal analysis\. While technically a preview model, OpenRouter's proxy ensures continuous availability, bypassing standard Google Cloud rate limits and enabling robust experimentation in music, audio, and visual generation spaces\.23

__OpenRouter__

google/lyria\-3\-clip\-preview

1,000,000

20 RPM / 200 RPD / Dynamic TPM

A lightweight version of the Lyria architecture, optimized for rapid clip generation and visual parsing\. By leveraging OpenRouter's infrastructure, developers gain access to cutting\-edge generative tools without navigating complex hyperscaler billing agreements, protected by the standardized 200 RPD safety net\.23

__OpenRouter__

inclusionai/ring\-2\.6\-1t:free

262,144

20 RPM / 200 RPD / Dynamic TPM

An immense 1\-trillion parameter thinking model activating 63 billion parameters per token\. It utilizes adaptive reasoning to autonomously allocate compute budgets based entirely on prompt complexity, preventing wasted cycles on trivial tasks\. This model acts as an unparalleled long\-horizon execution agent, fundamentally reshaping the architectural possibilities available to zero\-budget engineers\.23

__OpenRouter__

minimax/minimax\-m2\.5:free

197,000

20 RPM / 200 RPD / Dynamic TPM

A State\-of\-the\-Art \(SOTA\) endpoint designed relentlessly for corporate productivity\. It is natively fluent in operating digital office software—including Word, Excel, and PowerPoint—via direct tool calling\. It excels at context\-switching between human directors and automated agent teams, processing a generous 197K context window to manage complex project deliverables\.23

__OpenRouter__

baidu/cobuddy:free

131,072

20 RPM / 200 RPD / Dynamic TPM

A targeted code generation model optimized for persistent agent workflows\. It delivers high throughput and extremely low end\-to\-end latency, fortified by native tool\-calling support\. Operating on optimized fp8 quantization, it rapidly evaluates pull requests and executes repository modifications entirely within its 131K context horizon\.3

__OpenRouter__

poolside/laguna\-xs\.2:free

131,072

20 RPM / 200 RPD / Dynamic TPM

A second\-generation, highly efficient coding agent classified within the XS size tier\. It is designed specifically for fast, iterative agentic coding workflows where speed supersedes exhaustive logic\. It provides deep native tool calling, allowing it to seamlessly interface with local development environments and CI/CD pipelines at zero cost\.23

__OpenRouter__

poolside/laguna\-m\.1:free

131,072

20 RPM / 200 RPD / Dynamic TPM

The premier coding agent model from the Poolside ecosystem, optimized for highly complex software engineering and architectural planning\. It provides robust reasoning capabilities, making it the perfect subsidized cognitive engine for an automated software engineering swarm operating 24/7 on background refactoring tasks\.23

__OpenRouter__

openrouter/free

200,000

20 RPM / 200 RPD / Dynamic TPM

An intelligent, meta\-level auto\-router that programmatically evaluates an incoming prompt's context length, tool requirements, and modality, instantly shifting the payload to the most available and capable free model on the OpenRouter network\. This endpoint drastically mitigates the downtime risks inherent in relying on single subsidized models, ensuring high availability\.23

__OpenRouter__

meta\-llama/llama\-3\.2\-3b\-instruct:free

131,072

20 RPM / 200 RPD / Dynamic TPM

A highly efficient edge\-class model hosted centrally for testing purposes\. It is perfect for lightweight text classification, intent recognition, and basic formatting tasks\. Deploying this model via OpenRouter allows developers to construct rapid prototypes before deciding whether to migrate the model to local, on\-device execution environments\.23

__OpenRouter__

nousresearch/hermes\-3\-llama\-3\.1\-405b:free

131,072

20 RPM / 200 RPD / Dynamic TPM

An uncensored, heavily fine\-tuned iteration of Meta's massive 405B architecture\. Subsidized by the community, it offers unparalleled creative writing and highly complex logical deduction without the restrictive safety alignments present in base proprietary models, though its availability is heavily subject to dynamic node capacity\.23

__OpenRouter__

baidu/qianfan\-ocr\-fast:free

66,000

20 RPM / 200 RPD / Dynamic TPM

A highly specialized vision model focused entirely on Optical Character Recognition\. It rapidly extracts structured text from dense images and scanned documents\. Integrating this free node at the beginning of a data pipeline guarantees that legacy visual data is instantly converted into readable tokens for downstream LLM ingestion without incurring proprietary OCR API costs\.23

__OpenRouter__

meta\-llama/llama\-3\.3\-70b\-instruct:free

66,000

20 RPM / 200 RPD / Dynamic TPM

Meta's refined 70B instruct model, provided here with a truncated 66K context window to optimize network bandwidth\. It serves as a highly reliable general\-purpose reasoning engine, ideal for conversational agents and logic evaluation where the context length does not exceed standard dialog histories\.23

__OpenRouter__

liquid/lfm\-2\.5\-1\.2b\-thinking:free

33,000

20 RPM / 200 RPD / Dynamic TPM

A novel Liquid Foundation Model architecture featuring an integrated reasoning loop\. Despite its minuscule 1\.2B parameter count, it utilizes continuous state dynamics to process complex logic sequences, making it an incredibly efficient, low\-overhead node for IoT deployments or embedded agentic systems\.23

__OpenRouter__

liquid/lfm\-2\.5\-1\.2b\-instruct:free

33,000

20 RPM / 200 RPD / Dynamic TPM

The standard instruction\-tuned variant of the Liquid model\. By omitting the extended thinking loops, it delivers instantaneous responses for basic queries, ideal for edge\-device integration or serving as a rapid semantic router within a larger, multi\-model orchestrator framework\.23

__OpenRouter__

cognitivecomputations/dolphin\-mistral\-24b\-venice\-edition:free

33,000

20 RPM / 200 RPD / Dynamic TPM

A heavily customized, uncensored fine\-tune of Mistral technology, optimized for maximum obedience and creative generation\. Hosted freely on the OpenRouter network, it allows developers to bypass standard alignment filters for specialized use cases, such as automated red\-teaming or unrestricted creative fiction generation\.23

__OpenRouter__

tencent/hy3\-preview:free

262,144

20 RPM / 200 RPD / Dynamic TPM

Tencent's cutting\-edge preview model natively featuring tool calling and an expansive 262K context window\. Provided free for evaluation, it stands as a formidable competitor to Western foundation models, offering deep analytical capabilities and acting as a robust, zero\-cost knowledge worker agent within enterprise data pipelines\.23

__GitHub Models__

xAI Grok\-3

128,000

1 RPM / 15 RPD / 4,000 TPM

Nested within the Copilot Free tier, this endpoint offers heavily subsidized entry to xAI's flagship model\. Execution requires generating a GitHub Personal Access Token \(PAT\) endowed with models:read permissions, calling via the Azure AI Inference SDK\. The draconian 1 concurrent request limit and 15 RPD cap strictly relegate this model to low\-frequency, high\-precision reasoning rather than bulk systemic processing\.27

__GitHub Models__

xAI Grok\-3\-Mini

128,000

2 RPM / 30 RPD / 12,000 TPM

Providing slightly higher velocity than its larger counterpart, this endpoint permits 4,000 input and 8,000 output tokens per request\. Developers must ensure application logic handles the strict 1 concurrent request ceiling gracefully, employing robust async messaging queues to prevent immediate failure codes when firing parallel prompt evaluations across the system\.27

__GitHub Models__

DeepSeek\-R1

128,000

1 RPM / 8 RPD / 8,000 TPM

Extremely constrained by Copilot Free limitations, providing an agonizingly low 8 daily requests\. It exists almost exclusively as a technical sandbox for individual developers to validate code integrations\. Any functional production deployment must rapidly transition to paid Azure or DeepInfra tiers to unlock viable request volumes\.27

__GitHub Models__

DeepSeek\-R1\-0528

128,000

1 RPM / 8 RPD / 8,000 TPM

A specific checkpoint variant of the R1 architecture, subjected to the identical restrictive rate limits as the base model\. Its presence on the free tier allows data scientists to evaluate specific performance regressions or improvements between build versions without deploying massive local GPU infrastructure\.27

__GitHub Models__

MAI\-DS\-R1

128,000

1 RPM / 8 RPD / 8,000 TPM

A Microsoft Azure\-optimized deployment of the DeepSeek model\. While fully accessible via the Copilot Free tier, its utility is severely hampered by the 8 RPD cap, forcing developers to meticulously hand\-craft and batch validation prompts to maximize the return on each API call before daily exhaustion\.27

__Cohere__

Command A \(111B\)

256,000

20 RPM / 1,000 R/mo / Dynamic TPM

Offered explicitly through Cohere's Trial API, this massive 111B parameter model is restricted entirely to non\-commercial evaluation and prototyping\. The 1,000 request per month overarching limit is highly stringent; developers must implement persistent local caching layers \(like Redis\) to prevent redundant system queries from accidentally exhausting the monthly allocation during the testing phase\.4

__Cohere__

Command R\+

128,000

20 RPM / 1,000 R/mo / Dynamic TPM

Cohere's elite enterprise RAG model, optimized for complex data retrieval and tool utilization\. Operating under the identical monthly Trial API constraints, it provides a crucial zero\-cost environment for architecting high\-accuracy corporate search agents before committing to long\-term licensing agreements\.4

__Cohere__

Command R

128,000

20 RPM / 1,000 R/mo / Dynamic TPM

The highly efficient baseline model for the Command series\. While offering the same 128K context window as R\+, its reduced parameter count translates to lower latency\. It is best utilized for high\-speed document summarization and structuring within a broader RAG pipeline, preserving the monthly quota by answering less complex queries natively\.4

__Cohere__

Command R7B

128,000

20 RPM / 1,000 R/mo / Dynamic TPM

An incredibly lightweight 7B parameter model that maintains the massive 128K context length\. It serves as an ultra\-fast semantic parser, ingesting large documents to extract exact metadata points instantly\. However, the shared 1,000 monthly request pool across all Cohere models demands strict usage prioritization\.4

__Cohere__

Embed 4

N/A

2,000 RPM / Dynamic RPD / Dynamic TPM

A cutting\-edge multimodal embedding model fundamentally critical for advanced Retrieval\-Augmented Generation\. Permitting a massive 2,000 inputs per minute, it seamlessly vectorizes mixed text and image data natively\. This establishes it as an indispensable, zero\-cost utility for generating high\-quality, dense context databases for downstream AI processing\.4

__Cohere__

Rerank 3\.5

N/A

10 RPM / Dynamic RPD / Dynamic TPM

Operating at a tight 10 RPM, this endpoint drastically improves retrieval precision by semantically sorting vector database outputs before feeding them to the generation LLM\. Integrating this into a free\-tier stack guarantees that only the most highly relevant chunks are processed, preserving the limited token contexts of downstream generative models\.6

__Voyage AI__

voyage\-4\-large

32,000

Dynamic RPM / Dynamic RPD / Dynamic TPM

Voyage AI fundamentally shifts the embedding paradigm by offering a permanent, lifetime allocation of 200 million free tokens rather than recurring daily quotas\. This massive 32K context model allows engineers to ingest immense corporate documents without destructive chunking, flawlessly preserving deep semantic relationships within the vector space\.29

__Voyage AI__

voyage\-4

32,000

Dynamic RPM / Dynamic RPD / Dynamic TPM

The standard workhorse of the Voyage embedding fleet, sharing the 200 million lifetime token subsidy\. It provides an optimal balance between vector dimensionality and ingestion speed, making it the default choice for developers constructing their first zero\-cost vector database architectures\.29

__Voyage AI__

voyage\-4\-lite

32,000

Dynamic RPM / Dynamic RPD / Dynamic TPM

Optimized for extreme efficiency and low storage footprint, this lite variant generates highly compressed embeddings\. Utilizing this model extends the utility of the 200 million token free tier while simultaneously reducing the hosting costs of the resulting vector database, making it ideal for budget\-constrained startups\.29

__Voyage AI__

voyage\-context\-3

32,000

Dynamic RPM / Dynamic RPD / Dynamic TPM

A specialized embedding model trained explicitly to understand complex contextual relationships within conversational data\. Operating under the 200M token free tier, it allows developers to effectively index user chat histories, creating highly responsive, memory\-persistent autonomous agents\.29

__Voyage AI__

voyage\-code\-3

32,000

Dynamic RPM / Dynamic RPD / Dynamic TPM

Fine\-tuned specifically on millions of repositories, this endpoint understands the semantic structure of programming languages\. Utilizing the 200M free tokens, developers can vectorize entire GitHub organizations, enabling specialized coding agents to execute highly accurate retrieval over complex architectural logic\.29

__Voyage AI__

voyage\-law\-2

16,000

Dynamic RPM / Dynamic RPD / Dynamic TPM

This specialized endpoint represents a paradigm shift in legal Retrieval\-Augmented Generation, fine\-tuned exclusively for complex legal semantics\. The free tier for this domain\-specific endpoint is permanently capped at 50 million tokens\. This massive subsidy allows developers to ingest and vectorize extensive corporate legal libraries, guaranteeing precise semantic matching for contract analysis and compliance architectures\.29

__Voyage AI__

voyage\-finance\-2

16,000

Dynamic RPM / Dynamic RPD / Dynamic TPM

Trained extensively on financial reports, market data, and economic terminology\. Bounded by the 50 million token lifetime free tier, it provides quantitative analysts the ability to build highly accurate algorithmic trading or market analysis RAG pipelines without upfront capital expenditure on proprietary vectorization services\.29

__Cloudflare Workers AI__

@cf/moonshotai/kimi\-k2\.6

262,144

Dynamic based on Daily Free Neurons

Executed dynamically on Cloudflare's decentralized edge network, this 1\-trillion parameter model consumes the daily free "Neuron" allocation\. Because inference occurs directly at the network edge, global latency is heavily minimized\. However, developers must aggressively monitor Cloudflare's deprecation schedules, as endpoints frequently cycle; failure to update routing configurations will catastrophically break production systems\.32

__Cloudflare Workers AI__

glm\-4\.7\-flash

131,072

Dynamic based on Daily Free Neurons

A lightning\-fast multilingual text generation model optimized for instruction\-following and multi\-turn tool calling across 100\+ languages\. Deployed at the edge, it serves as a globally responsive localization node, converting the daily Neuron allowance into rapid, zero\-latency translations for international userbases\.33

__Cloudflare Workers AI__

qwq\-32b

32,768

Dynamic based on Daily Free Neurons

QwQ acts as the dedicated reasoning model of the Qwen series, capable of deep thinking loops to solve hard computational problems\. By leveraging Cloudflare's serverless infrastructure, developers can inject sophisticated reasoning directly into their edge computing pipelines, performing complex validations before data ever hits a centralized server\.35

__Cloudflare Workers AI__

tts\-2

N/A

Dynamic based on Daily Free Neurons

Inworld's powerful Text\-to\-Speech model provides expressive, real\-time auditory generation with natural language steering \(e\.g\., \[whisper\]\)\. Utilizing the free Neuron pool, developers can build fully functional voice\-responsive AI agents directly on Cloudflare Workers, eliminating the need for expensive third\-party audio generation APIs\.33

__Zhipu AI \(Z\.AI\)__

GLM\-4\.7\-Flash

200,000

1 Concurrent Request / Dynamic RPD / Dynamic TPM

Hosted on the BigModel PaaS, this model delivers lightning\-fast multimodal reasoning within an expansive 200K context window\. However, the draconian single concurrent request constraint forces a strict synchronous architecture\. Consequently, multi\-agent conversational swarms must rigorously queue their operations sequentially, creating massive potential latency bottlenecks during traffic spikes\.4

__Zhipu AI \(Z\.AI\)__

GLM\-4\.5\-Flash

128,000

1 Concurrent Request / Dynamic RPD / Dynamic TPM

The predecessor to 4\.7, this model remains permanently free but suffers from a severely truncated output limit \(~8K tokens\)\. Paired with the single concurrent request limit, it is best utilized for brief, highly structured data extraction tasks where responses are immediate, preventing the system queue from backing up during parallel user interactions\.6

#### Nguồn trích dẫn

1. Gemini Image Generation Free Limits 2026: Every Model, Every Tier, Every Trick to Maximize Your Quota \- LaoZhang\-AI, truy cập vào tháng 5 11, 2026, [https://blog\.laozhang\.ai/en/posts/gemini\-image\-generation\-free\-limit\-2026](https://blog.laozhang.ai/en/posts/gemini-image-generation-free-limit-2026)
2. Google AI Studio Pricing: Free Access, Usage Limits, API Costs, and Production Billing in Early 2026, truy cập vào tháng 5 11, 2026, [https://www\.datastudios\.org/post/google\-ai\-studio\-pricing\-free\-access\-usage\-limits\-api\-costs\-and\-production\-billing\-in\-early\-2026](https://www.datastudios.org/post/google-ai-studio-pricing-free-access-usage-limits-api-costs-and-production-billing-in-early-2026)
3. Models \- OpenRouter, truy cập vào tháng 5 11, 2026, [https://openrouter\.ai/models](https://openrouter.ai/models)
4. Free LLM APIs \(April 2026 Update\) : r/openclaw \- Reddit, truy cập vào tháng 5 11, 2026, [https://www\.reddit\.com/r/openclaw/comments/1spgr25/free\_llm\_apis\_april\_2026\_update/](https://www.reddit.com/r/openclaw/comments/1spgr25/free_llm_apis_april_2026_update/)
5. Interpreting Google AI Studio Rate Limits 2026 Latest Version: What to Do if Tier 1 RPD 250 is Too Strict, truy cập vào tháng 5 11, 2026, [https://help\.apiyi\.com/en/google\-ai\-studio\-rate\-limits\-2026\-guide\-en\.html](https://help.apiyi.com/en/google-ai-studio-rate-limits-2026-guide-en.html)
6. mnfst/awesome\-free\-llm\-apis \- GitHub, truy cập vào tháng 5 11, 2026, [https://github\.com/mnfst/awesome\-free\-llm\-apis](https://github.com/mnfst/awesome-free-llm-apis)
7. Rate limits | Gemini API | Google AI for Developers, truy cập vào tháng 5 11, 2026, [https://ai\.google\.dev/gemini\-api/docs/rate\-limits](https://ai.google.dev/gemini-api/docs/rate-limits)
8. Rate Limits \- GroqDocs, truy cập vào tháng 5 11, 2026, [https://console\.groq\.com/docs/rate\-limits](https://console.groq.com/docs/rate-limits)
9. Llama 4 Scout 17B 16E \- Groq Console, truy cập vào tháng 5 11, 2026, [https://console\.groq\.com/docs/model/meta\-llama/llama\-4\-scout\-17b\-16e\-instruct](https://console.groq.com/docs/model/meta-llama/llama-4-scout-17b-16e-instruct)
10. Llama 4 Scout — AI Model | MindStudio, truy cập vào tháng 5 11, 2026, [https://www\.mindstudio\.ai/models/llama\-4\-scout\-17b\-16e\-instruct\-groq](https://www.mindstudio.ai/models/llama-4-scout-17b-16e-instruct-groq)
11. Groq API Free Tier Limits in 2026: What You Actually Get \- Grizzly Peak Software, truy cập vào tháng 5 11, 2026, [https://www\.grizzlypeaksoftware\.com/articles/p/groq\-api\-free\-tier\-limits\-in\-2026\-what\-you\-actually\-get\-uwysd6mb](https://www.grizzlypeaksoftware.com/articles/p/groq-api-free-tier-limits-in-2026-what-you-actually-get-uwysd6mb)
12. DeepInfra: Machine Learning Models and Infrastructure, truy cập vào tháng 5 11, 2026, [https://deepinfra\.com/](https://deepinfra.com/)
13. Introducing gpt\-oss \- OpenAI, truy cập vào tháng 5 11, 2026, [https://openai\.com/index/introducing\-gpt\-oss/](https://openai.com/index/introducing-gpt-oss/)
14. Rate Limits \- Cerebras Inference, truy cập vào tháng 5 11, 2026, [https://inference\-docs\.cerebras\.ai/support/rate\-limits](https://inference-docs.cerebras.ai/support/rate-limits)
15. OpenAI GPT OSS 120B Runs Fastest on Cerebras, truy cập vào tháng 5 11, 2026, [https://www\.cerebras\.ai/blog/openai\-gpt\-oss\-120b\-runs\-fastest\-on\-cerebras](https://www.cerebras.ai/blog/openai-gpt-oss-120b-runs-fastest-on-cerebras)
16. Cerebras Launches OpenAI's gpt\-oss\-120B at a Blistering 3000 tokens/sec, truy cập vào tháng 5 11, 2026, [https://www\.cerebras\.ai/blog/cerebras\-launches\-openai\-s\-gpt\-oss\-120b\-at\-a\-blistering\-3\-000\-tokens\-sec](https://www.cerebras.ai/blog/cerebras-launches-openai-s-gpt-oss-120b-at-a-blistering-3-000-tokens-sec)
17. Supported Models \- Cerebras Inference, truy cập vào tháng 5 11, 2026, [https://inference\-docs\.cerebras\.ai/models/overview](https://inference-docs.cerebras.ai/models/overview)
18. Rate Limits Policy \- SambaNova Documentation, truy cập vào tháng 5 11, 2026, [https://docs\.sambanova\.ai/docs/en/models/rate\-limits](https://docs.sambanova.ai/docs/en/models/rate-limits)
19. Rate limits and usage tiers | Mistral Docs, truy cập vào tháng 5 11, 2026, [https://docs\.mistral\.ai/admin/user\-management\-finops/tier](https://docs.mistral.ai/admin/user-management-finops/tier)
20. Mistral AI Free Tier 2026 — Free Models, Credits & Limits \- Price Per Token, truy cập vào tháng 5 11, 2026, [https://pricepertoken\.com/endpoints/mistral/free](https://pricepertoken.com/endpoints/mistral/free)
21. Changelog | Mistral Docs, truy cập vào tháng 5 11, 2026, [https://docs\.mistral\.ai/resources/changelogs](https://docs.mistral.ai/resources/changelogs)
22. 15 Free LLM APIs You Can Use in 2026 \- Analytics Vidhya, truy cập vào tháng 5 11, 2026, [https://www\.analyticsvidhya\.com/blog/2026/01/top\-free\-llm\-apis/](https://www.analyticsvidhya.com/blog/2026/01/top-free-llm-apis/)
23. OpenRouter Free Models: All 29 Listed \(May 2026\) \- CostGoat, truy cập vào tháng 5 11, 2026, [https://costgoat\.com/pricing/openrouter\-free\-models](https://costgoat.com/pricing/openrouter-free-models)
24. Free AI Models on OpenRouter | OpenRouter, truy cập vào tháng 5 11, 2026, [https://openrouter\.ai/collections/free\-models](https://openrouter.ai/collections/free-models)
25. Models \- OpenRouter, truy cập vào tháng 5 11, 2026, [https://openrouter\.ai/models/?q=free](https://openrouter.ai/models/?q=free)
26. OpenRouter\-What free model to select ? : r/openclaw \- Reddit, truy cập vào tháng 5 11, 2026, [https://www\.reddit\.com/r/openclaw/comments/1t2mq63/openrouterwhat\_free\_model\_to\_select/](https://www.reddit.com/r/openclaw/comments/1t2mq63/openrouterwhat_free_model_to_select/)
27. Prototyping with AI models \- GitHub Docs, truy cập vào tháng 5 11, 2026, [https://docs\.github\.com/github\-models/prototyping\-with\-ai\-models](https://docs.github.com/github-models/prototyping-with-ai-models)
28. Prototyping with AI models \- GitHub Docs, truy cập vào tháng 5 11, 2026, [https://docs\.github\.com/en/github\-models/prototyping\-with\-ai\-models](https://docs.github.com/en/github-models/prototyping-with-ai-models)
29. Models Overview \- Voyage AI by MongoDB, truy cập vào tháng 5 11, 2026, [https://www\.mongodb\.com/docs/voyageai/models/](https://www.mongodb.com/docs/voyageai/models/)
30. Pricing \- Introduction \- Voyage AI, truy cập vào tháng 5 11, 2026, [https://docs\.voyageai\.com/docs/pricing](https://docs.voyageai.com/docs/pricing)
31. Text Embeddings \- Introduction \- Voyage AI, truy cập vào tháng 5 11, 2026, [https://docs\.voyageai\.com/docs/embeddings](https://docs.voyageai.com/docs/embeddings)
32. AI Changelog | Cloudflare Docs, truy cập vào tháng 5 11, 2026, [https://developers\.cloudflare\.com/changelog/product\-group/ai/](https://developers.cloudflare.com/changelog/product-group/ai/)
33. Models \- AI \- Cloudflare Docs, truy cập vào tháng 5 11, 2026, [https://developers\.cloudflare\.com/ai/models/](https://developers.cloudflare.com/ai/models/)
34. Pricing · Cloudflare Workers AI docs, truy cập vào tháng 5 11, 2026, [https://developers\.cloudflare\.com/workers\-ai/platform/pricing/](https://developers.cloudflare.com/workers-ai/platform/pricing/)
35. Workers AI Models \- Cloudflare Docs, truy cập vào tháng 5 11, 2026, [https://developers\.cloudflare\.com/workers\-ai/models/](https://developers.cloudflare.com/workers-ai/models/)

