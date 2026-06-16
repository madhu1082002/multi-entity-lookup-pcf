import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { LookupControl } from "./components/LookupControl";
import { SelectedRecord } from "./components/SelectedItems";
import { EntityConfig } from "./services/dataverseSearch";

/**
 * MultiEntityLookup PCF Control
 *
 * A lookup field that searches across multiple Dataverse entities simultaneously.
 * The selected records are stored as a JSON string in the bound text field.
 *
 * Bound property : boundValue  (SingleLine.Text)
 * Input properties:
 *   targetEntities       – comma-separated entity names, e.g. "account,contact,lead"
 *   entityConfig         – optional JSON array of EntityConfig objects
 *   maxResultsPerEntity  – integer, default 5
 *   allowMultiple        – boolean, default false
 */
export class MultiEntityLookup
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private container: HTMLDivElement;
  private notifyOutputChanged: () => void;
  private currentValue: SelectedRecord[] = [];

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  public init(
    _context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container = container;
    this.notifyOutputChanged = notifyOutputChanged;
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    const entityConfigs = this.parseEntityConfig(
      context.parameters.entityConfig?.raw ?? "",
      context.parameters.targetEntities?.raw ?? ""
    );

    // Parse existing bound value
    const rawValue = context.parameters.boundValue?.raw ?? "[]";
    try {
      this.currentValue = JSON.parse(rawValue) as SelectedRecord[];
    } catch {
      this.currentValue = [];
    }

    const props = {
      webApi: context.webAPI,
      entityConfigs,
      maxResultsPerEntity: context.parameters.maxResultsPerEntity?.raw ?? 5,
      allowMultiple: context.parameters.allowMultiple?.raw ?? false,
      initialValue: this.currentValue,
      disabled: context.mode.isControlDisabled,
      onChange: (selected: SelectedRecord[]) => {
        this.currentValue = selected;
        this.notifyOutputChanged();
      },
    };

    ReactDOM.render(
      React.createElement(LookupControl, props),
      this.container
    );
  }

  public getOutputs(): IOutputs {
    return {
      boundValue: JSON.stringify(this.currentValue),
    };
  }

  public destroy(): void {
    ReactDOM.unmountComponentAtNode(this.container);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Builds EntityConfig array from either a rich JSON string or a plain
   * comma-separated list of entity logical names.
   *
   * Example rich JSON:
   * [
   *   { "entity": "account",  "primaryField": "name",     "icon": "🏢", "displayLabel": "Accounts" },
   *   { "entity": "contact",  "primaryField": "fullname",  "icon": "👤", "displayLabel": "Contacts",
   *     "secondaryField": "emailaddress1" },
   *   { "entity": "lead",     "primaryField": "fullname",  "icon": "📋", "displayLabel": "Leads" }
   * ]
   */
  private parseEntityConfig(
    configJson: string,
    targetEntities: string
  ): EntityConfig[] {
    // Try rich JSON config first
    if (configJson && configJson.trim().startsWith("[")) {
      try {
        return JSON.parse(configJson) as EntityConfig[];
      } catch (e) {
        console.warn("MultiEntityLookup: invalid entityConfig JSON, falling back to defaults.", e);
      }
    }

    // Built-in defaults — includes the Engagement-specific custom tables
    const defaults: Record<string, Partial<EntityConfig>> = {
      // ── Custom Engagement tables ──────────────────────
      wwf_cd_company: {
        primaryField: "wwf_companyname",
        icon: "🏢",
        displayLabel: "Companies",
      },
      wwf_cd_parentcompany: {
        primaryField: "wwf_parentcompanyname",
        icon: "🏛",
        displayLabel: "Parent Companies",
      },
      // ── Standard Dataverse tables (fallback) ──────────
      account: {
        primaryField: "name",
        icon: "🏢",
        displayLabel: "Accounts",
      },
      contact: {
        primaryField: "fullname",
        secondaryField: "emailaddress1",
        icon: "👤",
        displayLabel: "Contacts",
      },
      lead: {
        primaryField: "fullname",
        secondaryField: "emailaddress1",
        icon: "📋",
        displayLabel: "Leads",
      },
      opportunity: {
        primaryField: "name",
        icon: "💼",
        displayLabel: "Opportunities",
      },
      systemuser: {
        primaryField: "fullname",
        secondaryField: "internalemailaddress",
        icon: "🔑",
        displayLabel: "Users",
      },
    };

    return targetEntities
      .split(",")
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
      .map(name => ({
        entity: name,
        primaryField: "name",
        icon: "🔍",
        displayLabel: name.charAt(0).toUpperCase() + name.slice(1) + "s",
        ...(defaults[name] ?? {}),
      }));
  }
}
