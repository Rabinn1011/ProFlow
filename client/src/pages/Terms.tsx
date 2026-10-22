import { Link } from "react-router-dom";
import { LegalPage, type LegalSection } from "../components/LegalPage";

const CONTACT_URL = "https://github.com/Rabinn1011/ProFlow/issues";

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    body: (
      <>
        <p>
          By creating an account or using ProFlow (the "Service"), you agree to these Terms and
          Conditions and to our <Link to="/privacy">Privacy Policy</Link>. If you do not agree,
          do not use the Service.
        </p>
        <p>
          If you use the Service on behalf of a team or organisation, you confirm that you have
          the authority to accept these terms for it.
        </p>
      </>
    ),
  },
  {
    id: "the-service",
    title: "About the Service",
    body: (
      <>
        <p>
          ProFlow is a team project management tool. It lets you create workspaces, organise
          work into projects and tasks on a Kanban board, invite other people with defined
          roles, chat with your team per project, and view workspace analytics.
        </p>
        <p>
          ProFlow is an independent portfolio project. It is provided free of charge, is not a
          commercial product, and comes with no service level agreement. Please do not use it to
          store confidential, regulated or business-critical information.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: (
      <p>
        You must be at least 13 years old, or the minimum age required to consent to online
        services in your country if that is higher, to create an account.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <>
        <p>To use the Service you need an account. You agree to:</p>
        <ul>
          <li>provide a real name and an email address you control;</li>
          <li>keep your password private and not share your account with anyone else;</li>
          <li>
            tell us promptly if you believe someone has accessed your account without permission;
          </li>
          <li>take responsibility for activity that happens under your account.</li>
        </ul>
      </>
    ),
  },
  {
    id: "workspaces",
    title: "Workspaces, roles and team content",
    body: (
      <>
        <p>
          Every workspace has at least one <strong>owner</strong>. Owners and{" "}
          <strong>admins</strong> can add or remove people, change roles, and delete projects.
          Only owners can delete an entire workspace. <strong>Members</strong> can create and
          edit tasks, and <strong>viewers</strong> have read-only access to the board but can
          take part in chat.
        </p>
        <p>
          Workspace owners and admins decide who has access to the content in their workspace.
          If you are removed from a workspace, you lose access to its projects, tasks and chat
          history immediately. Messages you posted remain part of that workspace's history.
        </p>
        <p>
          Deleting a workspace or project permanently deletes everything inside it, including
          tasks and chat. This cannot be undone, so owners and admins should be careful when
          using these actions.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <>
        <p>
          You keep ownership of everything you put into ProFlow, such as workspace and project
          names, task details and chat messages ("Your Content").
        </p>
        <p>
          You give us a limited, non-exclusive licence to store, process and display Your Content
          only as needed to run the Service for you and the people you share a workspace with.
          We do not sell Your Content or use it for advertising.
        </p>
        <p>
          You are responsible for Your Content and confirm that you have the right to share it.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>break any law, or use the Service to harass, threaten or harm other people;</li>
          <li>post content that is unlawful, infringes someone else's rights, or contains malware;</li>
          <li>
            try to access accounts, workspaces or data you have not been given access to, or get
            around roles and permissions;
          </li>
          <li>
            overload the Service, for example with automated scripts, scraping or excessive
            requests, or try to get around rate limits;
          </li>
          <li>reverse engineer the Service to misuse it, or resell access to it.</li>
        </ul>
        <p>
          Security research is welcome. If you find a vulnerability, please report it privately
          through the contact link below rather than exploiting it or disclosing it publicly.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes to the Service",
    body: (
      <p>
        We may change, pause or discontinue any part of the Service at any time. The Service
        runs on free hosting tiers, so it may be slow to start after a period of inactivity and
        may occasionally be unavailable. We do not guarantee that data will be kept forever, so
        keep your own copy of anything important.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <>
        <p>
          You can stop using the Service at any time and ask for your account to be deleted, as
          described in the <Link to="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          We may suspend or close an account that breaks these terms or puts the Service or
          other users at risk. Where reasonable, we will tell you why.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>
        The Service is provided <strong>"as is" and "as available"</strong>, without warranties
        of any kind, whether express or implied, including warranties of merchantability,
        fitness for a particular purpose and non-infringement. We do not promise that the
        Service will be uninterrupted, error-free or secure, or that data will never be lost.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <p>
        To the fullest extent permitted by law, we are not liable for any indirect, incidental,
        special, consequential or punitive damages, or for any loss of data, profits or
        goodwill, arising from your use of, or inability to use, the Service. Because the
        Service is free, our total liability for any claim relating to it is limited to zero,
        except where the law does not allow such a limit.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms from time to time. When we do, we will change the "Last
        updated" date at the top of this page. If a change is significant, we will make
        reasonable efforts to let you know. Continuing to use the Service after an update means
        you accept the new terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about these terms can be raised by opening an issue on the{" "}
        <a href={CONTACT_URL} target="_blank" rel="noreferrer">
          ProFlow GitHub repository
        </a>
        .
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms and Conditions"
      lastUpdated="October 16, 2026"
      intro={
        <p>
          These terms explain the rules for using ProFlow: what you can expect from us, what we
          expect from you, and what happens to the work your team keeps here. Please read them
          before creating an account.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
