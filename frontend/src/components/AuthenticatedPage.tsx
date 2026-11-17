import type { Account } from "../api";
import type { AppPage } from "../navigation";
import FindJobPage from "./FindJobPage";
import FindProPage from "./FindProPage";
import HomeownerWorkspace from "./HomeownerWorkspace";
import PersonalSpacePage from "./PersonalSpacePage";
import ProfilePage from "./ProfilePage";
import RentalsPage from "./RentalsPage";
import TechnicianRepairsPage from "./TechnicianRepairsPage";

interface AuthenticatedPageProps {
  page: AppPage;
  user: Account;
  token: string;
  hasActiveTechnicianProfile: boolean;
  onNavigate: (page: AppPage) => void;
  onUserUpdate: (user: Account) => void;
  onTechnicianProfileStatusChange: (active: boolean) => void;
}

export default function AuthenticatedPage({
  page,
  user,
  token,
  hasActiveTechnicianProfile,
  onNavigate,
  onUserUpdate,
  onTechnicianProfileStatusChange,
}: AuthenticatedPageProps) {
  if (page === "my-repairs") {
    return user.role === "homeowner" ? (
      <HomeownerWorkspace user={user} token={token} onNavigate={onNavigate} />
    ) : user.role === "technician" ? (
      <TechnicianRepairsPage
        user={user}
        token={token}
        hasActiveTechnicianProfile={hasActiveTechnicianProfile}
        onFindJobs={() => onNavigate("find-job")}
      />
    ) : (
      <UnavailablePage title="My repairs" />
    );
  }

  if (page === "find-pro") {
    return user.role === "homeowner" ? (
      <FindProPage token={token} onPostRepair={() => onNavigate("my-repairs")} />
    ) : (
      <UnavailablePage title="Find a pro" />
    );
  }

  if (page === "find-job") {
    return hasActiveTechnicianProfile &&
      (user.role === "homeowner" || user.role === "technician") ? (
      <FindJobPage
        token={token}
        userId={user.id}
        onManageProfile={() => onNavigate("profile")}
      />
    ) : (
      <UnavailablePage title="Find a job" />
    );
  }

  if (page === "rentals") {
    return user.role === "homeowner" || user.role === "technician" ? (
      <RentalsPage user={user} token={token} />
    ) : (
      <UnavailablePage title="Equipment rentals" />
    );
  }

  if (page === "profile") {
    return (
      <ProfilePage
        user={user}
        token={token}
        onUserUpdate={onUserUpdate}
        onTechnicianProfileStatusChange={onTechnicianProfileStatusChange}
      />
    );
  }

  if (page === "personal-space" || page === "home") {
    if (user.role === "admin") {
      return <UnavailablePage title="HomeMaintain workspace" />;
    }
    return (
      <PersonalSpacePage
        user={user}
        token={token}
        hasActiveTechnicianProfile={hasActiveTechnicianProfile}
        onNavigate={onNavigate}
      />
    );
  }

  return <UnavailablePage title="This page" />;
}

function UnavailablePage({ title }: { title: string }) {
  return (
    <div className="workspace-empty">
      <span className="eyebrow">{title.toUpperCase()}</span>
      <h2>This page isn’t available for your account.</h2>
      <p>Return to your personal space to see the tools available to you.</p>
    </div>
  );
}
