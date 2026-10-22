import { Link } from "react-router-dom";
import { LegalPage, type LegalSection } from "../components/LegalPage";

const CONTACT_URL = "https://github.com/Rabinn1011/ProFlow/issues";

// Keep this page in step with the code: if a new field is stored, a cookie is added or a
// new service starts receiving data, the matching section below needs updating too.
const SECTIONS: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "Information we collect",
    body: (
      <>
        <p>
          <strong>Account information.</strong> When you sign up we collect your name, email
          address and password. Your password is never stored as written: we keep only a
          one-way bcrypt hash of it, so not even we can read it.
        </p>
        <p>
          <strong>Content you create.</strong> Workspace and project names and descriptions,
          tasks (titles, descriptions, status, due dates and assignees), chat messages, and the
          list of members and roles in each workspace.
        </p>
        <p>
          <strong>Session information.</strong> For each device you sign in on, we store a
          session record containing a hashed sign-in token, your browser's user-agent string
          (for example "Chrome on Windows") and when the session was created and last
          refreshed. We keep at most 10 sessions per account.
        </p>
        <p>
          <strong>Technical information.</strong> Like any website, our servers receive your IP
          address with each request. We use it in memory to apply rate limits that protect
          accounts from password-guessing; we do not save it to our database. Our hosting
          providers may keep standard request logs for a limited time.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your information",
    body: (
      <>
        <p>We use your information only to:</p>
        <ul>
          <li>create and secure your account and keep you signed in;</li>
          <li>show your workspaces, boards and chat to you and to the people you work with;</li>
          <li>produce workspace analytics for owners and admins;</li>
          <li>detect and prevent abuse, such as brute-force login attempts or spam;</li>
          <li>fix bugs and keep the Service running.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your data, show you ads, build advertising profiles,
          or use your content to train machine learning models.
        </p>
      </>
    ),
  },
  {
    id: "who-can-see",
    title: "Who can see your information",
    body: (
      <>
        <p>
          <strong>People in your workspaces.</strong> Anyone who belongs to a workspace with you
          can see your name, email address and role in it, along with the tasks, assignments and
          chat messages in that workspace. Workspace owners and admins can also see analytics,
          including how many tasks each person has completed.
        </p>
        <p>
          <strong>People adding you.</strong> A workspace admin can add you only if they already
          know the email address you registered with.
        </p>
        <p>
          <strong>Nobody else.</strong> People outside your workspaces cannot see your content.
          Access is checked on our server for every request and every live connection, not just
          hidden in the interface.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <>
        <p>
          ProFlow uses a <strong>single, strictly necessary cookie</strong> called{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">refreshToken</code>. It
          keeps you signed in between visits, is marked HttpOnly so page scripts cannot read
          it, is only sent to our sign-in endpoints, and expires after 7 days without use.
        </p>
        <p>
          Your short-lived access token is held in memory only and disappears when you close the
          tab. We do not use analytics, advertising or third-party tracking cookies, and we do
          not store anything in your browser's local storage. Because the only cookie is
          essential to signing in, there is no cookie banner to accept.
        </p>
      </>
    ),
  },
  {
    id: "service-providers",
    title: "Service providers",
    body: (
      <>
        <p>We rely on a small number of infrastructure providers to run ProFlow:</p>
        <ul>
          <li>
            <strong>MongoDB Atlas</strong> hosts the database where accounts and content are
            stored;
          </li>
          <li>
            <strong>Render</strong> runs the API server and live-update connections;
          </li>
          <li>
            <strong>Vercel</strong> serves the website itself.
          </li>
        </ul>
        <p>
          These providers process data on our behalf to provide their services and may store it
          in countries other than yours. We do not share your information with anyone else
          unless the law requires us to.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep information",
    body: (
      <ul>
        <li>
          <strong>Account information</strong> is kept until your account is deleted.
        </li>
        <li>
          <strong>Sessions</strong> expire after 7 days of inactivity and are removed when you
          sign out on that device.
        </li>
        <li>
          <strong>Workspace content</strong> is kept until it is deleted. Deleting a project
          permanently removes its tasks and chat; deleting a workspace removes all of its
          projects, tasks and chat.
        </li>
        <li>
          <strong>If you leave or are removed from a workspace</strong>, tasks assigned to you
          there are unassigned. Chat messages you posted stay in that workspace's history.
        </li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "How we protect your information",
    body: (
      <>
        <p>Measures we take include:</p>
        <ul>
          <li>encrypted connections (HTTPS) between your browser and our servers;</li>
          <li>bcrypt password hashing and hashed sign-in tokens that are replaced on every use;</li>
          <li>automatic sign-out of a session if a stolen sign-in token is reused;</li>
          <li>rate limits on sign-in, sign-up and the API as a whole;</li>
          <li>role-based permission checks on every request.</li>
        </ul>
        <p>
          No system is perfectly secure, and ProFlow is a portfolio project rather than a
          commercial service, so please avoid storing sensitive information in it.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights and choices",
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access, correct, export or
          delete your personal information, or to object to how it is used. In practice:
        </p>
        <ul>
          <li>you can see and edit your content directly in the app;</li>
          <li>
            to get a copy of your data or have your account deleted, contact us using the link
            below. Self-service account deletion is not available yet, so these requests are
            handled manually.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        ProFlow is not intended for children under 13, and we do not knowingly collect their
        information. If you believe a child has created an account, contact us and we will
        delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change how we handle your information, we will update this page and its "Last
        updated" date. For significant changes, we will make reasonable efforts to let you know
        before they take effect.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        For privacy questions or requests, open an issue on the{" "}
        <a href={CONTACT_URL} target="_blank" rel="noreferrer">
          ProFlow GitHub repository
        </a>
        . Please do not include personal details in a public issue; ask for a private way to
        follow up instead. See also our <Link to="/terms">Terms and Conditions</Link>.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="October 16, 2026"
      intro={
        <p>
          This policy explains what information ProFlow collects, why, who can see it, and the
          choices you have. We collect only what the Service needs to work, and we never sell it.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
