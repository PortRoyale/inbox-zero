const hashRouting = process.env.NEXT_PUBLIC_ROUTING === "hash";

export const paths = hashRouting
  ? {
      home: "#top",
      assessment: "#assessment",
      releaseGate: "#release-gate",
      pricing: "#pricing",
      notes: "#notes",
      contact: "#contact",
    }
  : {
      home: "/",
      assessment: "/assessment/",
      releaseGate: "/release-gate/",
      pricing: "/#pricing",
      notes: "/#notes",
      contact: "/#contact",
    };

export type View = "home" | "assessment" | "release-gate";
