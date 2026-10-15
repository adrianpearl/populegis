-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."chamber" AS ENUM('SENATE', 'HOUSE');--> statement-breakpoint
CREATE TYPE "public"."legistype" AS ENUM('s', 'hr', 'hres', 'hconres', 'sres');--> statement-breakpoint
CREATE TYPE "public"."vote_option" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TABLE "sms_sessions" (
	"phone" varchar PRIMARY KEY NOT NULL,
	"session_type" varchar NOT NULL,
	"session_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT (now() + '01:00:00'::interval) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"packageid" text PRIMARY KEY NOT NULL,
	"congress" integer NOT NULL,
	"session" integer NOT NULL,
	"bill_type" text NOT NULL,
	"number" integer NOT NULL,
	"version" text,
	"official_title" text NOT NULL,
	"short_title" text,
	"date_issued" date NOT NULL,
	"last_modified" timestamp DEFAULT now() NOT NULL,
	"origin_chamber" text,
	"current_chamber" text,
	"form" text,
	"sponsor" jsonb,
	"slug" text,
	"status" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_update" timestamp,
	"last_action" date,
	"num_cosponsors" integer DEFAULT 0,
	"last_vote" date,
	CONSTRAINT "bills_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"tag_id" serial PRIMARY KEY NOT NULL,
	"user_username" text,
	"packageid" text,
	"provision_tag" text,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"comment_id" serial PRIMARY KEY NOT NULL,
	"packageid" text,
	"provision_tag" text,
	"reply_to_comment" integer,
	"comment" varchar(420) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_date" date DEFAULT now() NOT NULL,
	"user_day_comment" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "user_day_comment_range" CHECK ((user_day_comment >= 0) AND (user_day_comment <= 4))
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer,
	"vote_option" "vote_option" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"user_id" integer NOT NULL,
	"location" integer NOT NULL,
	"packageid" text NOT NULL,
	CONSTRAINT "votes_unique_provision_user" UNIQUE("user_id","location","packageid")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial NOT NULL,
	"username" varchar(20) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_seen" timestamp with time zone DEFAULT now(),
	"email" varchar(100),
	"lastname" varchar(50),
	"zipcode" varchar(20),
	"firstname" varchar(50),
	"phone" varchar(100),
	"last_sms" timestamp with time zone,
	"city" varchar(50) NOT NULL,
	"state" varchar(2) NOT NULL,
	"district" varchar,
	CONSTRAINT "users_id_key" UNIQUE("id"),
	CONSTRAINT "users_username_key" UNIQUE("username"),
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_phone_key" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "provisions" (
	"packageid" text NOT NULL,
	"location" integer NOT NULL,
	"parent_location" integer,
	"level" integer,
	"provision_type" text,
	"enum" text,
	"header" text,
	"text" text,
	"provision_tag" text,
	"display_tag" text,
	CONSTRAINT "provisions_pkey" PRIMARY KEY("packageid","location"),
	CONSTRAINT "provisions_packageid_provision_tag_key" UNIQUE("packageid","provision_tag")
);
--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_packageid_fkey" FOREIGN KEY ("packageid") REFERENCES "public"."bills"("packageid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_username_fkey" FOREIGN KEY ("user_username") REFERENCES "public"."users"("username") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_packageid_fkey" FOREIGN KEY ("packageid") REFERENCES "public"."bills"("packageid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_reply_to_comment_fkey" FOREIGN KEY ("reply_to_comment") REFERENCES "public"."comments"("comment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "fk_vote_provision" FOREIGN KEY ("location","packageid") REFERENCES "public"."provisions"("packageid","location") ON DELETE no action ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "fk_vote_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "provisions" ADD CONSTRAINT "provisions_packageid_fkey" FOREIGN KEY ("packageid") REFERENCES "public"."bills"("packageid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sms_sessions_expires_at" ON "sms_sessions" USING btree ("expires_at" timestamptz_ops);
*/