import { AlertCircle, Construction, Inbox, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

function Block({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 text-muted">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function EmptyState(props: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Block icon={<Inbox className="h-8 w-8" />} title={props.title} action={props.action}>
      {props.description}
    </Block>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Block
      icon={<AlertCircle className="h-8 w-8 text-danger" />}
      title="Couldn't load this"
      action={onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}
    >
      {message}
    </Block>
  );
}

export function ForbiddenState() {
  return (
    <Block icon={<ShieldAlert className="h-8 w-8" />} title="You don't have access to this page">
      Your role isn&apos;t allowed to view it. Ask a company admin if you need access.
    </Block>
  );
}

export function AwaitingBackend({ title, endpoints }: { title: string; endpoints: string[] }) {
  return (
    <Block icon={<Construction className="h-8 w-8 text-accent" />} title={`${title} isn't available yet`}>
      <p>The backend has no API for this module, so there is nothing to show or save. It will be connected when these endpoints exist:</p>
      <ul className="mt-3 space-y-1 font-mono text-xs text-ink">
        {endpoints.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </Block>
  );
}
