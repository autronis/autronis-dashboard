import Anthropic from "@anthropic-ai/sdk";
import type { BannerIcon, BannerIllustration } from "@/types/content";
import { BANNER_ICONS, BANNER_ILLUSTRATIONS } from "@/types/content";

export interface TopicAnalysis {
  icon: BannerIcon;
  illustration: BannerIllustration;
  capsuleText: string;
}

interface RawTopicAnalysis {
  icon: unknown;
  illustration: unknown;
  capsuleText: unknown;
}

function buildAnalyzePrompt(onderwerp: string): string {
  return `Given the topic "${onderwerp}", choose:
1. The best icon from: ${BANNER_ICONS.join(", ")}
2. The best background illustration from: ${BANNER_ILLUSTRATIONS.join(", ")}
3. Clean capsule text (short, max 3 words, like "Process Automation")

Icon guide:
- cog: process, workflow, automation, system
- brain: AI, machine learning, intelligence
- bar-chart: data, analytics, reporting, statistics
- link: integrations, API, connections, linking
- lightbulb: tips, insights, ideas, advice
- target: goals, sales, conversion, targeting
- git-branch: development, branches, workflows
- zap: speed, instant, fast automation, triggers
- plug: connections, integrations, plugins
- users: team, clients, collaboration, people
- euro: finance, revenue, costs, pricing
- shield: security, reliability, protection
- database: databases, storage, data management
- mail: email, outreach, communication, campaigns
- globe: web, international, online presence, SaaS
- rocket: launch, growth, startup, scale
- clock: scheduling, time management, planning, deadlines
- layers: multi-layer, stack, architecture, systems
- trending-up: growth, KPIs, performance, metrics
- cpu: tech, infrastructure, processing, computing
- cloud: cloud services, SaaS, hosting, backup
- calendar: planning, scheduling, agenda, events
- key: access, authentication, permissions, security
- heart: customer satisfaction, loyalty, NPS, care

Illustration guide:
- gear: process automation, workflows, systems
- brain: AI, machine learning, neural networks
- nodes: integrations, connections, network, graph
- chart: data, analytics, growth, metrics
- target: goals, sales, lead generation, KPIs
- flow: workflows, processes, pipelines
- circuit: tech, development, infrastructure
- lightbulb: tips, insights, ideas, innovation
- puzzle: integrations, system fitting, SaaS
- cloud: cloud, SaaS, hosting, backup
- rocket: launch, growth, scaling, startup
- calendar: planning, scheduling, time management
- magnet: lead generation, attraction, marketing
- handshake: partnerships, deals, collaboration, clients

Return ONLY valid JSON, no explanation, no markdown:
{"icon":"cog","illustration":"gear","capsuleText":"Process Automation"}`;
}

export async function analyzeTopic(onderwerp: string): Promise<TopicAnalysis> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-haiku-4-20250514",
    max_tokens: 150,
    messages: [{ role: "user", content: buildAnalyzePrompt(onderwerp) }],
  });

  const rawText = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  let parsed: RawTopicAnalysis;
  try {
    parsed = JSON.parse(rawText) as RawTopicAnalysis;
  } catch {
    const match = rawText.match(/\{[\s\S]*?\}/);
    if (!match) {
      return { ...getDefaults(onderwerp), capsuleText: onderwerp };
    }
    parsed = JSON.parse(match[0]) as RawTopicAnalysis;
  }

  const icon: BannerIcon = (BANNER_ICONS as readonly string[]).includes(parsed.icon as string)
    ? (parsed.icon as BannerIcon)
    : getDefaults(onderwerp).icon;

  const illustration: BannerIllustration = (BANNER_ILLUSTRATIONS as readonly string[]).includes(parsed.illustration as string)
    ? (parsed.illustration as BannerIllustration)
    : getDefaults(onderwerp).illustration;

  const capsuleText =
    typeof parsed.capsuleText === "string" && parsed.capsuleText.length > 0
      ? parsed.capsuleText
      : onderwerp;

  return { icon, illustration, capsuleText };
}

export function getDefaults(onderwerp: string): { icon: BannerIcon; illustration: BannerIllustration } {
  const lower = onderwerp.toLowerCase();

  if (/ai|machine|neural|model|leren|intelligence/.test(lower)) {
    return { icon: "brain", illustration: "brain" };
  }
  if (/data|dashboard|rapport|statistiek|analytics|chart|grafiek|kpi|metric/.test(lower)) {
    return { icon: "trending-up", illustration: "chart" };
  }
  if (/integrat|koppel|api|connect|systeem|sync|puzzle/.test(lower)) {
    return { icon: "link", illustration: "puzzle" };
  }
  if (/tip|inzicht|advies|idee|learning/.test(lower)) {
    return { icon: "lightbulb", illustration: "lightbulb" };
  }
  if (/doel|target|sales|lead|conversie|klant|magnet/.test(lower)) {
    return { icon: "target", illustration: "magnet" };
  }
  if (/flow|workflow|pipeline|proces|process/.test(lower)) {
    return { icon: "git-branch", illustration: "flow" };
  }
  if (/snel|snelheid|speed|zap|trigger|instant/.test(lower)) {
    return { icon: "zap", illustration: "circuit" };
  }
  if (/geld|euro|prijs|omzet|financ|revenue/.test(lower)) {
    return { icon: "euro", illustration: "chart" };
  }
  if (/team|mensen|gebruiker|klanten|samenwerk|partner|handshake/.test(lower)) {
    return { icon: "users", illustration: "handshake" };
  }
  if (/beveiliging|security|shield|bescherm|key|toegang/.test(lower)) {
    return { icon: "shield", illustration: "circuit" };
  }
  if (/cloud|saas|hosting|backup|server/.test(lower)) {
    return { icon: "cloud", illustration: "cloud" };
  }
  if (/launch|lanceer|groei|scale|startup|rocket/.test(lower)) {
    return { icon: "rocket", illustration: "rocket" };
  }
  if (/plan|agenda|kalend|schedule|datum|datum/.test(lower)) {
    return { icon: "calendar", illustration: "calendar" };
  }
  if (/email|mail|outreach|campagne|nieuwsbrief/.test(lower)) {
    return { icon: "mail", illustration: "nodes" };
  }
  if (/database|opslag|storage|db/.test(lower)) {
    return { icon: "database", illustration: "circuit" };
  }
  if (/web|website|online|globaal|international/.test(lower)) {
    return { icon: "globe", illustration: "nodes" };
  }
  if (/tijd|uur|deadline|snelheid|timer/.test(lower)) {
    return { icon: "clock", illustration: "flow" };
  }
  if (/infrastructuur|stack|architectuur|layers/.test(lower)) {
    return { icon: "layers", illustration: "circuit" };
  }

  // Default: automation
  return { icon: "cog", illustration: "gear" };
}
