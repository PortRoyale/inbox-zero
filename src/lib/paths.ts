const hashRouting = process.env.NEXT_PUBLIC_ROUTING === "hash";

export const paths = hashRouting
  ? {
      home: "#top",
      assessment: "#assessment",
      releaseGate: "#release-gate",
      plan: "#plan",
      brief: "#brief",
      pricing: "#pricing",
      guides: "#brief",
    }
  : {
      home: "/",
      assessment: "/assessment/",
      releaseGate: "/release-gate/",
      plan: "/plan/",
      brief: "/cra/",
      pricing: "/pricing/",
      guides: "/guides/",
    };

export type View = "home" | "assessment" | "release-gate" | "plan" | "brief" | "pricing";
