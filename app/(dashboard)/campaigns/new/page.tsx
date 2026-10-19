"use client";

/**
 * New Campaign Page
 *
 * Form to create a new campaign with goal, account, post picker (or universal
 * targeting), keywords, DM message, and the full set of automation options.
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import KeywordInput from "@/components/keyword-input";
import PostPicker from "@/components/post-picker";
import SequenceStepEditor, {
  type SequenceStepInput,
} from "@/components/sequence-editor";
import { getCampaignTemplate } from "@/lib/templates/campaign-templates";
import { DEFAULT_NUDGE_MESSAGE } from "@/lib/automation-defaults";
import {
  extractFirstUrl,
  replaceUrlWithTrackedPlaceholder,
} from "@/lib/tracking/message";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        onClick={onChange}
        className={`
          relative w-11 h-6 rounded-full transition-colors
          ${checked ? "bg-accent" : "bg-zinc-700"}
        `}
      >
        <span
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm
            ${checked ? "left-6" : "left-1"}
          `}
        />
      </button>
      <div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </label>
  );
}

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTemplate = getCampaignTemplate(searchParams.get("template"));
  const templateDestinationUrl = selectedTemplate
    ? extractFirstUrl(selectedTemplate.dmMessage)
    : null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(selectedTemplate?.title ?? "");
  const [goal, setGoal] = useState(selectedTemplate?.goal ?? "");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [allPosts, setAllPosts] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | undefined>();
  const [keywords, setKeywords] = useState<string[]>(
    selectedTemplate?.keywords ?? []
  );
  const [dmMessage, setDmMessage] = useState(
    selectedTemplate
      ? replaceUrlWithTrackedPlaceholder(
          selectedTemplate.dmMessage,
          templateDestinationUrl
        )
      : ""
  );
  const [trackedDestinationUrl, setTrackedDestinationUrl] = useState(
    templateDestinationUrl ?? ""
  );
  const [wholeWordMatch, setWholeWordMatch] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Feature-phase options — all off / empty by default.
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([]);
  const [publicReplyEnabled, setPublicReplyEnabled] = useState(false);
  const [publicReplyText, setPublicReplyText] = useState("");
  const [minDelaySeconds, setMinDelaySeconds] = useState(0);
  const [maxDelaySeconds, setMaxDelaySeconds] = useState(0);
  const [followNudgeEnabled, setFollowNudgeEnabled] = useState(false);
  const [followNudgeMessage, setFollowNudgeMessage] = useState("");
  const [quickRepliesText, setQuickRepliesText] = useState("");
  const [autoTag, setAutoTag] = useState("");
  const [hideKeywords, setHideKeywords] = useState<string[]>([]);
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [dmMessageVariantB, setDmMessageVariantB] = useState("");
  const [storyTriggerEnabled, setStoryTriggerEnabled] = useState(false);
  const [steps, setSteps] = useState<SequenceStepInput[]>([]);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) {
          const nextAccounts = payload.data.instagramAccounts ?? [];
          setAccounts(nextAccounts);
          setSelectedAccountId(
            payload.data.selectedInstagramAccountId ??
              nextAccounts[0]?.id ??
              ""
          );
        }
      })
      .catch(() => {
        setAccounts([]);
        setSelectedAccountId("");
      });
  }, []);

  function handleAccountChange(accountId: string) {
    setSelectedAccountId(accountId);
    setPostId(null);
    setPostUrl(undefined);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const quickReplies = quickRepliesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!name || !goal || (!allPosts && !postId) || keywords.length === 0 || !dmMessage) {
      setError("Please fill in all required fields");
      return;
    }
    if (minDelaySeconds > maxDelaySeconds) {
      setError("Max delay must be greater than or equal to min delay");
      return;
    }
    if (quickReplies.length > 3) {
      setError("Quick replies: at most 3 lines");
      return;
    }
    if (quickReplies.some((line) => line.length > 20)) {
      setError("Quick replies: each line must be 20 characters or less");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          goal,
          instagramAccountId: selectedAccountId,
          postId: allPosts ? null : postId,
          postUrl: allPosts ? null : (postUrl ?? null),
          keywords,
          dmMessage,
          trackedDestinationUrl: trackedDestinationUrl || null,
          wholeWordMatch,
          isActive,
          excludedKeywords,
          publicReplyEnabled,
          publicReplyText: publicReplyEnabled ? publicReplyText || null : null,
          minDelaySeconds,
          maxDelaySeconds,
          followNudgeEnabled,
          followNudgeMessage: followNudgeEnabled ? followNudgeMessage || null : null,
          quickReplies,
          autoTag: autoTag.trim() || null,
          hideKeywords,
          abTestEnabled,
          dmMessageVariantB: abTestEnabled ? dmMessageVariantB || null : null,
          storyTriggerEnabled,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Phase 2 endpoint contract: { automationId, steps }.
        if (steps.length > 0) {
          try {
            await fetch("/api/sequences", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                automationId: data.data.id,
                steps,
              }),
            });
          } catch (sequenceError) {
            console.error("Failed to save follow-up sequence:", sequenceError);
          }
        }
        router.push("/campaigns");
      } else {
        setError(data.error ?? "Failed to create campaign");
      }
    } catch {
      setError("Failed to create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        {selectedTemplate && (
          <div className="border border-cyan-200/20 bg-cyan-300/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">
              Template loaded
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {selectedTemplate.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-300">
              Pick the Instagram post or reel, adjust the copy, and launch when
              the connection is ready.
            </p>
          </div>
        )}

        {/* Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Campaign Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product launch link drop"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors"
            maxLength={100}
          />
        </div>

        {/* Goal */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Campaign Goal <span className="text-error">*</span>
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground focus:border-accent/40 focus:outline-none transition-colors"
          >
            <option value="">Select a goal</option>
            <option value="Lead magnet delivery">Lead magnet delivery</option>
            <option value="Product link request">Product link request</option>
            <option value="Price or availability reply">Price or availability reply</option>
            <option value="Launch waitlist">Launch waitlist</option>
            <option value="Agency client campaign">Agency client campaign</option>
          </select>
        </div>

        {/* Instagram Account */}
        <div className="space-y-2">
          <p className="block text-sm font-medium text-foreground">
            Instagram Account <span className="text-error">*</span>
          </p>
          {accounts.length > 0 ? (
            <AccountSelect
              accounts={accounts}
              value={selectedAccountId}
              onChange={handleAccountChange}
              includeAll={false}
              label="Connected profile"
            />
          ) : (
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
              Connect Instagram before launching a campaign
            </div>
          )}
        </div>

        {/* All posts (universal) */}
        <div className="space-y-2">
          <Toggle
            checked={allPosts}
            onChange={() => {
              setAllPosts(!allPosts);
              if (!allPosts) {
                setPostId(null);
                setPostUrl(undefined);
              }
            }}
            label="All posts (universal)"
            description={
              allPosts
                ? "Listens to comments on every post of this account"
                : "Listens to one specific post or reel only"
            }
          />
        </div>

        {/* Post Picker */}
        {!allPosts && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Campaign Post Or Reel <span className="text-error">*</span>
            </label>
            <p className="text-xs text-muted mb-3">
              Choose which Instagram post or reel should trigger the campaign.
            </p>
            <div className="glass rounded-xl p-4">
              <PostPicker
                selectedPostId={postId}
                instagramAccountId={selectedAccountId}
                onSelect={(id, url) => {
                  setPostId(id);
                  setPostUrl(url);
                }}
              />
            </div>
          </div>
        )}

        {/* Keywords */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Comment Keywords <span className="text-error">*</span>
          </label>
          <p className="text-xs text-muted mb-1">
            When someone comments any of these keywords, the campaign sends the private reply.
          </p>
          <KeywordInput keywords={keywords} onChange={setKeywords} />
        </div>

        {/* Excluded keywords */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Excluded Keywords
          </label>
          <p className="text-xs text-muted mb-1">
            Comments containing any of these are silently skipped — even if they match above.
          </p>
          <KeywordInput keywords={excludedKeywords} onChange={setExcludedKeywords} />
        </div>

        {/* DM Message */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Private Reply Message <span className="text-error">*</span>
          </label>
          <textarea
            value={dmMessage}
            onChange={(e) => setDmMessage(e.target.value)}
            placeholder="Hey {username}! Here's the link you asked for: https://..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-muted">
            Use <code className="px-1 py-0.5 rounded bg-surface-hover text-accent font-mono text-[11px]">{"{username}"}</code> to
            personalize with the commenter&apos;s name
          </p>
        </div>

        {/* A/B test */}
        <div className="space-y-3">
          <Toggle
            checked={abTestEnabled}
            onChange={() => setAbTestEnabled(!abTestEnabled)}
            label="A/B test message"
            description="Split private replies 50/50 between variant A (above) and variant B"
          />
          {abTestEnabled && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Variant B Message
              </label>
              <textarea
                value={dmMessageVariantB}
                onChange={(e) => setDmMessageVariantB(e.target.value)}
                placeholder="Alternative version of the private reply…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors resize-none"
                maxLength={1000}
              />
            </div>
          )}
        </div>

        {/* Tracked Link */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Tracked Destination URL
          </label>
          <input
            type="url"
            value={trackedDestinationUrl}
            onChange={(e) => setTrackedDestinationUrl(e.target.value)}
            placeholder="https://yourlink.com/offer"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              Add <code className="px-1 py-0.5 rounded bg-surface-hover text-accent font-mono text-[11px]">{"{link}"}</code> to send the tracked redirect.
            </p>
            <button
              type="button"
              onClick={() =>
                setDmMessage((current) =>
                  current.includes("{link}") ? current : `${current.trim()} {link}`.trim()
                )
              }
              className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-hover hover:text-foreground"
            >
              Insert link token
            </button>
          </div>
        </div>

        {/* Quick replies */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Quick Replies
          </label>
          <p className="text-xs text-muted mb-1">
            Sent with the follow-up DM after a nudge reply. One per line, up to 3, 20 characters each.
          </p>
          <textarea
            value={quickRepliesText}
            onChange={(e) => setQuickRepliesText(e.target.value)}
            placeholder={"Yes, send it\nRemind me later"}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Public reply */}
        <div className="space-y-3">
          <Toggle
            checked={publicReplyEnabled}
            onChange={() => setPublicReplyEnabled(!publicReplyEnabled)}
            label="Public comment reply"
            description="Also reply publicly under the comment before sending the private reply"
          />
          {publicReplyEnabled && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Public Reply Text
              </label>
              <textarea
                value={publicReplyText}
                onChange={(e) => setPublicReplyText(e.target.value)}
                placeholder="Sent you a DM, {username}! Check your inbox 📩"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors resize-none"
                maxLength={1000}
              />
            </div>
          )}
        </div>

        {/* Smart delay */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Smart Delay (seconds)
          </label>
          <p className="text-xs text-muted">
            Wait a random time between min and max before sending the private reply. Both 0 = send immediately.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs text-muted">Min</label>
              <input
                type="number"
                min={0}
                max={3600}
                value={minDelaySeconds}
                onChange={(e) =>
                  setMinDelaySeconds(Math.max(0, Math.min(3600, Number(e.target.value) || 0)))
                }
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground focus:border-accent/40 focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-muted">Max</label>
              <input
                type="number"
                min={0}
                max={3600}
                value={maxDelaySeconds}
                onChange={(e) =>
                  setMaxDelaySeconds(Math.max(0, Math.min(3600, Number(e.target.value) || 0)))
                }
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground focus:border-accent/40 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Follow nudge */}
        <div className="space-y-3">
          <Toggle
            checked={followNudgeEnabled}
            onChange={() => setFollowNudgeEnabled(!followNudgeEnabled)}
            label="Follow nudge"
            description="First send a follow-ask nudge; the real link goes out when they reply"
          />
          {followNudgeEnabled && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Nudge Message
              </label>
              <textarea
                value={followNudgeMessage}
                onChange={(e) => setFollowNudgeMessage(e.target.value)}
                placeholder={DEFAULT_NUDGE_MESSAGE}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted">
                Leave empty to use the default. Plain text only — <code className="px-1 py-0.5 rounded bg-surface-hover text-accent font-mono text-[11px]">{"{username}"}</code> is replaced, no tracked link.
              </p>
            </div>
          )}
        </div>

        {/* Spam hide keywords */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Spam Hide Keywords
          </label>
          <p className="text-xs text-muted mb-1">
            Comments matching these are hidden automatically and get no DM.
          </p>
          <KeywordInput keywords={hideKeywords} onChange={setHideKeywords} />
        </div>

        {/* Auto-tag */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Auto-tag
          </label>
          <p className="text-xs text-muted mb-1">
            Tag every DM log from this campaign for reporting.
          </p>
          <input
            type="text"
            value={autoTag}
            onChange={(e) => setAutoTag(e.target.value)}
            placeholder="e.g. diwali-offer"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors"
            maxLength={50}
          />
        </div>

        {/* Story trigger */}
        <div className="space-y-2">
          <Toggle
            checked={storyTriggerEnabled}
            onChange={() => setStoryTriggerEnabled(!storyTriggerEnabled)}
            label="Story reply trigger"
            description="Also respond to story replies with matching keywords via DM"
          />
        </div>

        {/* Follow-up sequence */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Follow-up Sequence
          </label>
          <p className="text-xs text-muted mb-1">
            Scheduled follow-up messages sent after the private reply.
          </p>
          <div className="glass rounded-xl p-4">
            <SequenceStepEditor steps={steps} onChange={setSteps} />
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <Toggle
            checked={wholeWordMatch}
            onChange={() => setWholeWordMatch(!wholeWordMatch)}
            label="Whole word match"
            description={
              wholeWordMatch
                ? '"linking" won\'t trigger "LINK"'
                : '"linking" WILL trigger "LINK"'
            }
          />
          <Toggle
            checked={isActive}
            onChange={() => setIsActive(!isActive)}
            label="Launch active"
            description={
              isActive ? "Campaign starts listening after creation" : "Campaign is saved paused"
            }
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </>
            ) : (
              "Create Campaign"
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover border border-border transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
