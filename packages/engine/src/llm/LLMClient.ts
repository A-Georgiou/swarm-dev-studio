// ============================================================
// LLMClient — abstraction layer for multi-provider LLM calls
// ============================================================

/** Supported LLM provider derived from model name. */
type LLMProvider = "anthropic" | "openai";

/** A single message in a conversation. */
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Response from an LLM call. */
export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  cached: boolean;
}

/** Configuration for an LLM request. */
export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Resolves which provider to use based on model name.
 */
function resolveProvider(model: string): LLMProvider {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gpt")) return "openai";
  return "anthropic";
}

/**
 * LLMClient routes requests to the appropriate provider (Anthropic or OpenAI).
 *
 * When API keys are available (ANTHROPIC_API_KEY / OPENAI_API_KEY), it makes
 * real HTTP calls. When keys are absent it falls back to a personality-aware
 * local generator so the simulation still runs without external services.
 */
export class LLMClient {
  private anthropicKey: string | undefined;
  private openaiKey: string | undefined;
  private cache = new Map<string, LLMResponse>();

  constructor() {
    this.anthropicKey = typeof process !== "undefined" ? process.env.ANTHROPIC_API_KEY : undefined;
    this.openaiKey = typeof process !== "undefined" ? process.env.OPENAI_API_KEY : undefined;
  }

  /** Check whether real LLM calls are available for a given model. */
  isAvailable(model: string): boolean {
    const provider = resolveProvider(model);
    if (provider === "anthropic") return !!this.anthropicKey;
    if (provider === "openai") return !!this.openaiKey;
    return false;
  }

