export const OUTER_SIDEBAR_ROUTES = [
  { path: "/org/[orgId]/studies", emoji: "🏠" },
  { path: "/org/[orgId]/settings", emoji: "⚙️" },
];

export const INNER_SIDEBAR_ROUTES = [
  {
    title: "Study Overview",
    items: [
      {
        title: "Distribution",
        path: "/org/[orgId]/study/[studyId]/distribution",
      },
      { title: "Results", path: "/org/[orgId]/study/[studyId]/results" },
    ],
  },
  {
    title: "Analysis",
    items: [
      {
        title: "Codebook",
        path: "/org/[orgId]/study/[studyId]/analysis/codebook",
      },
      {
        title: "Approve Codes",
        path: "/org/[orgId]/study/[studyId]/analysis/approve-codes",
      },
    ],
  },
  {
    title: "Results",
    items: [
      {
        title: "Overview",
        path: "/org/[orgId]/study/[studyId]/results/overview",
      },
    ],
  },
];
