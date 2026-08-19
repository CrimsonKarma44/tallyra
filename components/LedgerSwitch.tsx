import { setOrgLedgerAction, setPersonalLedgerAction } from "@/app/actions/org";

type Props = {
  orgName: string;
  activeContext: "personal" | "org";
};

export function LedgerSwitch({ orgName, activeContext }: Props) {
  return (
    <div className="ledger-switch" role="group" aria-label="Ledger view">
      <form action={setPersonalLedgerAction}>
        <button
          className={activeContext === "personal" ? "ledger-pill ledger-pill-active" : "ledger-pill"}
          type="submit"
        >
          Personal
        </button>
      </form>
      <form action={setOrgLedgerAction}>
        <button
          className={activeContext === "org" ? "ledger-pill ledger-pill-active" : "ledger-pill"}
          type="submit"
        >
          {orgName}
        </button>
      </form>
    </div>
  );
}