  /**
   * Send a chat completion request to the appropriate LLM.
   * Falls back to local generation when API keys are not configured.
   */
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const cacheKey = this.buildCacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached) return { ...cached, cached: true };

    const provider = resolveProvider(request.model);

    let response: LLMResponse;

    if (provider === "anthropic" && this.anthropicKey) {
      response = await this.callAnthropic(request);
    } else if (provider === "openai" && this.openaiKey) {
      response = await this.callOpenAI(request);
    } else {
      response = this.generateLocal(request);
    }

    this.cache.set(cacheKey, response);
    return response;
  }

  /** Generate a contextual response using the agent's persona (no API key needed). */
  generateLocal(request: LLMRequest): LLMResponse {
    const systemMsg = request.messages.find((m) => m.role === "system");
    const userMsg = request.messages.filter((m) => m.role === "user").pop();
    const provider = resolveProvider(request.model);

    const persona = systemMsg?.content ?? "";
    const task = userMsg?.content ?? "";

    const content = this.synthesizeResponse(persona, task, request.model);

    return { content, model: request.model, provider, cached: false };
  }

  /**
   * Synthesize a response based on persona traits and task context.
   * Produces varied, personality-consistent output without an API call.
   */
  private synthesizeResponse(persona: string, task: string, model: string): string {
    const isHighOpenness = persona.includes("openness: 0.9") || persona.includes("openness: 0.95");
    const isHighConscientiousness = persona.includes("conscientiousness: 0.9") || persona.includes("conscientiousness: 0.85");
    const isHighExtraversion = persona.includes("extraversion: 0.8") || persona.includes("extraversion: 0.9");

    const lp = persona.toLowerCase();
    const isCEO = lp.includes("ceo") || lp.includes("chief executive");
    const isCTO = lp.includes("cto") || lp.includes("chief technology");
    const isManager = lp.includes("manager");
    const isDeveloper = lp.includes("developer") || lp.includes("engineer");
    const isQA = lp.includes("qa") || lp.includes("quality");
    const isTester = lp.includes("tester") || lp.includes("test");
    const isPM = lp.includes("project manager") || lp.includes("pm");

    const segments: string[] = [];
    const title = this.extractTaskTitle(task);

    if (isCEO) {
      segments.push(`I've reviewed the overall direction for "${title}".`);
      segments.push("From a strategic perspective, we need to ensure this aligns with our product vision.");
      if (isHighOpenness) segments.push("I see opportunities to innovate here beyond the initial scope.");
      segments.push("Let's delegate this through the org and get it moving. I want updates at each milestone.");
    } else if (isCTO) {
      segments.push(`Analyzing the technical requirements for "${title}".`);
      segments.push("I'll break this down into components: architecture, implementation, testing, and deployment.");
      if (isHighConscientiousness) segments.push("We need thorough API design before any code is written.");
      segments.push("I'm distributing sub-tasks across the engineering teams based on their expertise.");
    } else if (isManager) {
      segments.push(`Taking ownership of the assigned workstream for "${title}".`);
      segments.push("I'll coordinate with my team members and set up a sprint plan.");
      if (isHighExtraversion) segments.push("Let's schedule a quick sync to align on priorities.");
      segments.push("I'll report progress back up the chain daily.");
    } else if (isDeveloper) {
      segments.push(`Starting implementation work on "${title}".`);
      segments.push("I'll begin with the core logic and write tests alongside the implementation.");
      segments.push("I have a few clarifying questions about edge cases — will follow up with the team lead.");
      segments.push("Estimated completion: will update after initial investigation.");
    } else if (isQA) {
      segments.push(`Defining acceptance criteria for "${title}".`);
      segments.push("Test plan: unit tests for core logic, integration tests for API boundaries, E2E for critical paths.");
      segments.push("I'll review PRs for test coverage before approving.");
      segments.push("Edge cases to verify: null inputs, concurrent access, error recovery.");
    } else if (isTester) {
      segments.push(`Setting up test environment for "${title}".`);
      segments.push("Automated test suite configured. CI pipeline will run on each PR.");
      segments.push("Manual test scenarios documented for UI-dependent flows.");
      segments.push("Load testing plan ready for performance-critical components.");
    } else if (isPM) {
      segments.push(`Creating project timeline for "${title}".`);
      segments.push("Dependencies identified and tracked. Risks flagged for escalation.");
      segments.push("Stakeholder updates scheduled. Sprint board updated with new tasks.");
      segments.push("I'll monitor velocity and flag blockers proactively.");
    } else {
      segments.push(`Working on "${title}".`);
      segments.push("I'll coordinate with the team and deliver my assigned portion.");
    }

    if (model.includes("opus")) {
      segments.push("\n[Deep analysis mode — comprehensive reasoning applied]");
    } else if (model.includes("sonnet")) {
      segments.push("\n[Balanced analysis — efficient and thorough]");
    } else if (model.includes("haiku") || model.includes("mini")) {
      segments.push("\n[Quick assessment — ready to execute]");
    }

    return segments.join(" ");
  }

  private extractTaskTitle(task: string): string {
    const firstLine = task.split("\n")[0];
    return firstLine.length > 60 ? firstLine.substring(0, 57) + "..." : firstLine;
  }

  /** Call the Anthropic Messages API. */
  private async callAnthropic(request: LLMRequest): Promise<LLMResponse> {
    const systemMessage = request.messages.find((m) => m.role === "system")?.content ?? "";
    const nonSystemMessages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const body = JSON.stringify({
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      system: systemMessage,
      messages: nonSystemMessages,
    });

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.anthropicKey!,
          "anthropic-version": "2023-06-01",
        },
        body,
      });

      if (!resp.ok) {
        console.warn(`Anthropic API error ${resp.status}, falling back to local generation`);
        return this.generateLocal(request);
      }

      const data = (await resp.json()) as { content: Array<{ text: string }> };
      return {
        content: data.content[0]?.text ?? "",
        model: request.model,
        provider: "anthropic",
        cached: false,
      };
    } catch (err) {
      console.warn("Anthropic API call failed, falling back to local generation:", err);
      return this.generateLocal(request);
    }
  }

  /** Call the OpenAI Chat Completions API. */
  private async callOpenAI(request: LLMRequest): Promise<LLMResponse> {
    const messages = request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const body = JSON.stringify({
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      messages,
    });

    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.openaiKey!}`,
        },
        body,
      });

      if (!resp.ok) {
        console.warn(`OpenAI API error ${resp.status}, falling back to local generation`);
        return this.generateLocal(request);
      }

      const data = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
      return {
        content: data.choices[0]?.message?.content ?? "",
        model: request.model,
        provider: "openai",
        cached: false,
      };
    } catch (err) {
      console.warn("OpenAI API call failed, falling back to local generation:", err);
      return this.generateLocal(request);
    }
  }

  private buildCacheKey(request: LLMRequest): string {
    const msgKey = request.messages.map((m) => `${m.role}:${m.content}`).join("|");
    return `${request.model}::${msgKey}`;
  }
}
