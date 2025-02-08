CREATE TABLE `email_page_data` (
	`pageId` text(38) PRIMARY KEY NOT NULL,
	`localPart` text(255) NOT NULL,
	FOREIGN KEY (`pageId`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text(38) PRIMARY KEY NOT NULL,
	`ownerId` text(255) NOT NULL,
	`name` text(255) NOT NULL,
	`path` text(32) NOT NULL,
	`type` integer NOT NULL,
	`created` integer NOT NULL,
	`expires` integer,
	`views` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `paste_page_data` (
	`pageId` text(38) PRIMARY KEY NOT NULL,
	`size` integer NOT NULL,
	`mimetype` text(128),
	`fileName` text(255),
	FOREIGN KEY (`pageId`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `redirect_page_data` (
	`pageId` text(38) PRIMARY KEY NOT NULL,
	`url` text(2048) NOT NULL,
	`iframe` integer NOT NULL,
	FOREIGN KEY (`pageId`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
