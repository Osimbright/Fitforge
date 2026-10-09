import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="9 October 2026">
      <section>
        <p>
          FitForge (&quot;we&quot;, &quot;us&quot;) builds personalised training and nutrition plans. This policy explains what
          information we collect, why, who helps us process it, and the choices you have. We never sell your data.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address and phone number. If you sign in with Google, we receive your
            name, email and profile picture from Google. We do not get your Google password.
          </li>
          <li>
            <strong>Profile and health information you enter:</strong> gender, date of birth, height, weight, target
            weight, training experience, goals, schedule, activity level, diet type, allergies, and any injuries or
            conditions you choose to tell us about.
          </li>
          <li>
            <strong>Activity you log:</strong> workouts, sets and reps, meals, water intake, body measurements and
            weekly reviews.
          </li>
          <li>
            <strong>Progress photos</strong> you upload. These are stored privately and only you can see them.
          </li>
          <li>
            <strong>AI coach conversations:</strong> the messages you send to the coach and its replies.
          </li>
          <li>
            <strong>Reviews and waitlist sign-ups:</strong> if you submit a testimonial or join the Pro waitlist.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To create your account and keep you signed in.</li>
          <li>To calculate your calorie and macro targets and generate your workout and diet plans.</li>
          <li>To show your progress, history and charts.</li>
          <li>To send account emails, such as sign-up confirmation and password reset. We do not send marketing email.</li>
          <li>To answer your questions in the AI coach.</li>
          <li>
            To show testimonials on our homepage, but only ones you submitted and that we approved, using the name you
            gave.
          </li>
        </ul>
      </section>

      <section>
        <h2>Services that process your data for us</h2>
        <ul>
          <li>
            <strong>Supabase</strong> stores your account, profile, logs and photos.
          </li>
          <li>
            <strong>Anthropic (Claude)</strong> generates your plans and coach replies. When you use these features,
            the relevant profile details and messages are sent to Anthropic to produce the response.
          </li>
          <li>
            <strong>Vercel</strong> hosts the website.
          </li>
          <li>
            <strong>Resend</strong> delivers our account emails.
          </li>
          <li>
            <strong>Google</strong> handles sign-in if you choose &quot;Continue with Google&quot;.
          </li>
        </ul>
        <p className="mt-3">These providers process data only to run FitForge, under their own security and privacy terms.</p>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>You can view and edit your profile at any time in Settings.</li>
          <li>You can download a copy of your data from Settings.</li>
          <li>
            You can delete your account from Settings. This permanently removes your account, profile, logs, photos and
            coach conversations.
          </li>
          <li>
            For anything else, email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </li>
        </ul>
      </section>

      <section>
        <h2>Security and retention</h2>
        <p>
          Your data is protected by access rules so that each account can only read its own records, and all traffic is
          encrypted (HTTPS). We keep your data while your account exists and delete it when you delete your account.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>FitForge is only for adults aged 18 and over, and we do not knowingly collect data from anyone younger.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If we change this policy, we will update the date at the top of this page. For significant changes we will
          let you know by email.
        </p>
      </section>
    </LegalPage>
  );
}
