// Barrel for all Drizzle tables and relations. Imported as `* as schema`
// by db/index.ts so that db.query.<table>(...) and `with` traversal work.
export * from './accounts';
export * from './programmes';
export * from './projects';
export * from './phases';
export * from './stakeholders';
export * from './snapshots';
export * from './stakeholder-positions';
export * from './engagement-events';
export * from './actions';
export * from './permissions';
export * from './relations';
