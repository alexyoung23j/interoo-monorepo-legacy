export const OUTER_SIDEBAR_ROUTES = [
  { path: "/org/[orgId]/studies", key: "studies" },
  { path: "/org/[orgId]/settings", key: "settings" },
];

export const INNER_SIDEBAR_ROUTES = [
  {
    title: "Setup",
    items: [
      {
        title: "Overview",
        path: "/org/[orgId]/study/[studyId]/setup/overview",
        allowedWhenDraft: true,
        featureFlagsRequired: [], // i.e. "themes"
      },
      {
        title: "Questions",
        path: "/org/[orgId]/study/[studyId]/setup/questions",
        allowedWhenDraft: true,
        featureFlagsRequired: [],
      },
    ],
    allowedWhenDraft: true,
    featureFlagsRequired: [],
  },
  {
    title: "Distribution",
    path: "/org/[orgId]/study/[studyId]/distribution",
    allowedWhenDraft: false,
    featureFlagsRequired: [],
  },
  {
    title: "Results",
    path: "/org/[orgId]/study/[studyId]/results",
    allowedWhenDraft: false,
    featureFlagsRequired: [],
  },
  {
    title: "Interviews",
    path: "/org/[orgId]/study/[studyId]/interviews",
    allowedWhenDraft: false,
    featureFlagsRequired: [],
  },
  {
    title: "Favorites",
    path: "/org/[orgId]/study/[studyId]/favorites",
    allowedWhenDraft: false,
    featureFlagsRequired: [],
  },
  {
    title: "Analysis",
    items: [
      //     {
      //       title: "Codebook",
      //       path: "/org/[orgId]/study/[studyId]/analysis/codebook",
      //       allowedWhenDraft: false,
      //     },
      //     {
      //       title: "Approve Codes",
      //       path: "/org/[orgId]/study/[studyId]/analysis/approve-codes",
      //       allowedWhenDraft: false,
      //     },
      {
        title: "Themes",
        path: "/org/[orgId]/study/[studyId]/analysis/themes",
        allowedWhenDraft: false,
        featureFlagsRequired: ["themes"],
      },
    ],
    //   allowedWhenDraft: false,
  },
  // {
  //   title: "Configuration",
  //   path: "/org/[orgId]/study/[studyId]/configuration",
  //   allowedWhenDraft: false,
  // },
];
