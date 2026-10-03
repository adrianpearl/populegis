import { relations } from "drizzle-orm/relations";
import { bills, tags, users, comments, provisions, votes } from "./schema";

export const tagsRelations = relations(tags, ({one}) => ({
	bill: one(bills, {
		fields: [tags.packageid],
		references: [bills.packageid]
	}),
	user: one(users, {
		fields: [tags.userUsername],
		references: [users.username]
	}),
}));

export const billsRelations = relations(bills, ({many}) => ({
	tags: many(tags),
	comments: many(comments),
	provisions: many(provisions),
}));

export const usersRelations = relations(users, ({many}) => ({
	tags: many(tags),
	votes: many(votes),
}));

export const commentsRelations = relations(comments, ({one, many}) => ({
	bill: one(bills, {
		fields: [comments.packageid],
		references: [bills.packageid]
	}),
	comment: one(comments, {
		fields: [comments.replyToComment],
		references: [comments.commentId],
		relationName: "comments_replyToComment_comments_commentId"
	}),
	comments: many(comments, {
		relationName: "comments_replyToComment_comments_commentId"
	}),
}));

export const votesRelations = relations(votes, ({one}) => ({
	provision: one(provisions, {
		fields: [votes.location],
		references: [provisions.packageid]
	}),
	user: one(users, {
		fields: [votes.userId],
		references: [users.id]
	}),
}));

export const provisionsRelations = relations(provisions, ({one, many}) => ({
	votes: many(votes),
	bill: one(bills, {
		fields: [provisions.packageid],
		references: [bills.packageid]
	}),
}));