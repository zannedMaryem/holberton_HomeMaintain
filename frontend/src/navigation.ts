export type AppPage =
  | "home"
  | "personal-space"
  | "my-repairs"
  | "find-pro"
  | "find-job"
  | "rentals"
  | "profile";

export const isAppPage = (value: string): value is AppPage =>
  [
    "home",
    "personal-space",
    "my-repairs",
    "find-pro",
    "find-job",
    "rentals",
    "profile",
  ].includes(value);

export const readAppPage = (): AppPage => {
  const hash = window.location.hash.slice(1);
  return isAppPage(hash) ? hash : "home";
};
