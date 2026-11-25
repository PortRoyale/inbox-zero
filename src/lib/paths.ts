const hashRouting = process.env.NEXT_PUBLIC_ROUTING === "hash";

export const paths = hashRouting
  ? {
      home: "#top",
      assessment: "#assessment",
      releaseGate: "#release-gate",
      plan: "#plan",
      brief: "#brief",
      pricing: "#pricing",
      notes: "#notes",
      contact: "#contact",
    }
  : {
      home: "/",
      assessment: "/assessment/",
      releaseGate: "/release-gate/",
      plan: "/plan/",
      brief: "/cra/",
      pricing: "/#pricing",
      notes: "/#notes",
      contact: "/#contact",
    };

export type View = "home" | "assessment" | "release-gate" | "plan" | "brief";
