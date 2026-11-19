# Beyond Throughput: Measuring Model Latency in Production

When selecting an LLM for production, throughput (tokens per second) is often the first metric developers check. However, for real-time user experiences, it is often misleading. 

At Modelright, we categorize latency into three distinct phases to give you a true picture of model performance:

### 1. Time to First Token (TTFT)
This is the most critical metric for interactivity. It represents the delay between your request and the first output token. A model with high throughput but slow TTFT will feel "laggy" to your end users.

### 2. Inter-Token Latency (ITL)
Once generation starts, ITL measures the speed of output streaming. Consistent ITL is crucial for maintaining a natural reading rhythm in chat interfaces.

### 3. Total Request Duration
Useful for batch processing or async tasks, but rarely the bottleneck for user-facing applications.

### How Modelright Helps
Modelright does not just report "average speed." Our catalog provides live-synced benchmarks for these specific phases across providers, enabling you to match model performance to your specific application requirements:

*   **Chat Agents:** Prioritize lowest TTFT.
*   **Data Extraction/Summery:** Prioritize overall throughput.
*   **Real-time Streaming:** Prioritize consistent ITL.

Stop guessing. Compare precise latency benchmarks at [modelright.dev](https://modelright.dev) and optimize your production infrastructure for your actual use cases.
