/**
 * dataverseSearch.ts
 * Generic Dataverse multi-entity search service.
 * Fires parallel OData queries and merges results.
 */

export interface EntityConfig {
  /** Dataverse entity logical name e.g. "account" */
  entity: string;
  /** Primary field to search and display e.g. "name" */
  primaryField: string;
  /** Optional secondary field shown under result e.g. "emailaddress1" */
  secondaryField?: string;
  /** Emoji or text icon shown in group header and tag chip */
  icon?: string;
  /** Human-readable group label shown in dropdown e.g. "Accounts" */
  displayLabel?: string;
}

export interface SearchResult {
  id: string;
  entityType: string;
  displayName: string;
  secondaryText?: string;
  icon: string;
  entityLabel: string;
}

export class DataverseSearchService {
  private webApi: ComponentFramework.WebApi;

  constructor(webApi: ComponentFramework.WebApi) {
    this.webApi = webApi;
  }

  /**
   * Searches all configured entities in parallel.
   * A failure in one entity does not block results from others.
   */
  async searchAllEntities(
    searchTerm: string,
    configs: EntityConfig[],
    maxPerEntity = 5
  ): Promise<SearchResult[]> {
    if (!searchTerm || searchTerm.trim().length === 0) return [];

    const queries = configs.map(cfg =>
      this.searchSingleEntity(searchTerm, cfg, maxPerEntity)
    );

    // Polyfill-safe parallel execution (works on ES2015 target)
    const settled = await Promise.all(
      queries.map(p =>
        p.then(
          (value): { status: "fulfilled"; value: SearchResult[] } =>
            ({ status: "fulfilled", value }),
          (): { status: "rejected" } =>
            ({ status: "rejected" })
        )
      )
    );

    const results: SearchResult[] = [];
    for (const r of settled) {
      if (r.status === "fulfilled") {
        results.push(...r.value);
      }
    }
    return results;
  }

  private async searchSingleEntity(
    searchTerm: string,
    config: EntityConfig,
    maxResults: number
  ): Promise<SearchResult[]> {
    // Escape single quotes to prevent OData injection
    const safe = searchTerm.replace(/'/g, "''");

    let filter = `contains(${config.primaryField},'${safe}')`;
    if (config.secondaryField) {
      filter += ` or contains(${config.secondaryField},'${safe}')`;
    }

    let select = `${config.entity}id,${config.primaryField}`;
    if (config.secondaryField) {
      select += `,${config.secondaryField}`;
    }

    const query = `?$select=${select}&$filter=${filter}&$top=${maxResults}`;

    try {
      const response = await this.webApi.retrieveMultipleRecords(
        config.entity,
        query
      );

      return response.entities.map(record => ({
        id:            record[`${config.entity}id`] as string,
        entityType:    config.entity,
        displayName:   (record[config.primaryField] as string) ?? "(No Name)",
        secondaryText: config.secondaryField
          ? (record[config.secondaryField] as string | undefined)
          : undefined,
        icon:        config.icon        ?? "🔍",
        entityLabel: config.displayLabel ?? config.entity,
      }));
    } catch (err) {
      console.error(`[MultiEntityLookup] Search failed for "${config.entity}":`, err);
      return [];
    }
  }
}
