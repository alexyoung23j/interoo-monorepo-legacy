export const OUTER_SIDEBAR_ROUTES = [
  { path: "/org/[orgId]/studies", key: "studies" },
  { path: "/org/[orgId]/settings", key: "settings" },
];

export const INNER_SIDEBAR_ROUTES = [
  {
    title: "Distribution",
    path: "/org/[orgId]/study/[studyId]/distribution",
  },
  { title: "Results", path: "/org/[orgId]/study/[studyId]/results" },
  { title: "Interviews", path: "/org/[orgId]/study/[studyId]/interviews" },
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
      {
        title: "Themes",
        path: "/org/[orgId]/study/[studyId]/analysis/themes",
      },
    ],
  },
  {
    title: "Configuration",
    path: "/org/[orgId]/study/[studyId]/configuration",
  },
];
