import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { LookupControl } from "./components/LookupControl";
import { SelectedRecord } from "./components/SelectedItems";
import { EntityConfig } from "./services/dataverseSearch";

/**
 * MultiEntityLookup — Generic PCF Control
 *
 * Drop this onto any model-driven app form.
 * Configure targetEntities and it searches those Dataverse tables in parallel.
 *
 * Bound field   : boundValue  (SingleLine.Text, max 4000)
 * Input props   : targetEntities, entityConfig, maxResultsPerEntity,
 *                 allowMultiple, placeholder
 *
 * Example targetEntities: "account,contact,lead"
 *
 * Example entityConfig JSON:
 * [
 *   { "entity": "account", "primaryField": "name", "icon": "🏢", "displayLabel": "Accounts" },
 *   { "entity": "contact", "primaryField": "fullname", "secondaryField": "emailaddress1",
 *     "icon": "👤", "displayLabel": "Contacts" }
 * ]
 */
export class MultiEntityLookup
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private container!: HTMLDivElement;
  private notifyOutputChanged!: () => void;
  private currentValue: SelectedRecord[] = [];

  // ── Lifecycle ─────────────────────────────────────────────

  public init(
    _context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container          = container;
    this.notifyOutputChanged = notifyOutputChanged;
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    const entityConfigs = this.resolveEntityConfigs(
      context.parameters.entityConfig?.raw   ?? "",
      context.parameters.targetEntities?.raw ?? ""
    );

    // Parse existing bound value
    try {
      const raw = context.parameters.boundValue?.raw ?? "[]";
      this.currentValue = JSON.parse(raw) as SelectedRecord[];
    } catch {
      this.currentValue = [];
    }

    const placeholder =
      context.parameters.placeholder?.raw ||
      "Search…";

    const props = {
      webApi:               context.webAPI,
      entityConfigs,
      maxResultsPerEntity:  context.parameters.maxResultsPerEntity?.raw  ?? 5,
      allowMultiple:        context.parameters.allowMultiple?.raw         ?? false,
      placeholder,
      initialValue:         this.currentValue,
      disabled:             context.mode.isControlDisabled,
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

  // ── Helpers ───────────────────────────────────────────────

  /**
   * Resolves entity configuration from either:
   * 1. A rich JSON array string (entityConfig property), or
   * 2. A comma-separated list of entity logical names (targetEntities property)
   *    matched against built-in defaults for common Dataverse tables.
   */
  private resolveEntityConfigs(
    configJson: string,
    targetEntities: string
  ): EntityConfig[] {
    // Try rich JSON first
    if (configJson && configJson.trim().startsWith("[")) {
      try {
        return JSON.parse(configJson) as EntityConfig[];
      } catch (e) {
        console.warn("[MultiEntityLookup] Invalid entityConfig JSON, using defaults.", e);
      }
    }

    // Built-in defaults for common Dataverse tables
    const defaults: Record<string, Partial<EntityConfig>> = {
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
      incident: {
        primaryField: "title",
        icon: "🎫",
        displayLabel: "Cases",
      },
      campaign: {
        primaryField: "name",
        icon: "📣",
        displayLabel: "Campaigns",
      },
      product: {
        primaryField: "name",
        icon: "📦",
        displayLabel: "Products",
      },
      // Add your custom tables here:
      // my_customtable: {
      //   primaryField: "my_name",
      //   icon: "⭐",
      //   displayLabel: "My Custom Table",
      // },
    };

    return targetEntities
      .split(",")
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
      .map(name => ({
        entity:       name,
        primaryField: "name",                                              // safe default
        icon:         "🔍",
        displayLabel: name.charAt(0).toUpperCase() + name.slice(1) + "s", // e.g. "Accounts"
        ...(defaults[name] ?? {}),                                         // override with known defaults
      }));
  }
}
