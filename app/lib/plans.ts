export type YaqqaPlan = "start" | "mvp" | "pro";

export const PLAN_CONFIG = {
  start: {
    name: "YAQQA Start",
    label: "START",

    limits: {
      aiChatMessages: 50,
      aiWriterGenerations: 10,
      customers: 10,
      knowledgeItems: 10,
      aiReplies: 5,
    },

    features: {
      businessProfile: true,
      aiChat: true,
      aiWriter: true,
      businessKnowledge: true,
      customers: true,
      aiCustomerReplies: true,
      socialContent: false,
      automations: false,
      inbox: false,
      calendar: false,
    },
  },

  mvp: {
    name: "YAQQA MVP",
    label: "MVP",

    limits: {
      aiChatMessages: 500,
      aiWriterGenerations: 100,
      customers: 100,
      knowledgeItems: 100,
      aiReplies: 100,
    },

    features: {
      businessProfile: true,
      aiChat: true,
      aiWriter: true,
      businessKnowledge: true,
      customers: true,
      aiCustomerReplies: true,
      socialContent: true,
      automations: true,
      inbox: false,
      calendar: false,
    },
  },

  pro: {
    name: "YAQQA Pro",
    label: "PRO",

    limits: {
      aiChatMessages: 5000,
      aiWriterGenerations: 1000,
      customers: 1000,
      knowledgeItems: 1000,
      aiReplies: 1000,
    },

    features: {
      businessProfile: true,
      aiChat: true,
      aiWriter: true,
      businessKnowledge: true,
      customers: true,
      aiCustomerReplies: true,
      socialContent: true,
      automations: true,
      inbox: true,
      calendar: true,
    },
  },
} as const;

export function getPlanConfig(plan: string) {
  if (plan === "mvp" || plan === "pro") {
    return PLAN_CONFIG[plan];
  }

  return PLAN_CONFIG.start;
}