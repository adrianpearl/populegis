import { pgTable, index, varchar, jsonb, timestamp, text, date, unique, integer, foreignKey, serial, check, primaryKey, pgView, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const chamber = pgEnum("chamber", ['SENATE', 'HOUSE'])
export const legistype = pgEnum("legistype", ['s', 'hr', 'hres', 'hconres', 'sres'])
export const voteOption = pgEnum("vote_option", ['up', 'down'])


export const smsSessions = pgTable("sms_sessions", {
	phone: varchar().primaryKey().notNull(),
	sessionType: varchar("session_type").notNull(),
	sessionData: jsonb("session_data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).default(sql`(now() + '01:00:00'::interval)`).notNull(),
}, (table) => [
	index("idx_sms_sessions_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const governanceDocuments = pgTable("governance_documents", {
	documentId: text("document_id").primaryKey().notNull(),
	title: text().notNull(),
	adoptedAt: date("adopted_at"),
	body: text(),
});

export const bills = pgTable("bills", {
	packageid: text().primaryKey().notNull(),
	congress: integer().notNull(),
	session: integer().notNull(),
	billType: text("bill_type").notNull(),
	number: integer().notNull(),
	version: text(),
	officialTitle: text("official_title").notNull(),
	shortTitle: text("short_title"),
	dateIssued: date("date_issued").notNull(),
	lastModified: timestamp("last_modified", { mode: 'string' }).defaultNow().notNull(),
	originChamber: text("origin_chamber"),
	currentChamber: text("current_chamber"),
	form: text(),
	sponsor: jsonb(),
	slug: text(),
	status: jsonb().default({}).notNull(),
	lastUpdate: timestamp("last_update", { mode: 'string' }),
	lastAction: date("last_action"),
	numCosponsors: integer("num_cosponsors").default(0),
	lastVote: date("last_vote"),
}, (table) => [
	unique("bills_slug_key").on(table.slug),
]);

export const tags = pgTable("tags", {
	tagId: serial("tag_id").primaryKey().notNull(),
	userUsername: text("user_username"),
	packageid: text(),
	provisionTag: text("provision_tag"),
	tag: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.packageid],
			foreignColumns: [bills.packageid],
			name: "tags_packageid_fkey"
		}),
	foreignKey({
			columns: [table.userUsername],
			foreignColumns: [users.username],
			name: "tags_user_username_fkey"
		}).onUpdate("restrict").onDelete("restrict"),
]);

export const comments = pgTable("comments", {
	commentId: serial("comment_id").primaryKey().notNull(),
	packageid: text(),
	provisionTag: text("provision_tag"),
	replyToComment: integer("reply_to_comment"),
	comment: varchar({ length: 420 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	createdDate: date("created_date").defaultNow().notNull(),
	userDayComment: integer("user_day_comment").notNull(),
	userId: integer("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.packageid],
			foreignColumns: [bills.packageid],
			name: "comments_packageid_fkey"
		}),
	foreignKey({
			columns: [table.replyToComment],
			foreignColumns: [table.commentId],
			name: "comments_reply_to_comment_fkey"
		}),
	check("user_day_comment_range", sql`(user_day_comment >= 0) AND (user_day_comment <= 4)`),
]);

export const votes = pgTable("votes", {
	id: serial().primaryKey().notNull(),
	commentId: integer("comment_id"),
	voteOption: voteOption("vote_option").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	userId: integer("user_id").notNull(),
	location: integer().notNull(),
	packageid: text().notNull(),
	documentId: text("document_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.location, table.packageid],
			foreignColumns: [provisions.packageid, provisions.location],
			name: "fk_vote_provision"
		}).onUpdate("restrict"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fk_vote_user"
		}).onUpdate("restrict"),
	foreignKey({
			columns: [table.location, table.documentId],
			foreignColumns: [provisions.location, provisions.documentId],
			name: "votes_provision_document_fk"
		}),
	unique("votes_unique_provision_user").on(table.userId, table.location, table.packageid),
]);

export const users = pgTable("users", {
	id: serial().notNull(),
	username: varchar({ length: 20 }).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastSeen: timestamp("last_seen", { withTimezone: true, mode: 'string' }).defaultNow(),
	email: varchar({ length: 100 }),
	lastname: varchar({ length: 50 }),
	zipcode: varchar({ length: 20 }),
	firstname: varchar({ length: 50 }),
	phone: varchar({ length: 100 }),
	lastSms: timestamp("last_sms", { withTimezone: true, mode: 'string' }),
	city: varchar({ length: 50 }).notNull(),
	state: varchar({ length: 2 }).notNull(),
	district: varchar(),
}, (table) => [
	unique("users_id_key").on(table.id),
	unique("users_username_key").on(table.username),
	unique("users_email_key").on(table.email),
	unique("users_phone_key").on(table.phone),
]);

export const provisions = pgTable("provisions", {
	packageid: text().notNull(),
	location: integer().notNull(),
	parentLocation: integer("parent_location"),
	level: integer(),
	provisionType: text("provision_type"),
	enum: text(),
	header: text(),
	text: text(),
	provisionTag: text("provision_tag"),
	displayTag: text("display_tag"),
	documentId: text("document_id").notNull(),
	documentKind: text("document_kind").notNull(),
}, (table) => [
	primaryKey({ columns: [table.packageid, table.location], name: "provisions_pkey"}),
	unique("provisions_packageid_provision_tag_key").on(table.packageid, table.provisionTag),
	unique("provisions_document_loc_key").on(table.location, table.documentId),
	check("provisions_document_kind_chk", sql`document_kind = ANY (ARRAY['bill'::text, 'meta'::text])`),
]);
export const smsSessionsRedacted = pgView("sms_sessions_redacted", {	sessionType: varchar("session_type"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT sms_sessions.session_type, sms_sessions.created_at, sms_sessions.expires_at FROM sms_sessions`);