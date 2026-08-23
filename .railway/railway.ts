import { defineRailway, github, postgres, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "europe-west4-drams3a" });
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "europe-west4-drams3a", sizeMB: 5000 });
  const TheClutch = service("TheClutch", {
    source: github("titicuevas/TheClutch", { checkSuites: false }),
    build: "pnpm build",
    start: "pnpm start",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    replicas: { "europe-west4-drams3a": 1 },
    networking: { privateNetworkEndpoint: "theclutch" },
    env: {
      DATABASE_URL: preserve(),
      NEXT_PUBLIC_SITE_URL: preserve(),
    },
  });

  return project("TheClutch", {
    resources: [Postgres, TheClutch, postgresVolume],
  });
});
